"""
incoming_request_routes.py  –  Backend for IncomingRequests.jsx (ProviderSide)

Endpoints
─────────
GET   /api/provider/requests              List all service requests for this provider
GET   /api/provider/requests/stats        4 KPI counts (total, pending, accepted, rejected)
GET   /api/provider/requests/staff        List provider's own staff for assignment modal
PATCH /api/provider/requests/<id>/accept  Accept + assign a staff member to the request
PATCH /api/provider/requests/<id>/reject  Reject a pending request (optional reason)
"""

from datetime import datetime, timezone
import logging

from bson import ObjectId
from flask import Blueprint, g, jsonify, request

from utils.audit import write_audit
from auth import require_role
from db import get_db

logger = logging.getLogger(__name__)

bp = Blueprint("incoming_requests", __name__, url_prefix="/api/provider/requests")


def _err(code, msg, status):
    return jsonify({"error": {"code": code, "message": msg}}), status


def _normalise_org_id(raw):
    try:
        return ObjectId(raw) if not isinstance(raw, ObjectId) else raw
    except Exception:
        return raw


def _get_org_id():
    # Try user document first (ObjectId), fall back to JWT claims (string)
    claims = getattr(g, "claims", {}) or {}
    raw = g.user.get("orgId") or g.user.get("org_id") or claims.get("orgId") or claims.get("org_id")
    if raw is None:
        raise KeyError("orgId missing from both user document and JWT claims")
    return _normalise_org_id(raw)


def _org_id_variants(raw_org_id):
    try:
        oid = ObjectId(raw_org_id) if not isinstance(raw_org_id, ObjectId) else raw_org_id
        return [oid, str(oid)]
    except Exception:
        return [raw_org_id, str(raw_org_id)]


def _format_date(dt):
    if not dt:
        return ""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return str(int(dt.strftime("%d"))) + dt.strftime(" %b %Y")


def _relative_time(dt):
    if not dt:
        return ""
    now = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    secs = int((now - dt).total_seconds())
    if secs < 60:
        return "just now"
    if secs < 3600:
        return f"{secs // 60} min ago"
    if secs < 86400:
        h = secs // 3600
        return f"{h} hr{'s' if h > 1 else ''} ago"
    if secs < 172800:
        return "Yesterday"
    return f"{secs // 86400} days ago"


def _build_request_row(sr, db):
    try:
        client_org = db.organizations.find_one({"_id": sr.get("clientOrgId")}, {"name": 1}) or {}
    except Exception:
        client_org = {}

    raw_priority = (sr.get("priority") or "medium").lower()
    priority_map = {"high": "High", "medium": "Medium", "low": "Low"}
    priority = priority_map.get(raw_priority, "Medium")

    display_date = _format_date(sr.get("scheduledDate") or sr.get("createdAt"))

    assigned_staff_name = ""
    try:
        if sr.get("assignedProviderStaffId"):
            staff = db.users.find_one(
                {"_id": sr["assignedProviderStaffId"]},
                {"fullName": 1, "email": 1}
            )
            if staff:
                assigned_staff_name = staff.get("fullName") or staff.get("email", "")
    except Exception:
        pass

    return {
        "id":                f"#{str(sr['_id'])[-6:].upper()}",
        "requestId":         str(sr["_id"]),
        "company":           client_org.get("name", "Unknown Client"),
        "service":           sr.get("serviceType", ""),
        "date":              display_date,
        "priority":          priority,
        "status":            sr.get("status", "pending"),
        "location":          sr.get("location", ""),
        "description":       sr.get("description", ""),
        "createdAgo":        _relative_time(sr.get("createdAt")),
        "assignedStaffName": assigned_staff_name,
    }


# ── GET /api/provider/requests ────────────────────────────────────────────────

