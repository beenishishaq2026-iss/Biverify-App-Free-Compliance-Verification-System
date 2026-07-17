"""
routes/b2b_routes.py
────────────────────────────────────────────────────────────────────────────
B2B Connection routes for BiVerify.

Endpoints
─────────
SHARED
  GET    /api/b2b/connections          – list own connections (with filters)
  GET    /api/b2b/discover             – search/browse orgs to connect with
  POST   /api/b2b/connections          – send a connection request
  DELETE /api/b2b/connections/<id>     – disconnect / withdraw a pending request
  GET    /api/b2b/requests             – incoming pending requests for this org
  POST   /api/b2b/requests/<id>/accept – accept a connection request
  POST   /api/b2b/requests/<id>/reject – reject a connection request
  GET    /api/b2b/connections/<id>     – get a single connection detail
  GET    /api/b2b/stats                – summary counts for the dashboard stat strip

Roles allowed
─────────────
  org_admin          – can send requests, disconnect, view
  provider_admin     – can accept / reject incoming requests, send requests, view
  compliance_officer – read-only access (GET endpoints only)
"""

from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from flask import Blueprint, g, jsonify, request

from utils.audit import write_audit
from auth import require_auth, require_role
from db import get_db

bp = Blueprint("b2b", __name__, url_prefix="/api/b2b")


# ─── helpers ──────────────────────────────────────────────────────────────────

def _err(code: str, msg: str, status: int):
    return jsonify({"error": {"code": code, "message": msg}}), status


def _oid(val, field: str) -> ObjectId:
    """Parse a string into an ObjectId, raising ValueError on bad input."""
    try:
        return ObjectId(val)
    except (InvalidId, TypeError):
        raise ValueError(f"Invalid {field}")


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _serialize_connection(conn: dict, viewer_org_id: ObjectId, db) -> dict:
    """
    Return a JSON-safe dict for a b2b_connection document.
    Enriches with the *other* org's public info relative to viewer_org_id.
    """
    is_initiator = conn["org1Id"] == viewer_org_id
    other_org_id = conn["org2Id"] if is_initiator else conn["org1Id"]
    other_org = db.organizations.find_one(
        {"_id": other_org_id},
        {"name": 1, "industry": 1, "type": 1, "logoUrl": 1, "adminEmail": 1},  # ← fixed: was contactEmail
    ) or {}

    return {
        "id":          str(conn["_id"]),
        "status":      conn.get("status"),
        "direction":   "outgoing" if is_initiator else "incoming",
        "createdAt":   conn["createdAt"].isoformat() if conn.get("createdAt") else None,
        "connectedAt": conn["connectedAt"].isoformat() if conn.get("connectedAt") else None,
        "notes":       conn.get("notes"),
        "partner": {
            "id":         str(other_org_id),
            "name":       other_org.get("name"),
            "industry":   other_org.get("industry"),
            "type":       other_org.get("type"),
            "logoUrl":    other_org.get("logoUrl"),
            "adminEmail": other_org.get("adminEmail"),  # ← fixed: was contactEmail
        },
    }


# ─── shared: stats ────────────────────────────────────────────────────────────

@bp.get("/stats")
@require_auth
def get_stats():
    """
    Dashboard stat strip: returns counts for the calling org.
    Accessible to: org_admin, provider_admin, compliance_officer
    """
    allowed = {"org_admin", "provider_admin", "compliance_officer", "super_admin"}
    if g.user.get("role") not in allowed:
        return _err("FORBIDDEN", "Insufficient role", 403)

    db = get_db()
    org_id = g.user["orgId"]

    pipeline = [
        {
            "$match": {
                "$or": [{"org1Id": org_id}, {"org2Id": org_id}],
            }
        },
        {
            "$group": {
                "_id": "$status",
                "count": {"$sum": 1},
            }
        },
    ]

    counts = {row["_id"]: row["count"] for row in db.b2b_connections.aggregate(pipeline)}

    return jsonify({
        "connected":    counts.get("connected", 0),
        "pending":      counts.get("pending", 0),
        "disconnected": counts.get("disconnected", 0),
        "blocked":      counts.get("blocked", 0),
        "total":        sum(counts.values()),
    })


