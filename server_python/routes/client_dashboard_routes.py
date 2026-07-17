"""
BiVerify — Client Dashboard Routes
====================================
File location:  server_python/routes/client_dashboard_routes.py

Register in app.py:
    from routes.client_dashboard_routes import bp as client_dashboard_bp
    app.register_blueprint(client_dashboard_bp)

Powers ClientDashboard.jsx (ClientSide).

Endpoints
─────────
GET  /api/client/dashboard/me               → navbar data (org name, initials, site label)
GET  /api/client/dashboard/stats            → 4 KPI cards
GET  /api/client/dashboard/scan-chart       → QR scan volume grouped by quarter (bar chart)
GET  /api/client/dashboard/provider-ranking → Provider ranking by verified job count
GET  /api/client/dashboard/recent-scans     → Recent QR scan rows table

Roles allowed: org_admin, compliance_officer, client_staff
  (all read-only; no mutations here — dashboard is display-only)
"""

from datetime import datetime, timezone, timedelta
from collections import defaultdict

from bson import ObjectId
from bson.errors import InvalidId
from flask import Blueprint, g, jsonify, request

from auth import require_role
from db import get_db

bp = Blueprint("client_dashboard", __name__, url_prefix="/api/client/dashboard")

CLIENT_ROLES = ("org_admin", "compliance_officer", "client_staff")


def _err(code, msg, status):
    return jsonify({"error": {"code": code, "message": msg}}), status


def _now():
    return datetime.now(timezone.utc)


def _oid(raw):
    if isinstance(raw, ObjectId):
        return raw
    return ObjectId(str(raw))


def _oid_filter(raw):
    """Return a Mongo $in filter that matches ObjectId OR string form."""
    try:
        oid = _oid(raw)
        return {"$in": [oid, str(oid)]}
    except Exception:
        return raw


def _relative_time(ts: datetime) -> str:
    if not ts:
        return ""
    now = _now()
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    diff = now - ts
    secs = int(diff.total_seconds())
    if secs < 60:
        return "just now"
    if secs < 3600:
        m = secs // 60
        return f"{m}m ago"
    if secs < 86400:
        h = secs // 3600
        return f"{h}h ago"
    if secs < 172800:
        return "Yesterday"
    d = secs // 86400
    return f"{d} days ago"


# ══════════════════════════════════════════════════════════════════════════════
#  GET /api/client/dashboard/me
#  Returns navbar data: org name, initials, active site label, user display name.
#  Used to replace static hardcoded values in the top nav.
# ══════════════════════════════════════════════════════════════════════════════
@bp.get("/me")
@require_role(*CLIENT_ROLES)
def me():
    db  = get_db()
    org = db.organizations.find_one(
        {"_id": _oid(g.user["orgId"])},
        {"name": 1, "sites": 1}
    )

    org_name = org["name"] if org else "Unknown Org"

    # Build initials from org name (up to 2 words)
    words    = [w for w in org_name.split() if w]
    initials = "".join(w[0].upper() for w in words[:2]) if words else "??"

    # Pick the first active site as the "current" site label
    sites      = org.get("sites", []) if org else []
    site_label = None
    for s in sites:
        if s.get("active", True):          # prefer flagged-active site
            site_label = s.get("label") or s.get("name")
            break
    if not site_label and sites:
        site_label = sites[0].get("label") or sites[0].get("name")
    if not site_label:
        site_label = "HQ"

    # User display name — prefer full name, fall back to email prefix
    user_name = g.user.get("name", "")
    if not user_name:
        email     = g.user.get("email", "")
        user_name = email.split("@")[0] if email else "User"

    return jsonify({
        "orgName":   org_name,
        "initials":  initials,
        "siteLabel": site_label,
        "userName":  user_name,
        "role":      g.user.get("role", ""),
    })


