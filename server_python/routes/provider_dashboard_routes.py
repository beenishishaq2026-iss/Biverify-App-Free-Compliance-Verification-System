"""
provider_dashboard_routes.py  –  Backend for ServiceProviderDashboard.jsx (ProviderSide)

Endpoints
─────────
GET  /api/provider/dashboard/stats       4 KPI stat cards
GET  /api/provider/dashboard/activity    Recent activity feed (audit_logs + events)
GET  /api/provider/dashboard/compliance-status  Compliance banner data (org approval status + pending docs)

Register in app.py:
    from routes.provider_dashboard_routes import bp as provider_dashboard_bp
    app.register_blueprint(provider_dashboard_bp)
"""

from datetime import datetime, timezone

from flask import Blueprint, g, jsonify

from auth import require_role
from db import get_db

bp = Blueprint("provider_dashboard", __name__, url_prefix="/api/provider/dashboard")


def _err(code, msg, status):
    return jsonify({"error": {"code": code, "message": msg}}), status


# ── /debug  (REMOVE BEFORE PRODUCTION) ───────────────────────────────────────

@bp.get("/debug")
@require_role("org_admin")
def debug():
    db     = get_db()
    org_id = g.user["orgId"]

    matched = list(db.service_requests.find(
        {"providerOrgId": org_id}, {"status": 1, "providerOrgId": 1}
    ).limit(20))

    all_reqs = list(db.service_requests.find(
        {}, {"status": 1, "providerOrgId": 1}
    ).limit(20))

    return jsonify({
        "your_org_id":               str(org_id),
        "your_org_id_type":          type(org_id).__name__,
        "requests_matching_your_org": [
            {"_id": str(r["_id"]), "status": r.get("status"),
             "providerOrgId": str(r.get("providerOrgId", "MISSING"))}
            for r in matched
        ],
        "all_requests_in_db": [
            {"_id": str(r["_id"]), "status": r.get("status"),
             "providerOrgId": str(r.get("providerOrgId", "MISSING"))}
            for r in all_reqs
        ],
    })


# ── /stats ────────────────────────────────────────────────────────────────────

@bp.get("/stats")
@require_role("org_admin")
def get_stats():
    from bson import ObjectId

    db     = get_db()
    raw    = g.user["orgId"]

    # Normalise: always query as ObjectId (service_requests.providerOrgId is
    # stored as ObjectId by service_request_routes; users.orgId may be either)
    try:
        org_oid = ObjectId(raw) if not isinstance(raw, ObjectId) else raw
    except Exception:
        org_oid = raw   # fallback – let Mongo reject it if invalid

    # service_requests stores providerOrgId as ObjectId
    active_jobs = db.service_requests.count_documents({
        "providerOrgId": org_oid,
        "status": "in_progress",
    })

    completed_jobs = db.service_requests.count_documents({
        "providerOrgId": org_oid,
        "status": "completed",
    })

    # users.orgId could be ObjectId or str depending on how user was seeded;
    # query both to be safe
    total_staff = db.users.count_documents({
        "orgId": {"$in": [org_oid, str(org_oid)]},
        "role": "provider_staff",
        "isActive": True,
    })

    # compliance_documents.orgId same ambiguity
    pending_docs = db.compliance_documents.count_documents({
        "orgId": {"$in": [org_oid, str(org_oid)]},
        "status": "pending_review",
    })

    return jsonify({
        "activeServiceJobs":     active_jobs,
        "jobsCompleted":         completed_jobs,
        "totalStaff":            total_staff,
        "pendingComplianceDocs": pending_docs,
    })


# ── /activity ─────────────────────────────────────────────────────────────────