# ─── shared: single connection detail ─────────────────────────────────────────

@bp.get("/connections/<connection_id>")
@require_auth
def get_connection(connection_id: str):
    """Fetch a single connection. Caller must be a member of one of the two orgs."""
    try:
        conn_oid = _oid(connection_id, "connectionId")
    except ValueError as e:
        return _err("BAD_REQUEST", str(e), 400)

    db = get_db()
    conn = db.b2b_connections.find_one({"_id": conn_oid})
    if not conn:
        return _err("NOT_FOUND", "Connection not found", 404)

    org_id = g.user["orgId"]
    if org_id not in (conn["org1Id"], conn["org2Id"]):
        return _err("FORBIDDEN", "Not a member of this connection", 403)

    return jsonify(_serialize_connection(conn, org_id, db))


# ─── list own connections ──────────────────────────────────────────────────────

@bp.get("/connections")
@require_role("org_admin", "provider_admin", "compliance_officer", "super_admin")
def list_connections():
    """
    Returns all connections for the calling org.

    Query params:
      status   – filter by status (connected | pending | disconnected | blocked)
      search   – partial match on partner org name (case-insensitive)
      page     – 1-based page number (default 1)
      per_page – results per page (default 20, max 100)
    """
    db = get_db()
    org_id = g.user["orgId"]

    status_filter = request.args.get("status", "").strip()
    search        = request.args.get("search", "").strip()
    page          = max(1, int(request.args.get("page", 1)))
    per_page      = min(100, max(1, int(request.args.get("per_page", 20))))

    match: dict = {"$or": [{"org1Id": org_id}, {"org2Id": org_id}]}
    if status_filter:
        match["status"] = status_filter

    total = db.b2b_connections.count_documents(match)
    cursor = (
        db.b2b_connections.find(match)
        .sort("createdAt", -1)
        .skip((page - 1) * per_page)
        .limit(per_page)
    )

    items = [_serialize_connection(c, org_id, db) for c in cursor]

    # Apply in-memory search filter on enriched partner name (post-serialisation).
    if search:
        sl = search.lower()
        items = [i for i in items if sl in (i["partner"].get("name") or "").lower()]

    return jsonify({
        "items":    items,
        "total":    total,
        "page":     page,
        "per_page": per_page,
    })


# ─── discover orgs ────────────────────────────────────────────────────────────

@bp.get("/discover")
@require_role("org_admin", "provider_admin", "super_admin")
def discover_orgs():
    """
    Search/browse organisations that the calling org is not yet connected to
    (or whose connection was disconnected/blocked). Only admin-approved
    organisations are returned regardless of type.

    Query params:
      q        – name search (case-insensitive, partial)
      industry – filter by industry string
      type     – filter by org type: "client" | "provider" (optional)
      page     – 1-based (default 1)
      per_page – default 20, max 50
    """
    db = get_db()
    org_id = g.user["orgId"]

    q        = request.args.get("q", "").strip()
    industry = request.args.get("industry", "").strip()
    type_f   = request.args.get("type", "").strip().lower()
    page     = max(1, int(request.args.get("page", 1)))
    per_page = min(50, max(1, int(request.args.get("per_page", 20))))

    # Orgs already connected or with a pending request – exclude from discovery.
    existing_conns = db.b2b_connections.find(
        {
            "$or": [{"org1Id": org_id}, {"org2Id": org_id}],
            "status": {"$in": ["connected", "pending"]},
        },
        {"org1Id": 1, "org2Id": 1},
    )
    excluded_ids = set()
    excluded_ids.add(org_id)
    for c in existing_conns:
        excluded_ids.add(c["org1Id"])
        excluded_ids.add(c["org2Id"])

    # Build org filter — all orgs must be admin-approved to appear in search
    org_filter: dict = {
        "_id": {"$nin": list(excluded_ids)},
        "status": "approved",
    }

    if type_f == "provider":
        # Explicit provider search: only approved providers
        org_filter["type"] = "provider"
    elif type_f == "client":
        # Explicit client search: only approved clients
        org_filter["type"] = "client"
    # else: no type filter — show all approved orgs (clients + providers)

    if q:
        org_filter["name"] = {"$regex": q, "$options": "i"}
    if industry:
        org_filter["industry"] = {"$regex": industry, "$options": "i"}

    total = db.organizations.count_documents(org_filter)
    orgs = list(
        db.organizations.find(
            org_filter,
            {"name": 1, "industry": 1, "type": 1, "logoUrl": 1, "adminEmail": 1,
             "description": 1, "city": 1, "country": 1},
        )
        .sort("name", 1)
        .skip((page - 1) * per_page)
        .limit(per_page)
    )

    items = [
        {
            "id":           str(p["_id"]),
            "name":         p.get("name"),
            "industry":     p.get("industry"),
            "type":         p.get("type"),
            "logoUrl":      p.get("logoUrl"),
            "adminEmail":   p.get("adminEmail"),   # ← fixed: was contactEmail
            "description":  p.get("description"),
            "city":         p.get("city"),
            "country":      p.get("country"),
        }
        for p in orgs
    ]

    return jsonify({"items": items, "total": total, "page": page, "per_page": per_page})


