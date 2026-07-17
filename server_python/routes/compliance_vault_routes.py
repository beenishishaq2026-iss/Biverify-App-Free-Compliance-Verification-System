"""
compliance_vault_routes.py  –  Backend for ComplianceVault.jsx (Client side)

Endpoints
─────────
GET  /api/compliance-vault/documents        Provider compliance docs visible to this client
GET  /api/compliance-vault/stats            KPI counts: expired / expiring / approved / pending
GET  /api/compliance-vault/documents/<id>   Single document detail (for modal)
GET  /api/compliance-vault/documents/<id>/download   Redirect / signed URL for file download

Logic
─────
A client org sees compliance_documents that belong to provider orgs they are
connected to (b2b_connections status="connected") OR have active/completed
service_requests with.

Status mapping  (DB → UI)
  compliance_documents.status field → UI label
    "verified"       → "approved"
    "pending_review" → "pending"
    "rejected"       → "pending"   (shown as pending until re-upload)
    "expired"        → "expired"

Expiry calculation (done server-side so the client never has to compute it):
    daysLeft  = (expiryDate – today).days
    if daysLeft < 0               → status override = "expired"
    if 0 <= daysLeft <= 30        → status override = "expiring"

Register in app.py:
    from routes.compliance_vault_routes import bp as compliance_vault_bp
    app.register_blueprint(compliance_vault_bp)
"""

from datetime import datetime, timezone, timedelta
from bson import ObjectId
from bson.errors import InvalidId
from flask import Blueprint, g, jsonify, request, redirect

from auth import require_role
from db import get_db

bp = Blueprint("compliance_vault", __name__, url_prefix="/api/compliance-vault")

EXPIRING_THRESHOLD_DAYS = 30  # docs expiring within this many days are "expiring"


# ── helpers ──────────────────────────────────────────────────────────────────

def _err(code, msg, status):
    return jsonify({"error": {"code": code, "message": msg}}), status


def _days_left(expiry_date):
    """Return integer days until expiry (negative = already expired)."""
    if not expiry_date:
        return None
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    expiry = expiry_date.replace(tzinfo=timezone.utc) if expiry_date.tzinfo is None else expiry_date
    return (expiry - today).days


def _compute_ui_status(db_status, days_left):
    """
    Derive the UI status string from the DB status + days-left calculation.
    Priority: expired (by date) > expiring (by date) > DB status mapping.
    """
    if days_left is not None and days_left < 0:
        return "expired"
    if db_status == "expired":
        return "expired"
    if days_left is not None and 0 <= days_left <= EXPIRING_THRESHOLD_DAYS:
        return "expiring"
    if db_status == "verified":
        return "approved"
    if db_status in ("pending_review", "rejected"):
        return "pending"
    return "pending"


def _initials(name: str) -> str:
    """Return up to 2 uppercase initials from an org name."""
    words = name.split()
    if len(words) >= 2:
        return (words[0][0] + words[1][0]).upper()
    return name[:2].upper() if name else "??"


def _pav_cls(ui_status: str) -> str:
    """CSS class for the provider avatar based on status."""
    return {
        "expired":  "pav-danger",
        "expiring": "pav-warn",
    }.get(ui_status, "pav-green")


def _serialize_doc(doc, provider_org, uploader_user):
    """
    Serialize a compliance_documents record into the shape ComplianceVault.jsx
    expects (mirrors the ALL_DOCS array in the original hardcoded frontend).
    """
    expiry_date  = doc.get("expiryDate")
    days_left    = _days_left(expiry_date)
    db_status    = doc.get("status", "pending_review")
    ui_status    = _compute_ui_status(db_status, days_left)

    provider_name = provider_org.get("name", "Unknown Provider") if provider_org else "Unknown Provider"

    # Uploader display: prefer full name, fall back to email username
    if uploader_user:
        first = uploader_user.get("firstName", "")
        last  = uploader_user.get("lastName", "")
        uploaded_by = f"{first} {last}".strip() or uploader_user.get("email", "").split("@")[0]
    else:
        uploaded_by = "unknown"

    # Human-readable document label: prefer the custom label, otherwise map the type enum
    type_labels = {
        "insurance":    "Liability Insurance",
        "license":      "Business License",
        "certificate":  "Certificate",
        "tax_clearance":"Tax Registration",
        "health_safety":"Health & Safety Cert",
        "other":        "Compliance Document",
    }
    doc_type = doc.get("label") or type_labels.get(doc.get("type", "other"), "Compliance Document")

    # File extension from fileName
    file_name = doc.get("fileName", "")
    file_ext  = file_name.rsplit(".", 1)[-1].upper() if "." in file_name else "PDF"

    return {
        "id":         str(doc["_id"]),
        "provider":   provider_name,
        "initials":   _initials(provider_name),
        "pavCls":     _pav_cls(ui_status),
        "docType":    doc_type,
        "type":       doc.get("type", "other"),
        "expiry":     expiry_date.strftime("%Y-%m-%d") if expiry_date else None,
        "daysLeft":   days_left,
        "status":     ui_status,       # "approved" | "expiring" | "expired" | "pending"
        "uploadedBy": uploaded_by,
        "fileType":   file_ext,
        "fileName":   file_name,
        "fileUrl":    doc.get("fileUrl"),
        "reviewNotes": doc.get("reviewNotes"),
        "uploadedAt": doc["uploadedAt"].isoformat() if doc.get("uploadedAt") else None,
        "providerOrgId": str(doc.get("orgId", "")),
    }