@bp.get("")
@require_role("org_admin", "provider_admin")
def list_requests():
    try:
        db     = get_db()
        org_id = _get_org_id()

        org_variants = _org_id_variants(org_id)
        query = {"providerOrgId": {"$in": org_variants}}

        status_param = request.args.get("status", "").strip().lower()
        if status_param and status_param != "all":
            query["status"] = status_param

        raw = list(
            db.service_requests.find(query).sort("createdAt", -1).limit(100)
        )

        rows = [_build_request_row(sr, db) for sr in raw]

        search = request.args.get("search", "").strip().lower()
        if search:
            rows = [
                r for r in rows
                if search in r["company"].lower()
                or search in r["service"].lower()
                or search in r["id"].lower()
            ]

        return jsonify(rows)
    except Exception as exc:
        logger.exception("list_requests failed for user %s: %s", g.user.get("_id"), exc)
        return _err("INTERNAL", f"Failed to load requests: {exc}", 500)


# ── GET /api/provider/requests/stats ─────────────────────────────────────────

@bp.get("/stats")
@require_role("org_admin", "provider_admin")
def get_stats():
    try:
        db     = get_db()
        org_id = _get_org_id()
        org_variants = _org_id_variants(org_id)
        base   = {"providerOrgId": {"$in": org_variants}}

        def count(extra):
            return db.service_requests.count_documents({**base, **extra})

        return jsonify({
            "total":      count({}),
            "pending":    count({"status": "pending"}),
            "accepted":   count({"status": "accepted"}),
            "rejected":   count({"status": "rejected"}),
            "inProgress": count({"status": "in_progress"}),
            "completed":  count({"status": "completed"}),
        })
    except Exception as exc:
        logger.exception("get_stats failed for user %s: %s", g.user.get("_id"), exc)
        return _err("INTERNAL", "Failed to load stats", 500)


# ── GET /api/provider/requests/staff ─────────────────────────────────────────

@bp.get("/staff")
@require_role("org_admin", "provider_admin")
def list_provider_staff():
    """
    Returns all active provider_staff (and org_admin) users belonging to the
    logged-in provider org. Used by the AssignStaffModal in IncomingRequests.jsx.

    Response: [ { id, fullName, email, initials, role } ]
    """
    try:
        db       = get_db()
        org_id   = _get_org_id()
        variants = _org_id_variants(org_id)

        staff_docs = list(db.users.find({
            "orgId":    {"$in": variants},
            "role":     {"$in": ["provider_staff", "org_admin"]},
            "isActive": {"$ne": False},
        }).sort("fullName", 1))

        # Safety net: always include the logged-in org_admin even if orgId
        # type mismatch in DB caused them to be missed by the query above.
        found_ids = {s["_id"] for s in staff_docs}
        current_id = g.user.get("_id")
        if current_id and current_id not in found_ids:
            if g.user.get("role") in ("org_admin", "provider_admin"):
                staff_docs.insert(0, g.user)

        result = []
        for s in staff_docs:
            name = s.get("fullName") or s.get("email") or "Staff"
            initials = "".join(w[0].upper() for w in name.split()[:2])
            role_label = "Admin" if s.get("role") == "org_admin" else "Provider Staff"
            result.append({
                "id":       str(s["_id"]),
                "fullName": name,
                "email":    s.get("email", ""),
                "initials": initials,
                "role":     role_label,
            })

        return jsonify(result)
    except Exception as exc:
        logger.exception("list_provider_staff failed: %s", exc)
        # Surface the real error so it is visible in the modal and server logs
        return _err("INTERNAL", f"Failed to load staff: {exc}", 500)


# ── PATCH /api/provider/requests/<id>/accept ─────────────────────────────────