# ══════════════════════════════════════════════════════════════════════════════
#  GET /api/client/dashboard/stats
#  Powers the 4 KPI cards:
#    1. Active Providers   – distinct provider orgs with an active/in_progress request
#    2. Compliance Rate    – % of connected provider docs that are verified
#    3. QR Scans Today     – scan_jobs for my org scanned today
#    4. Expiring Docs      – provider compliance docs expiring within 30 days
# ══════════════════════════════════════════════════════════════════════════════
@bp.get("/stats")
@require_role(*CLIENT_ROLES)
def get_stats():
    db     = get_db()
    my_oid = _oid(g.user["orgId"])
    oid_f  = _oid_filter(g.user["orgId"])

    # ── 1. Active Providers ───────────────────────────────────────────────────
    # Count distinct providerOrgIds where status is active/in_progress
    active_pipeline = [
        {"$match": {
            "clientOrgId": my_oid,
            "status": {"$in": ["accepted", "in_progress", "pending"]},
        }},
        {"$group": {"_id": "$providerOrgId"}},
        {"$count": "total"},
    ]
    active_result    = list(db.service_requests.aggregate(active_pipeline))
    active_providers = active_result[0]["total"] if active_result else 0

    # Count newly onboarded this calendar month (status=accepted created this month)
    month_start    = _now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    new_this_month = db.service_requests.count_documents({
        "clientOrgId": my_oid,
        "status": {"$in": ["accepted", "in_progress"]},
        "createdAt": {"$gte": month_start},
    })

    # ── 2. Compliance Rate ────────────────────────────────────────────────────
    # Get all provider org IDs connected to me (b2b_connections status=connected)
    conns = list(db.b2b_connections.find({
        "$or": [{"org1Id": my_oid}, {"org2Id": my_oid}],
        "status": "connected",
    }))
    provider_ids = []
    for c in conns:
        peer = c["org2Id"] if c["org1Id"] == my_oid else c["org1Id"]
        provider_ids.append(peer)

    # Also include any provider orgs that have active service requests with us
    sr_providers     = db.service_requests.distinct("providerOrgId", {"clientOrgId": my_oid})
    all_provider_ids = list(set(provider_ids + [_oid(p) for p in sr_providers]))

    if all_provider_ids:
        total_docs    = db.compliance_documents.count_documents({"orgId": {"$in": all_provider_ids}})
        verified_docs = db.compliance_documents.count_documents({
            "orgId": {"$in": all_provider_ids},
            "status": "verified",
        })
        compliance_rate = round(verified_docs / total_docs * 100) if total_docs > 0 else 0
    else:
        compliance_rate = 0
        total_docs      = 0
        verified_docs   = 0

    # ── 3. QR Scans Today ─────────────────────────────────────────────────────
    today_start     = _now().replace(hour=0, minute=0, second=0, microsecond=0)
    scans_today     = db.scan_jobs.count_documents({
        "clientOrgId": my_oid,
        "scannedAt": {"$gte": today_start},
    })

    # Compare to yesterday for trend
    yesterday_start = today_start - timedelta(days=1)
    scans_yesterday = db.scan_jobs.count_documents({
        "clientOrgId": my_oid,
        "scannedAt": {"$gte": yesterday_start, "$lt": today_start},
    })
    scan_diff = scans_today - scans_yesterday

    # ── 4. Expiring Docs (within 30 days) ─────────────────────────────────────
    in_30_days   = _now() + timedelta(days=30)
    expiring_docs = db.compliance_documents.count_documents({
        "orgId": {"$in": all_provider_ids} if all_provider_ids else {"$in": []},
        "status": {"$in": ["verified", "pending_review"]},
        "expiryDate": {"$gte": _now(), "$lte": in_30_days},
    })

    return jsonify({
        "activeProviders": {
            "value":        active_providers,
            "newThisMonth": new_this_month,
            "trend":        f"+{new_this_month}" if new_this_month > 0 else "0",
            "trendUp":      new_this_month > 0,
            "sub":          f"{new_this_month} onboarded this month",
        },
        "complianceRate": {
            "value":        f"{compliance_rate}%",
            "target":       90,
            "totalDocs":    total_docs,
            "verifiedDocs": verified_docs,
            "trend":        f"{compliance_rate - 90}%" if compliance_rate < 90 else f"+{compliance_rate - 90}%",
            "trendUp":      compliance_rate >= 90,
            "sub":          "Target 90%",
        },
        "qrScansToday": {
            "value":     scans_today,
            "yesterday": scans_yesterday,
            "trend":     f"+{scan_diff}" if scan_diff >= 0 else str(scan_diff),
            "trendUp":   scan_diff >= 0,
            "sub":       f"{abs(scan_diff)} {'more' if scan_diff >= 0 else 'fewer'} than yesterday",
        },
        "expiringDocs": {
            "value":      expiring_docs,
            "withinDays": 30,
            "trend":      "!" if expiring_docs > 0 else "✓",
            "trendUp":    expiring_docs == 0,
            "sub":        "Within next 30 days",
        },
    })