# ─── send connection request ───────────────────────────────────────────────────

@bp.post("/connections")
@require_role("org_admin", "provider_admin")
def send_connection_request():
    """
    Body: { targetOrgId: string, notes?: string }

    Either org type can initiate a connection request.
    No duplicate active/pending connection allowed.
    """
    data        = request.get_json(silent=True) or {}
    target_id_s = (data.get("targetOrgId") or "").strip()
    notes       = (data.get("notes") or "").strip()[:500]

    if not target_id_s:
        return _err("BAD_REQUEST", "targetOrgId is required", 400)

    try:
        target_oid = _oid(target_id_s, "targetOrgId")
    except ValueError as e:
        return _err("BAD_REQUEST", str(e), 400)

    db     = get_db()
    org_id = g.user["orgId"]

    # Cannot connect to yourself.
    if org_id == target_oid:
        return _err("BAD_REQUEST", "Cannot connect to your own organisation", 400)

    # Validate target org exists.
    target_org = db.organizations.find_one({"_id": target_oid})
    if not target_org:
        return _err("NOT_FOUND", "Organisation not found", 404)

    caller_org = db.organizations.find_one({"_id": org_id}) or {}

    # Check for existing active or pending connection in either direction.
    existing = db.b2b_connections.find_one({
        "$or": [
            {"org1Id": org_id,     "org2Id": target_oid},
            {"org1Id": target_oid, "org2Id": org_id},
        ],
        "status": {"$in": ["connected", "pending"]},
    })
    if existing:
        status = existing.get("status")
        if status == "connected":
            return _err("CONFLICT", "Already connected to this organisation", 409)
        if status == "pending":
            return _err("CONFLICT", "A connection request is already pending", 409)

    # If previously disconnected, update the old record instead of inserting a duplicate.
    stale = db.b2b_connections.find_one({
        "$or": [
            {"org1Id": org_id,     "org2Id": target_oid},
            {"org1Id": target_oid, "org2Id": org_id},
        ],
        "status": {"$in": ["disconnected", "blocked"]},
    })

    now     = _now()
    user_id = g.user["_id"]

    if stale:
        db.b2b_connections.update_one(
            {"_id": stale["_id"]},
            {"$set": {
                "org1Id":      org_id,
                "org2Id":      target_oid,
                "initiatedBy": user_id,
                "status":      "pending",
                "createdAt":   now,
                **({"notes": notes} if notes else {}),
            },
             "$unset": {"connectedAt": ""}},
        )
        conn_id = stale["_id"]
    else:
        doc = {
            "org1Id":      org_id,
            "org2Id":      target_oid,
            "initiatedBy": user_id,
            "status":      "pending",
            "createdAt":   now,
        }
        if notes:
            doc["notes"] = notes
        result  = db.b2b_connections.insert_one(doc)
        conn_id = result.inserted_id

    # Write audit log for both orgs.
    write_audit(
        org_id=org_id, user_id=user_id,
        action="connected", entity="b2b_connection", entity_id=conn_id,
        description=f"Sent B2B connection request to {target_org.get('name')}",
        ip=request.remote_addr,
    )
    write_audit(
        org_id=target_oid, user_id=None,
        action="connected", entity="b2b_connection", entity_id=conn_id,
        description=f"Received B2B connection request from {caller_org.get('name')}",
        ip=request.remote_addr,
    )

    conn = db.b2b_connections.find_one({"_id": conn_id})
    return jsonify(_serialize_connection(conn, org_id, db)), 201