def _get_connected_provider_ids(db, client_org_id):
    """
    Return a list of ObjectId for all provider orgs this client is connected to.
    Sources:
      1. b2b_connections where status="connected" and client is org1 or org2
      2. service_requests where clientOrgId == client (any non-cancelled status)
    """
    provider_ids = set()

    # Source 1: B2B connections
    b2b_cursor = db.b2b_connections.find({
        "$or": [
            {"org1Id": client_org_id},
            {"org2Id": client_org_id},
        ],
        "status": "connected",
    })
    for conn in b2b_cursor:
        other_id = conn["org2Id"] if conn["org1Id"] == client_org_id else conn["org1Id"]
        provider_ids.add(other_id)

    # Source 2: Service requests (catch providers without a formal b2b connection)
    sr_cursor = db.service_requests.find(
        {"clientOrgId": client_org_id, "status": {"$ne": "cancelled"}},
        {"providerOrgId": 1},
    )
    for sr in sr_cursor:
        if sr.get("providerOrgId"):
            provider_ids.add(sr["providerOrgId"])

    return list(provider_ids)


# ══════════════════════════════════════════════════════════════════════════════
# GET /api/compliance-vault/stats
# ══════════════════════════════════════════════════════════════════════════════

@bp.get("/stats")
@require_role("org_admin", "client_staff", "compliance_officer")
def get_stats():
    """
    Returns the four KPI counters shown in the stat strip:
      expired   – docs whose UI status is "expired"
      expiring  – docs expiring within EXPIRING_THRESHOLD_DAYS days
      approved  – docs with status "verified" and not expiring
      pending   – docs with status "pending_review" or "rejected"

    Scope: all compliance_documents of provider orgs connected to this client.
    """
    db = get_db()
    client_org_id = g.user["orgId"] if isinstance(g.user["orgId"], ObjectId) else ObjectId(g.user["orgId"])

    provider_ids = _get_connected_provider_ids(db, client_org_id)
    if not provider_ids:
        return jsonify({"expired": 0, "expiring": 0, "approved": 0, "pending": 0, "total": 0})

    docs = list(db.compliance_documents.find({"orgId": {"$in": provider_ids}}))

    counts = {"expired": 0, "expiring": 0, "approved": 0, "pending": 0}
    for doc in docs:
        days_left = _days_left(doc.get("expiryDate"))
        ui_status = _compute_ui_status(doc.get("status", "pending_review"), days_left)
        if ui_status in counts:
            counts[ui_status] += 1

    counts["total"] = len(docs)
    return jsonify(counts)


# ══════════════════════════════════════════════════════════════════════════════
# GET /api/compliance-vault/documents
# ══════════════════════════════════════════════════════════════════════════════