@bp.patch("/<request_id>/accept")
@require_role("org_admin", "provider_admin")
def accept_request(request_id):
    """
    Accept a pending service request and assign a provider staff member.

    Body: { "staffId": "<ObjectId string>" }   (required)

    Updates:
      status                  -> "accepted"
      assignedProviderStaffId -> staffId (ObjectId)
      updatedAt               -> now
    """
    db     = get_db()
    org_id = _get_org_id()

    try:
        sr_oid = ObjectId(request_id)
    except Exception:
        return _err("BAD_REQUEST", "Invalid request ID", 400)

    # Validate staffId from request body
    body         = request.get_json(silent=True) or {}
    staff_id_raw = body.get("staffId", "")
    try:
        staff_oid = ObjectId(staff_id_raw)
    except Exception:
        return _err("BAD_REQUEST", "staffId is required and must be a valid ID", 400)

    # Verify the staff member belongs to this provider org
    staff = db.users.find_one({
        "_id":      staff_oid,
        "orgId":    {"$in": _org_id_variants(org_id)},
        "role":     {"$in": ["provider_staff", "org_admin"]},
        "isActive": {"$ne": False},
    })
    if not staff:
        return _err("NOT_FOUND", "Staff member not found in your organisation", 404)

    # Find the service request
    sr = db.service_requests.find_one({
        "_id":           sr_oid,
        "providerOrgId": {"$in": _org_id_variants(org_id)},
    })
    if not sr:
        return _err("NOT_FOUND", "Service request not found for your organisation", 404)

    current_status = sr.get("status")
    if current_status == "accepted":
        # Already accepted — return success idempotently so the UI stays in sync
        staff_name = ""
        if sr.get("assignedProviderStaffId"):
            s = db.users.find_one({"_id": sr["assignedProviderStaffId"]}, {"fullName": 1, "email": 1})
            if s:
                staff_name = s.get("fullName") or s.get("email", "")
        return jsonify({
            "ok":                True,
            "requestId":         request_id,
            "status":            "accepted",
            "assignedStaffId":   str(sr.get("assignedProviderStaffId", "")),
            "assignedStaffName": staff_name,
            "alreadyAccepted":   True,
        })
    if current_status != "pending":
        return _err("CONFLICT", f"Cannot accept a request with status '{current_status}'", 409)

    now = datetime.now(timezone.utc)
    db.service_requests.update_one(
        {"_id": sr_oid},
        {"$set": {
            "status":                  "accepted",
            "assignedProviderStaffId": staff_oid,
            "updatedAt":               now,
        }},
    )

    staff_name = staff.get("fullName") or staff.get("email", "")

    write_audit(
        org_id=org_id,
        user_id=g.user["_id"],
        action="updated",
        entity="service_request",
        entity_id=sr_oid,
        description=f"Service request accepted — {sr.get('serviceType', '')} — assigned to {staff_name}",
        metadata={
            "clientOrgId":             str(sr.get("clientOrgId", "")),
            "assignedProviderStaffId": str(staff_oid),
            "assignedStaffName":       staff_name,
        },
    )

    return jsonify({
        "ok":                True,
        "requestId":         request_id,
        "status":            "accepted",
        "assignedStaffId":   str(staff_oid),
        "assignedStaffName": staff_name,
    })


# ── PATCH /api/provider/requests/<id>/reject ─────────────────────────────────

@bp.patch("/<request_id>/reject")
@require_role("org_admin", "provider_admin")
def reject_request(request_id):
    """
    Reject a pending service request.
    Body: { "reason": "..." }  (optional)
    """
    db     = get_db()
    org_id = _get_org_id()

    try:
        sr_oid = ObjectId(request_id)
    except Exception:
        return _err("BAD_REQUEST", "Invalid request ID", 400)

    sr = db.service_requests.find_one({
        "_id":           sr_oid,
        "providerOrgId": {"$in": _org_id_variants(org_id)},
    })
    if not sr:
        return _err("NOT_FOUND", "Service request not found for your organisation", 404)

    if sr.get("status") != "pending":
        return _err("CONFLICT", f"Cannot reject a request with status '{sr.get('status')}'", 409)

    body   = request.get_json(silent=True) or {}
    reason = body.get("reason", "")

    now = datetime.now(timezone.utc)
    db.service_requests.update_one(
        {"_id": sr_oid},
        {"$set": {"status": "rejected", "rejectionReason": reason, "updatedAt": now}},
    )

    write_audit(
        org_id=org_id,
        user_id=g.user["_id"],
        action="rejected",
        entity="service_request",
        entity_id=sr_oid,
        description=f"Service request rejected — {sr.get('serviceType', '')}",
        metadata={"clientOrgId": str(sr.get("clientOrgId", "")), "reason": reason},
    )

    return jsonify({"ok": True, "requestId": request_id, "status": "rejected"})