# ─── withdraw / disconnect ─────────────────────────────────────────────────────

@bp.delete("/connections/<connection_id>")
@require_role("org_admin", "provider_admin")
def remove_connection(connection_id: str):
    """
    Withdraw a pending request (caller is initiator) or disconnect an active
    connection (caller is either party).

    Sets status → 'disconnected'; does not hard-delete.
    """
    try:
        conn_oid = _oid(connection_id, "connectionId")
    except ValueError as e:
        return _err("BAD_REQUEST", str(e), 400)

    db     = get_db()
    org_id = g.user["orgId"]

    conn = db.b2b_connections.find_one({"_id": conn_oid})
    if not conn:
        return _err("NOT_FOUND", "Connection not found", 404)

    if org_id not in (conn["org1Id"], conn["org2Id"]):
        return _err("FORBIDDEN", "Not a member of this connection", 403)

    if conn.get("status") == "disconnected":
        return _err("CONFLICT", "Connection is already disconnected", 409)

    # Pending request: only the initiator (org1) can withdraw.
    if conn.get("status") == "pending" and conn["org1Id"] != org_id:
        return _err("FORBIDDEN", "Only the initiator can withdraw a pending request", 403)

    db.b2b_connections.update_one(
        {"_id": conn_oid},
        {"$set": {"status": "disconnected"}},
    )

    other_org_id = conn["org2Id"] if conn["org1Id"] == org_id else conn["org1Id"]
    other_org    = db.organizations.find_one({"_id": other_org_id}, {"name": 1}) or {}
    self_org     = db.organizations.find_one({"_id": org_id}, {"name": 1}) or {}

    write_audit(
        org_id=org_id, user_id=g.user["_id"],
        action="disconnected", entity="b2b_connection", entity_id=conn_oid,
        description=f"Disconnected from {other_org.get('name')}",
        ip=request.remote_addr,
    )
    write_audit(
        org_id=other_org_id, user_id=None,
        action="disconnected", entity="b2b_connection", entity_id=conn_oid,
        description=f"Connection removed by {self_org.get('name', 'partner')}",
        ip=request.remote_addr,
    )

    return jsonify({"ok": True})


# ─── list incoming requests ────────────────────────────────────────────────────

@bp.get("/requests")
@require_role("provider_admin", "org_admin", "super_admin")
def list_incoming_requests():
    """
    Returns pending (incoming) connection requests for the calling org.
    The recipient is always org2 regardless of org type.

    Query params:
      status   – one of pending | connected | disconnected | blocked (default: pending)
      page / per_page
    """
    db     = get_db()
    org_id = g.user["orgId"]

    status_filter = request.args.get("status", "pending").strip()
    page     = max(1, int(request.args.get("page", 1)))
    per_page = min(100, max(1, int(request.args.get("per_page", 20))))

    # The recipient is always org2.
    match: dict = {"org2Id": org_id}
    if status_filter:
        match["status"] = status_filter

    total  = db.b2b_connections.count_documents(match)
    cursor = (
        db.b2b_connections.find(match)
        .sort("createdAt", -1)
        .skip((page - 1) * per_page)
        .limit(per_page)
    )

    items = [_serialize_connection(c, org_id, db) for c in cursor]

    return jsonify({"items": items, "total": total, "page": page, "per_page": per_page})