# ══════════════════════════════════════════════════════════════════════════════
#  GET /api/client/dashboard/scan-chart
#  Grouped bar chart data: QR-verified vs Photo/Manual scans per quarter.
#  Query param: period = "year" | "month" | "week" | "day"  (default: "year")
#
#  Response shape:
#  {
#    "groups": [
#      { "label": "2024 Q1", "qrVerified": 38, "manual": 16 },
#      ...
#    ],
#    "period": "year"
#  }
# ══════════════════════════════════════════════════════════════════════════════
@bp.get("/scan-chart")
@require_role(*CLIENT_ROLES)
def scan_chart():
    db     = get_db()
    my_oid = _oid(g.user["orgId"])
    period = request.args.get("period", "year")

    now = _now()

    # Determine window and grouping based on period
    if period == "day":
        # Last 24 h, grouped by hour
        since = now - timedelta(hours=24)
        jobs  = list(db.scan_jobs.find({
            "clientOrgId": my_oid,
            "scannedAt": {"$gte": since},
        }, {"scannedAt": 1, "status": 1, "result": 1}))

        buckets = defaultdict(lambda: {"qrVerified": 0, "manual": 0})
        for j in jobs:
            ts = j.get("scannedAt")
            if not ts:
                continue
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
            label = ts.strftime("%-Hh")          # e.g. "14h"
            if j.get("status") == "verified":
                buckets[label]["qrVerified"] += 1
            else:
                buckets[label]["manual"] += 1

        # Build ordered list for last 24 hours
        groups = []
        for h in range(24):
            t   = (now - timedelta(hours=23 - h))
            lbl = t.strftime("%-Hh")
            groups.append({"label": lbl, **buckets[lbl]})

    elif period == "week":
        # Last 7 days, grouped by day
        since = now - timedelta(days=7)
        jobs  = list(db.scan_jobs.find({
            "clientOrgId": my_oid,
            "scannedAt": {"$gte": since},
        }, {"scannedAt": 1, "status": 1}))

        buckets = defaultdict(lambda: {"qrVerified": 0, "manual": 0})
        for j in jobs:
            ts = j.get("scannedAt")
            if not ts:
                continue
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
            label = ts.strftime("%a")             # Mon, Tue …
            if j.get("status") == "verified":
                buckets[label]["qrVerified"] += 1
            else:
                buckets[label]["manual"] += 1

        groups = []
        for d in range(7):
            t   = now - timedelta(days=6 - d)
            lbl = t.strftime("%a")
            groups.append({"label": lbl, **buckets[lbl]})

    elif period == "month":
        # Last 30 days, grouped by week-of-month
        since = now - timedelta(days=30)
        jobs  = list(db.scan_jobs.find({
            "clientOrgId": my_oid,
            "scannedAt": {"$gte": since},
        }, {"scannedAt": 1, "status": 1}))

        buckets = defaultdict(lambda: {"qrVerified": 0, "manual": 0})
        for j in jobs:
            ts = j.get("scannedAt")
            if not ts:
                continue
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
            # week number within the 30-day window
            days_ago = (now - ts).days
            week_num = (29 - days_ago) // 7 + 1   # 1 = oldest, 4 = newest
            label    = f"Wk {week_num}"
            if j.get("status") == "verified":
                buckets[label]["qrVerified"] += 1
            else:
                buckets[label]["manual"] += 1

        groups = [{"label": f"Wk {w}", **buckets[f"Wk {w}"]} for w in range(1, 5)]

    else:
        # Default: "year" — last 8 quarters grouped by calendar quarter
        since = now - timedelta(days=365 * 2)
        jobs  = list(db.scan_jobs.find({
            "clientOrgId": my_oid,
            "scannedAt": {"$gte": since},
        }, {"scannedAt": 1, "status": 1}))

        buckets = defaultdict(lambda: {"qrVerified": 0, "manual": 0})
        for j in jobs:
            ts = j.get("scannedAt")
            if not ts:
                continue
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
            q     = (ts.month - 1) // 3 + 1
            label = f"{ts.year} Q{q}"
            if j.get("status") == "verified":
                buckets[label]["qrVerified"] += 1
            else:
                buckets[label]["manual"] += 1

        # Build last 8 quarters in order
        quarter_labels = []
        cur = now
        for _ in range(8):
            q = (cur.month - 1) // 3 + 1
            quarter_labels.append(f"{cur.year} Q{q}")
            # step back one quarter
            if cur.month <= 3:
                cur = cur.replace(year=cur.year - 1, month=10)
            elif cur.month <= 6:
                cur = cur.replace(month=1)
            elif cur.month <= 9:
                cur = cur.replace(month=4)
            else:
                cur = cur.replace(month=7)
        quarter_labels.reverse()

        groups = [{"label": lbl, **buckets[lbl]} for lbl in quarter_labels]

    return jsonify({"groups": groups, "period": period})