@bp.get("/activity")
@require_role("org_admin")
def get_activity():
    """
    Returns up to 10 recent activity items for the provider org, built from
    the audit_logs collection.  Each item shape:

    {
      "text":  string,
      "time":  string,   # human-friendly relative label  OR  ISO timestamp
      "icon":  string,   # one of: inbox | badge | users | upload | check | scroll
      "iconBg":    string,
      "iconColor": string
    }

    Icon/colour mapping mirrors the hardcoded ACTIVITY array in the frontend.
    """
    from bson import ObjectId
    db     = get_db()
    raw    = g.user["orgId"]
    try:
        org_id = ObjectId(raw) if not isinstance(raw, ObjectId) else raw
    except Exception:
        org_id = raw
    org_filter = {"$in": [org_id, str(org_id)]}

    logs = list(
        db.audit_logs.find({"orgId": org_filter})
        .sort("timestamp", -1)
        .limit(10)
    )

    # Mapping: audit action/entity → frontend icon style
    STYLE_MAP = {
        # (action, entity)           → icon, bg, color
        ("created",  "user"):        ("users",  "#f5f3ff", "#8b5cf6"),
        ("deleted",  "user"):        ("users",  "#f5f3ff", "#8b5cf6"),
        ("uploaded", "compliance_document"): ("upload", "#fffbeb", "#f59e0b"),
        ("approved", "compliance_document"): ("badge",  "#ecfdf5", "#2b9d4e"),
        ("rejected", "compliance_document"): ("alert",  "#fef2f2", "#ef4444"),
        ("approved", "organization"):        ("badge",  "#ecfdf5", "#2b9d4e"),
        ("rejected", "organization"):        ("alert",  "#fef2f2", "#ef4444"),
        ("scanned",  "scan_job"):    ("scroll", "#eff6ff", "#3b82f6"),
        ("login",    "user"):        ("scroll", "#f5f3ff", "#8b5cf6"),
    }
    INCOMING_STYLE  = ("inbox",  "#eff6ff", "#3b82f6")
    COMPLETED_STYLE = ("check",  "#ecfdf5", "#2b9d4e")
    DEFAULT_STYLE   = ("scroll", "#f3f4f6", "#6b7280")

    def _icon_style(log):
        action = log.get("action", "")
        entity = log.get("entity", "")
        if entity == "service_request":
            return COMPLETED_STYLE if action == "completed" else INCOMING_STYLE
        return STYLE_MAP.get((action, entity), DEFAULT_STYLE)

    def _relative_time(ts: datetime) -> str:
        if not ts:
            return ""
        now = datetime.now(timezone.utc)
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        diff = now - ts
        secs = int(diff.total_seconds())
        if secs < 60:
            return "just now"
        if secs < 3600:
            m = secs // 60
            return f"{m} min ago"
        if secs < 86400:
            h = secs // 3600
            return f"{h} hr{'s' if h > 1 else ''} ago"
        if secs < 172800:
            return "Yesterday"
        d = secs // 86400
        return f"{d} days ago"

    items = []
    for log in logs:
        icon, bg, color = _icon_style(log)
        items.append({
            "text":      log.get("description") or f"{log.get('action', '')} {log.get('entity', '')}",
            "time":      _relative_time(log.get("timestamp")),
            "icon":      icon,
            "iconBg":    bg,
            "iconColor": color,
        })

    return jsonify(items)


# ── /compliance-status ────────────────────────────────────────────────────────

@bp.get("/compliance-status")
@require_role("org_admin")
def get_compliance_status():
    """
    Powers the yellow compliance banner at the bottom of the dashboard.

    Response shape:
    {
      "orgStatus":           "pending" | "approved" | "rejected" | "suspended",
      "showBanner":          bool,    # true when org is NOT yet approved
      "pendingDocCount":     int,
      "expiredDocCount":     int,
      "underReviewDocCount": int
    }
    """
    from bson import ObjectId
    db     = get_db()
    raw    = g.user["orgId"]
    try:
        org_id = ObjectId(raw) if not isinstance(raw, ObjectId) else raw
    except Exception:
        org_id = raw

    org = db.organizations.find_one({"_id": org_id}, {"status": 1})
    if not org:
        return _err("NOT_FOUND", "Organization not found", 404)

    org_status = org.get("status", "pending")

    oid_filter = {"$in": [org_id, str(org_id)]}
    pending_count      = db.compliance_documents.count_documents({"orgId": oid_filter, "status": "pending_review"})
    expired_count      = db.compliance_documents.count_documents({"orgId": oid_filter, "status": "expired"})
    under_review_count = pending_count  # same query, reuse

    show_banner = org_status != "approved"

    return jsonify({
        "orgStatus":           org_status,
        "showBanner":          show_banner,
        "pendingDocCount":     pending_count,
        "expiredDocCount":     expired_count,
        "underReviewDocCount": under_review_count,
    })