# ─── accept ───────────────────────────────────────────────────────────────────

@bp.post("/requests/<connection_id>/accept")
@require_role("provider_admin", "org_admin")
def accept_request(connection_id: str):
    """
    Accept a pending incoming connection request.
    Sets status → 'connected' and records connectedAt.
    """
    try:
        conn_oid = _oid(connection_id, "connectionId")
    except ValueError as e:
        return _err("BAD_REQUEST", str(e), 400)

    db     = get_db()
    org_id = g.user["orgId"]

    conn = db.b2b_connections.find_one({"_id": conn_oid})
    if not conn:
        return _err("NOT_FOUND", "Connection request not found", 404)

    # Must be the recipient (org2) to accept.
    if conn["org2Id"] != org_id:
        return _err("FORBIDDEN", "Only the recipient can accept a request", 403)

    if conn.get("status") != "pending":
        return _err("CONFLICT", f"Request is not pending (status: {conn.get('status')})", 409)

    now = _now()
    db.b2b_connections.update_one(
        {"_id": conn_oid},
        {"$set": {"status": "connected", "connectedAt": now}},
    )

    initiator_org = db.organizations.find_one({"_id": conn["org1Id"]}, {"name": 1}) or {}
    acceptor_org  = db.organizations.find_one({"_id": org_id}, {"name": 1}) or {}

    write_audit(
        org_id=org_id, user_id=g.user["_id"],
        action="connected", entity="b2b_connection", entity_id=conn_oid,
        description=f"Accepted B2B connection from {initiator_org.get('name')}",
        ip=request.remote_addr,
    )
    write_audit(
        org_id=conn["org1Id"], user_id=None,
        action="connected", entity="b2b_connection", entity_id=conn_oid,
        description=f"B2B connection accepted by {acceptor_org.get('name')}",
        ip=request.remote_addr,
    )

    conn = db.b2b_connections.find_one({"_id": conn_oid})
    return jsonify(_serialize_connection(conn, org_id, db))


# ─── reject ───────────────────────────────────────────────────────────────────

@bp.post("/requests/<connection_id>/reject")
@require_role("provider_admin", "org_admin")
def reject_request(connection_id: str):
    """
    Reject a pending incoming connection request.
    Sets status → 'disconnected'.

    Body: { reason?: string }   (optional, stored in notes)
    """
    try:
        conn_oid = _oid(connection_id, "connectionId")
    except ValueError as e:
        return _err("BAD_REQUEST", str(e), 400)

    db     = get_db()
    org_id = g.user["orgId"]

    conn = db.b2b_connections.find_one({"_id": conn_oid})
    if not conn:
        return _err("NOT_FOUND", "Connection request not found", 404)

    if conn["org2Id"] != org_id:
        return _err("FORBIDDEN", "Only the recipient can reject a request", 403)

    if conn.get("status") != "pending":
        return _err("CONFLICT", f"Request is not pending (status: {conn.get('status')})", 409)

    data   = request.get_json(silent=True) or {}
    reason = (data.get("reason") or "").strip()[:500]

    update = {"$set": {"status": "disconnected"}}
    if reason:
        update["$set"]["notes"] = reason

    db.b2b_connections.update_one({"_id": conn_oid}, update)

    initiator_org = db.organizations.find_one({"_id": conn["org1Id"]}, {"name": 1}) or {}
    rejector_org  = db.organizations.find_one({"_id": org_id}, {"name": 1}) or {}

    write_audit(
        org_id=org_id, user_id=g.user["_id"],
        action="disconnected", entity="b2b_connection", entity_id=conn_oid,
        description=f"Rejected B2B request from {initiator_org.get('name')}",
        metadata={"reason": reason} if reason else None,
        ip=request.remote_addr,
    )
    write_audit(
        org_id=conn["org1Id"], user_id=None,
        action="disconnected", entity="b2b_connection", entity_id=conn_oid,
        description=f"B2B request rejected by {rejector_org.get('name')}",
        ip=request.remote_addr,
    )

    return jsonify({"ok": True})