"""
provider_compliance_documents_routes.py
────────────────────────────────────────
Full backend for ComplianceDocuments.jsx (Provider side)

Endpoints
─────────
GET    /api/provider/compliance/stats
GET    /api/provider/compliance/documents
GET    /api/provider/compliance/documents/<id>
POST   /api/provider/compliance/documents
PATCH  /api/provider/compliance/documents/<id>
DELETE /api/provider/compliance/documents/<id>
GET    /api/provider/compliance/documents/<id>/download

Schema  (compliance_documents collection)
─────────────────────────────────────────
  orgId        ObjectId  → organizations (provider)
  type         str       enum: insurance | license | certificate |
                               tax_clearance | health_safety | other
  label        str       custom display name
  fileName     str       original filename
  fileUrl      str       storage path / S3 URL
  status       str       enum: pending_review | verified | rejected | expired
  expiryDate   date
  uploadedAt   date
  uploadedBy   ObjectId  → users
  reviewNotes  str
  reviewedBy   ObjectId  → users (admin/compliance)
  reviewedAt   date

Status mapping  (DB → UI)
  pending_review  → "pending"
  verified        → "approved"
  rejected        → "rejected"
  expired         → "expired"   (also derived from expiryDate)

Category / type mapping  (DB type → UI category label)
  insurance      → Insurance
  license        → Legal
  certificate    → Quality
  tax_clearance  → Financial
  health_safety  → Safety
  other          → HR

Register in app.py:
    from routes.provider_compliance_documents_routes import bp as provider_comp_docs_bp
    app.register_blueprint(provider_comp_docs_bp)
"""

from datetime import datetime, timezone, timedelta
from bson import ObjectId
from bson.errors import InvalidId
from flask import Blueprint, g, jsonify, request

from auth import require_role
from db import get_db

bp = Blueprint(
    "provider_compliance_documents",
    __name__,
    url_prefix="/api/provider/compliance",
)

# ── Constants ────────────────────────────────────────────────────────────────

EXPIRING_SOON_DAYS = 30

# DB type → UI category label
TYPE_TO_CATEGORY = {
    "insurance":    "Insurance",
    "license":      "Legal",
    "certificate":  "Quality",
    "tax_clearance": "Financial",
    "health_safety": "Safety",
    "other":        "HR",
}

# UI category label → DB type  (reverse map for create/update)
CATEGORY_TO_TYPE = {v: k for k, v in TYPE_TO_CATEGORY.items()}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _err(code, msg, status):
    return jsonify({"error": {"code": code, "message": msg}}), status


def _days_left(expiry_date):
    """Return integer days until expiry (negative = already expired)."""
    if not expiry_date:
        return None
    today = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    expiry = (
        expiry_date.replace(tzinfo=timezone.utc)
        if expiry_date.tzinfo is None
        else expiry_date
    )
    return (expiry - today).days


def _ui_status(db_status, days_left):
    """
    Derive the UI status from DB status + date-based expiry check.
    Priority: date-expired > date-expiring-soon > DB status.
    """
    if days_left is not None and days_left < 0:
        return "expired"
    if db_status == "expired":
        return "expired"
    if db_status == "verified":
        # even a verified doc can be 'expiring' if close to expiry date
        if days_left is not None and 0 <= days_left <= EXPIRING_SOON_DAYS:
            return "expiring"
        return "approved"
    if db_status == "rejected":
        return "rejected"
    # pending_review
    return "pending"


def _format_date(dt):
    """Format a datetime as 'DD Mon YYYY', e.g. '01 Jan 2026'."""
    if not dt:
        return "N/A"
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.strftime("%d %b %Y")


def _file_ext(filename):
    """Return lowercase file extension without the dot, e.g. 'pdf'."""
    if not filename:
        return "pdf"
    parts = filename.rsplit(".", 1)
    return parts[-1].lower() if len(parts) > 1 else "pdf"


def _format_size(size_bytes):
    """Format bytes as human-readable size, e.g. '2.4 MB'."""
    if not size_bytes:
        return "—"
    if size_bytes < 1024:
        return f"{size_bytes} B"
    if size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    return f"{size_bytes / (1024 * 1024):.1f} MB"