# ══════════════════════════════════════════════════════════════════════════════
#  GET /api/client/dashboard/provider-ranking
#  Providers ranked by number of verified/completed jobs for this client org.
#  Query param: limit (default 7)
#
#  Response shape:
#  {
#    "rankings": [
#      { "rank": 1, "orgId": "...", "name": "CleanTech", "jobCount": 127,
#        "label": "127 jobs", "isTop": true },
#      ...
#    ]
#  }
# ══════════════════════════════════════════════════════════════════════════════
@bp.get("/provider-ranking")
@require_role(*CLIENT_ROLES)
def provider_ranking():
    db     = get_db()
    my_oid = _oid(g.user["orgId"])
    limit  = min(int(request.args.get("limit", 7)), 20)

    pipeline = [
        {"$match": {
            "clientOrgId": my_oid,
            "status": {"$in": ["completed", "in_progress", "accepted"]},
        }},
        {"$group": {
            "_id":   "$providerOrgId",
            "count": {"$sum": 1},
        }},
        {"$sort": {"count": -1}},
        {"$limit": limit},
    ]
    agg = list(db.service_requests.aggregate(pipeline))

    rankings = []
    top_n    = max(3, limit // 2)          # top half get the "top" badge
    for i, row in enumerate(agg):
        org = db.organizations.find_one({"_id": row["_id"]}, {"name": 1})
        rankings.append({
            "rank":     i + 1,
            "orgId":    str(row["_id"]),
            "name":     org["name"] if org else str(row["_id"]),
            "jobCount": row["count"],
            "label":    f"{row['count']} job{'s' if row['count'] != 1 else ''}",
            "isTop":    i < top_n,
        })

    return jsonify({"rankings": rankings})


# ══════════════════════════════════════════════════════════════════════════════
#  GET /api/client/dashboard/recent-scans
#  The "Recent QR Scans" table at the bottom of the dashboard.
#  Returns the 12 most recent scan_jobs for this client org, newest first.
#  Query param: limit (default 12, max 50)
#
#  Response shape:
#  {
#    "scans": [
#      {
#        "scanJobId":    "...",
#        "site":         "Site A – Lahore HQ",
#        "provider":     "CleanTech Solutions",
#        "time":         "2m ago",
#        "status":       "Verified",       # "Verified" | "Mismatch" | "Failed" | "Pending"
#        "statusClass":  "verified",       # css key for the frontend badge
#        "scanType":     "qr"              # "qr" | "manual"
#      },
#      ...
#    ]
#  }
# ══════════════════════════════════════════════════════════════════════════════
@bp.get("/recent-scans")
@require_role(*CLIENT_ROLES)
def recent_scans():
    db     = get_db()
    my_oid = _oid(g.user["orgId"])
    limit  = min(int(request.args.get("limit", 12)), 50)

    jobs = list(
        db.scan_jobs
        .find({"clientOrgId": my_oid})
        .sort("scannedAt", -1)
        .limit(limit)
    )

    # Status → frontend display label + badge class
    STATUS_MAP = {
        "verified":    ("Verified",    "verified"),
        "completed":   ("Verified",    "verified"),
        "failed":      ("Mismatch",    "warn"),
        "pending":     ("Pending",     "gray"),
        "in_progress": ("In Progress", "gray"),
    }

    out = []
    for j in jobs:
        raw_status        = j.get("status", "")
        display, css_class = STATUS_MAP.get(raw_status, ("Unknown", "gray"))

        # Resolve site label
        site_label = j.get("location", "")
        if not site_label and j.get("siteLocationId"):
            site       = db.site_locations.find_one(
                {"_id": j["siteLocationId"]}, {"label": 1}
            )
            site_label = site["label"] if site else ""

        # Resolve provider org name
        provider_name = ""
        if j.get("providerOrgId"):
            org           = db.organizations.find_one(
                {"_id": j["providerOrgId"]}, {"name": 1}
            )
            provider_name = org["name"] if org else ""

        # Determine scan type: booking QR scans have completedAt,
        # site-arrival QR scans have startedAt, anything else is "manual"
        if j.get("completedAt") or j.get("startedAt"):
            scan_type = "qr"
        else:
            scan_type = "manual"

        out.append({
            "scanJobId":   str(j["_id"]),
            "site":        site_label or "Unknown site",
            "provider":    provider_name or "Unknown provider",
            "time":        _relative_time(j.get("scannedAt")),
            "status":      display,
            "statusClass": css_class,
            "scanType":    scan_type,
        })

    return jsonify({"scans": out})