@bp.get("/documents")
@require_role("org_admin", "client_staff", "compliance_officer")
def list_documents():
    """
    Returns compliance documents for all providers connected to this client.

    Query params (all optional):
      search   – filter by provider name or document type (case-insensitive)
      status   – filter by UI status: expired | expiring | approved | pending
      limit    – default 100
      skip     – default 0

    Response:
      { documents: [...], total: int }

    Each document object mirrors the fields in ALL_DOCS in ComplianceVault.jsx.
    """
    db = get_db()
    client_org_id = g.user["orgId"] if isinstance(g.user["orgId"], ObjectId) else ObjectId(g.user["orgId"])

    provider_ids = _get_connected_provider_ids(db, client_org_id)
    if not provider_ids:
        return jsonify({"documents": [], "total": 0})

    try:
        limit = int(request.args.get("limit", 100))
        skip  = int(request.args.get("skip",  0))
    except (TypeError, ValueError):
        limit, skip = 100, 0

    # Fetch all docs for connected providers (we filter in Python for expiry logic)
    all_docs = list(
        db.compliance_documents
        .find({"orgId": {"$in": provider_ids}})
        .sort("uploadedAt", -1)
    )

    # Hydrate provider orgs + uploaders in batch to avoid N+1
    provider_map = {
        org["_id"]: org
        for org in db.organizations.find({"_id": {"$in": provider_ids}})
    }

    uploader_ids = [d["uploadedBy"] for d in all_docs if d.get("uploadedBy")]
    uploader_map = {
        u["_id"]: u
        for u in db.users.find({"_id": {"$in": uploader_ids}})
    } if uploader_ids else {}

    # Serialize + compute UI status
    serialized = []
    for doc in all_docs:
        provider_org   = provider_map.get(doc.get("orgId"))
        uploader_user  = uploader_map.get(doc.get("uploadedBy"))
        serialized.append(_serialize_doc(doc, provider_org, uploader_user))

    # Apply status filter
    status_filter = request.args.get("status", "").strip().lower()
    if status_filter in ("expired", "expiring", "approved", "pending"):
        serialized = [d for d in serialized if d["status"] == status_filter]

    # Apply search filter (provider name or doc type)
    search = request.args.get("search", "").strip().lower()
    if search:
        serialized = [
            d for d in serialized
            if search in d["provider"].lower() or search in d["docType"].lower()
        ]

    total = len(serialized)

    # Apply pagination after filtering
    page_docs = serialized[skip: skip + limit]

    return jsonify({"documents": page_docs, "total": total})


# ══════════════════════════════════════════════════════════════════════════════
# GET /api/compliance-vault/documents/<id>
# ══════════════════════════════════════════════════════════════════════════════

@bp.get("/documents/<doc_id>")
@require_role("org_admin", "client_staff", "compliance_officer")
def get_document(doc_id):
    """
    Returns full detail for a single compliance document.
    Used by the View / modal in ComplianceVault.jsx.

    The client must be connected to the provider org that owns this document.
    """
    db = get_db()
    client_org_id = g.user["orgId"] if isinstance(g.user["orgId"], ObjectId) else ObjectId(g.user["orgId"])

    try:
        oid = ObjectId(doc_id)
    except (InvalidId, TypeError):
        return _err("BAD_REQUEST", "Invalid document id", 400)

    doc = db.compliance_documents.find_one({"_id": oid})
    if not doc:
        return _err("NOT_FOUND", "Document not found", 404)

    # Security: confirm the client is connected to this provider
    provider_ids = _get_connected_provider_ids(db, client_org_id)
    if doc.get("orgId") not in provider_ids:
        return _err("FORBIDDEN", "You do not have access to this document", 403)

    provider_org  = db.organizations.find_one({"_id": doc.get("orgId")})
    uploader_user = db.users.find_one({"_id": doc.get("uploadedBy")}) if doc.get("uploadedBy") else None

    return jsonify({"document": _serialize_doc(doc, provider_org, uploader_user)})


# ══════════════════════════════════════════════════════════════════════════════
# GET /api/compliance-vault/documents/<id>/download
# ══════════════════════════════════════════════════════════════════════════════

@bp.get("/documents/<doc_id>/download")
@require_role("org_admin", "client_staff", "compliance_officer")
def download_document(doc_id):
    """
    Returns the file URL for downloading a compliance document.

    If fileUrl is an HTTP URL: returns { url: "..." } so the frontend
    can open it in a new tab.

    If your project uses local storage (fileUrl is a relative path),
    serve the file through Flask's send_file instead.
    """
    db = get_db()
    client_org_id = g.user["orgId"] if isinstance(g.user["orgId"], ObjectId) else ObjectId(g.user["orgId"])

    try:
        oid = ObjectId(doc_id)
    except (InvalidId, TypeError):
        return _err("BAD_REQUEST", "Invalid document id", 400)

    doc = db.compliance_documents.find_one({"_id": oid})
    if not doc:
        return _err("NOT_FOUND", "Document not found", 404)

    provider_ids = _get_connected_provider_ids(db, client_org_id)
    if doc.get("orgId") not in provider_ids:
        return _err("FORBIDDEN", "You do not have access to this document", 403)

    file_url = doc.get("fileUrl")
    if not file_url:
        return _err("NOT_FOUND", "No file attached to this document", 404)

    # If stored as an absolute URL (S3, CDN, etc.) redirect the client
    if file_url.startswith("http"):
        return redirect(file_url)

    # Otherwise return the URL so the frontend can handle it
    return jsonify({"url": file_url, "fileName": doc.get("fileName", "document.pdf")})