def _doc_to_dict(doc):
    """Serialise a compliance_documents MongoDB document to a plain dict."""
    dl = _days_left(doc.get("expiryDate"))
    ui_status = _ui_status(doc.get("status", "pending_review"), dl)
    category = TYPE_TO_CATEGORY.get(doc.get("type", "other"), "HR")

    return {
        "id":         str(doc["_id"]),
        "docId":      f"DOC-{str(doc['_id'])[-6:].upper()}",
        "name":       doc.get("label") or doc.get("fileName") or "Untitled Document",
        "category":   category,
        "type":       doc.get("type", "other"),
        "fileExt":    _file_ext(doc.get("fileName", "")),
        "fileName":   doc.get("fileName", ""),
        "fileUrl":    doc.get("fileUrl", ""),
        "fileSize":   _format_size(doc.get("fileSize")),
        "status":     ui_status,
        "dbStatus":   doc.get("status", "pending_review"),
        "uploaded":   _format_date(doc.get("uploadedAt")),
        "expiry":     _format_date(doc.get("expiryDate")),
        "daysLeft":   dl,
        "reviewNotes": doc.get("reviewNotes", ""),
    }


# ── Routes ────────────────────────────────────────────────────────────────────

@bp.get("/stats")
@require_role("org_admin", "provider_staff")
def get_stats():
    """
    Return document counts per UI status for the logged-in provider org.
    Response: { total, approved, pending, reviewing, rejected, expiring }
    """
    db = get_db()
    org_id = ObjectId(g.claims["orgId"])

    docs = list(
        db.compliance_documents.find(
            {"orgId": org_id},
            {"status": 1, "expiryDate": 1},
        )
    )

    counts = {
        "total":     len(docs),
        "approved":  0,
        "pending":   0,
        "reviewing": 0,
        "rejected":  0,
        "expiring":  0,
    }

    for doc in docs:
        dl = _days_left(doc.get("expiryDate"))
        s = _ui_status(doc.get("status", "pending_review"), dl)
        if s == "approved":
            counts["approved"] += 1
        elif s == "expiring":
            counts["expiring"] += 1
            counts["approved"] += 1   # expiring docs are still "approved"
        elif s == "pending":
            counts["pending"] += 1
        elif s == "reviewing":
            counts["reviewing"] += 1
        elif s == "rejected":
            counts["rejected"] += 1
        elif s == "expired":
            counts["rejected"] += 1   # count expired in rejected bucket for UI warning

    # pending_review maps to "reviewing" in the UI tabs
    # Re-map: pending_review DB status → "reviewing" tab
    reviewing_count = db.compliance_documents.count_documents(
        {"orgId": org_id, "status": "pending_review"}
    )
    pending_count = 0   # We have no pure "pending" DB status; uploading = pending_review
    counts["reviewing"] = reviewing_count
    counts["pending"]   = pending_count

    return jsonify(counts)


@bp.get("/documents")
@require_role("org_admin", "provider_staff")
def list_documents():
    """
    List compliance documents for the logged-in provider org.
    Query params:
      status  – filter by UI status: approved | pending | reviewing | rejected | all
      search  – partial-match against label / fileName
      page    – 1-based page number (default 1)
      limit   – docs per page (default 20, max 100)
    """
    db = get_db()
    org_id = ObjectId(g.claims["orgId"])

    ui_status_filter = request.args.get("status", "all").lower()
    search           = request.args.get("search", "").strip()
    page             = max(1, int(request.args.get("page", 1)))
    limit            = min(100, max(1, int(request.args.get("limit", 20))))

    # Build MongoDB query
    query = {"orgId": org_id}

    # Map UI status filter → DB status
    if ui_status_filter == "approved":
        query["status"] = "verified"
    elif ui_status_filter == "reviewing":
        query["status"] = "pending_review"
    elif ui_status_filter == "rejected":
        query["status"] = {"$in": ["rejected", "expired"]}
    elif ui_status_filter == "pending":
        # no DB-native "pending" state; return empty or treat same as reviewing
        query["status"] = "pending_review"
    # "all" → no status filter

    if search:
        import re
        pat = re.compile(re.escape(search), re.IGNORECASE)
        query["$or"] = [
            {"label":    pat},
            {"fileName": pat},
        ]

    total = db.compliance_documents.count_documents(query)
    skip  = (page - 1) * limit

    cursor = (
        db.compliance_documents
        .find(query)
        .sort("uploadedAt", -1)
        .skip(skip)
        .limit(limit)
    )

    docs = [_doc_to_dict(d) for d in cursor]

    return jsonify({
        "documents": docs,
        "total":     total,
        "page":      page,
        "limit":     limit,
        "pages":     (total + limit - 1) // limit if limit else 1,
    })


@bp.get("/documents/<doc_id>")
@require_role("org_admin", "provider_staff")
def get_document(doc_id):
    """Return a single compliance document by ID (must belong to caller's org)."""
    db     = get_db()
    org_id = ObjectId(g.claims["orgId"])

    try:
        oid = ObjectId(doc_id)
    except InvalidId:
        return _err("BAD_REQUEST", "Invalid document ID", 400)

    doc = db.compliance_documents.find_one({"_id": oid, "orgId": org_id})
    if not doc:
        return _err("NOT_FOUND", "Document not found", 404)

    return jsonify(_doc_to_dict(doc))


@bp.post("/documents")
@require_role("org_admin", "provider_staff")
def create_document():
    """
    Upload / register a new compliance document.

    Expected JSON body:
      label       str  required  – display name
      type        str  required  – DB type (insurance | license | certificate |
                                            tax_clearance | health_safety | other)
                  OR
      category    str  optional  – UI category label (will be mapped to type)
      fileName    str  required  – original filename (with extension)
      fileUrl     str  required  – uploaded file URL / path
      fileSize    int  optional  – bytes
      expiryDate  str  optional  – ISO 8601 date, e.g. "2027-01-01"
    """
    db     = get_db()
    org_id = ObjectId(g.claims["orgId"])
    user_id = ObjectId(g.user["_id"])

    body = request.get_json(silent=True) or {}

    label     = (body.get("label") or "").strip()
    file_name = (body.get("fileName") or "").strip()
    file_url  = (body.get("fileUrl") or "").strip()

    if not label:
        return _err("BAD_REQUEST", "label is required", 400)
    if not file_name:
        return _err("BAD_REQUEST", "fileName is required", 400)
    if not file_url:
        return _err("BAD_REQUEST", "fileUrl is required", 400)

    # Resolve DB type
    raw_type     = (body.get("type") or "").strip().lower()
    raw_category = (body.get("category") or "").strip()
    if raw_type and raw_type in TYPE_TO_CATEGORY:
        db_type = raw_type
    elif raw_category and raw_category in CATEGORY_TO_TYPE:
        db_type = CATEGORY_TO_TYPE[raw_category]
    else:
        db_type = "other"

    # Parse optional expiry date
    expiry_date = None
    raw_expiry  = (body.get("expiryDate") or "").strip()
    if raw_expiry:
        try:
            expiry_date = datetime.fromisoformat(raw_expiry.replace("Z", "+00:00"))
        except ValueError:
            return _err("BAD_REQUEST", "Invalid expiryDate format (use ISO 8601)", 400)

    now = datetime.now(timezone.utc)
    doc = {
        "orgId":      org_id,
        "type":       db_type,
        "label":      label,
        "fileName":   file_name,
        "fileUrl":    file_url,
        "fileSize":   body.get("fileSize"),
        "status":     "pending_review",
        "expiryDate": expiry_date,
        "uploadedAt": now,
        "uploadedBy": user_id,
        "reviewNotes": "",
        "reviewedBy":  None,
        "reviewedAt":  None,
    }

    result = db.compliance_documents.insert_one(doc)
    doc["_id"] = result.inserted_id

    return jsonify(_doc_to_dict(doc)), 201


@bp.patch("/documents/<doc_id>")
@require_role("org_admin", "provider_staff")
def update_document(doc_id):
    """
    Update mutable fields on a compliance document.

    Allowed fields in JSON body:
      label, type, category, fileName, fileUrl, fileSize, expiryDate

    Typically used to re-upload a rejected document (new fileUrl + fileName).
    Re-uploading resets status to pending_review.
    """
    db     = get_db()
    org_id = ObjectId(g.claims["orgId"])

    try:
        oid = ObjectId(doc_id)
    except InvalidId:
        return _err("BAD_REQUEST", "Invalid document ID", 400)

    existing = db.compliance_documents.find_one({"_id": oid, "orgId": org_id})
    if not existing:
        return _err("NOT_FOUND", "Document not found", 404)

    body  = request.get_json(silent=True) or {}
    patch = {}

    if "label" in body:
        patch["label"] = (body["label"] or "").strip()

    if "type" in body:
        raw = (body["type"] or "").strip().lower()
        if raw in TYPE_TO_CATEGORY:
            patch["type"] = raw

    if "category" in body:
        cat = (body["category"] or "").strip()
        if cat in CATEGORY_TO_TYPE:
            patch["type"] = CATEGORY_TO_TYPE[cat]

    if "expiryDate" in body:
        raw_exp = (body["expiryDate"] or "").strip()
        if raw_exp:
            try:
                patch["expiryDate"] = datetime.fromisoformat(
                    raw_exp.replace("Z", "+00:00")
                )
            except ValueError:
                return _err("BAD_REQUEST", "Invalid expiryDate format", 400)
        else:
            patch["expiryDate"] = None

    # If a new file is being supplied → reset to pending_review
    if "fileUrl" in body and body["fileUrl"]:
        patch["fileUrl"]   = body["fileUrl"].strip()
        patch["fileName"]  = (body.get("fileName") or existing.get("fileName", "")).strip()
        patch["fileSize"]  = body.get("fileSize")
        patch["status"]    = "pending_review"
        patch["uploadedAt"] = datetime.now(timezone.utc)
        patch["uploadedBy"] = ObjectId(g.user["_id"])
        patch["reviewNotes"] = ""
        patch["reviewedBy"]  = None
        patch["reviewedAt"]  = None

    if not patch:
        return _err("BAD_REQUEST", "No updatable fields provided", 400)

    db.compliance_documents.update_one({"_id": oid}, {"$set": patch})

    updated = db.compliance_documents.find_one({"_id": oid})
    return jsonify(_doc_to_dict(updated))


@bp.delete("/documents/<doc_id>")
@require_role("org_admin", "provider_staff")
def delete_document(doc_id):
    """
    Delete a compliance document.
    Only org_admin can delete; provider_staff gets 403.
    """
    db     = get_db()
    org_id = ObjectId(g.claims["orgId"])

    # Only org_admin can permanently delete
    if g.user.get("role") != "org_admin":
        return _err("FORBIDDEN", "Only org_admin can delete documents", 403)

    try:
        oid = ObjectId(doc_id)
    except InvalidId:
        return _err("BAD_REQUEST", "Invalid document ID", 400)

    result = db.compliance_documents.delete_one({"_id": oid, "orgId": org_id})
    if result.deleted_count == 0:
        return _err("NOT_FOUND", "Document not found", 404)

    return jsonify({"ok": True, "deleted": doc_id})


@bp.get("/documents/<doc_id>/download")
@require_role("org_admin", "provider_staff")
def download_document(doc_id):
    """
    Return the download URL for a compliance document.
    Response: { url: "..." }
    In production swap this for a pre-signed S3 URL.
    """
    db     = get_db()
    org_id = ObjectId(g.claims["orgId"])

    try:
        oid = ObjectId(doc_id)
    except InvalidId:
        return _err("BAD_REQUEST", "Invalid document ID", 400)

    doc = db.compliance_documents.find_one(
        {"_id": oid, "orgId": org_id},
        {"fileUrl": 1, "fileName": 1},
    )
    if not doc:
        return _err("NOT_FOUND", "Document not found", 404)

    file_url = doc.get("fileUrl") or ""
    if not file_url:
        return _err("NOT_FOUND", "No file associated with this document", 404)

    return jsonify({"url": file_url, "fileName": doc.get("fileName", "")})