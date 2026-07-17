import random
from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from flask import Blueprint, request, jsonify, g, Response

from db import get_db
from auth import require_role, require_auth
from qr import generate_token, make_qr_png, make_qr_data_url
from utils.audit import write_audit
from services.compliance import is_provider_blocked

bp = Blueprint("bookings", __name__, url_prefix="/api/bookings")


# ── helpers ──────────────────────────────────────────────────────────────────

def _err(code, msg, status):
    return jsonify({"error": {"code": code, "message": msg}}), status


def _po_number():
    return f"PO-{random.randint(1_000_000_000, 9_999_999_999)}"


def _oid(val, field):
    try:
        return ObjectId(val)
    except (InvalidId, TypeError):
        raise ValueError(f"Invalid {field}")


def _serialize_booking(sr, po=None, provider_org=None):
    """
    Combine a service_request doc + optional purchase_order doc into the
    shape the frontend expects.
    """
    status_map = {
        "pending":     {"status": "pending",     "label": "Pending"},
        "accepted":    {"status": "accepted",    "label": "Accepted"},
        "in_progress": {"status": "inprogress",  "label": "In Progress"},
        "completed":   {"status": "completed",   "label": "Completed"},
        "cancelled":   {"status": "cancelled",   "label": "Cancelled"},
        "rejected":    {"status": "rejected",    "label": "Rejected"},
    }
    raw_status = sr.get("status", "pending")
    mapped = status_map.get(raw_status, {"status": raw_status, "label": raw_status.replace("_", " ").capitalize()})

    result = {
        "id":           str(sr["_id"]),
        "service":      sr.get("serviceType", ""),
        "description":  sr.get("description", ""),
        "location":     sr.get("location", ""),
        "status":       mapped["status"],
        "label":        mapped["label"],
        "rawStatus":    raw_status,
        "priority":     sr.get("priority", "medium"),
        "providerOrgId":  str(sr.get("providerOrgId", "")),
        "clientOrgId":    str(sr.get("clientOrgId", "")),
        "assignedStaffId": str(sr.get("assignedStaffId", "")) if sr.get("assignedStaffId") else None,
        "siteLocationId":  str(sr.get("siteLocationId", "")) if sr.get("siteLocationId") else None,
        "createdAt":    sr["createdAt"].isoformat() if sr.get("createdAt") else None,
        "updatedAt":    sr["updatedAt"].isoformat() if sr.get("updatedAt") else None,
        "scheduledDate": sr["scheduledDate"].isoformat() if sr.get("scheduledDate") else None,
    }

    if po:
        result["po"] = po.get("poNumber", "")
        result["poId"] = str(po["_id"])
        result["amount"] = po.get("amount")
        result["taxRate"] = po.get("taxRate")
        result["taxAmount"] = po.get("taxAmount")
        result["totalAmount"] = po.get("totalAmount")
        result["poStatus"] = po.get("status", "issued")
    else:
        result["po"] = ""
        result["poId"] = None

    if provider_org:
        result["partner"] = provider_org.get("name", "Unknown")
        result["partnerIndustry"] = provider_org.get("industry", "")
    else:
        result["partner"] = "Unknown"

    # Format date for the table (e.g. "02 Mar 2026")
    if sr.get("scheduledDate"):
        result["date"] = sr["scheduledDate"].strftime("%d %b %Y")
    elif sr.get("createdAt"):
        result["date"] = sr["createdAt"].strftime("%d %b %Y")
    else:
        result["date"] = ""

    return result


def _fetch_bookings_for_org(org_id, filters=None):
    """
    Return a list of enriched booking dicts for a given client org.
    filters: dict with optional keys status, search, limit, skip
    """
    db = get_db()
    filters = filters or {}

    query = {"clientOrgId": org_id}

    # Filter by status (frontend status label)
    status_reverse = {
        "pending":    "pending",
        "accepted":   "accepted",
        "inprogress": "in_progress",
        "completed":  "completed",
        "cancelled":  "cancelled",
        "rejected":   "rejected",
    }
    if filters.get("status") and filters["status"] != "all":
        raw = status_reverse.get(filters["status"])
        if raw:
            query["status"] = raw

    # Text search across serviceType and description
    if filters.get("search"):
        import re
        pattern = re.compile(re.escape(filters["search"]), re.IGNORECASE)
        query["$or"] = [
            {"serviceType": {"$regex": pattern}},
            {"description": {"$regex": pattern}},
        ]

    skip = int(filters.get("skip", 0))
    limit = int(filters.get("limit", 50))

    cursor = (
        db.service_requests.find(query)
        .sort("createdAt", -1)
        .skip(skip)
        .limit(limit)
    )
    requests_list = list(cursor)
    total = db.service_requests.count_documents(query)

    if not requests_list:
        return [], total

    # Bulk-fetch purchase orders
    sr_ids = [sr["_id"] for sr in requests_list]
    po_map = {
        po["requestId"]: po
        for po in db.purchase_orders.find({"requestId": {"$in": sr_ids}})
    }

    # Bulk-fetch provider orgs
    provider_ids = list({sr["providerOrgId"] for sr in requests_list if sr.get("providerOrgId")})
    org_map = {
        org["_id"]: org
        for org in db.organizations.find({"_id": {"$in": provider_ids}})
    }

    results = []
    for sr in requests_list:
        po = po_map.get(sr["_id"])
        provider_org = org_map.get(sr.get("providerOrgId"))
        results.append(_serialize_booking(sr, po, provider_org))

    return results, total


# ── routes ───────────────────────────────────────────────────────────────────

@bp.get("")
@require_role("org_admin")
def list_bookings():
    """
    GET /api/bookings
    Query params: status, search, limit, skip
    Returns the client org's bookings, enriched with PO and partner name.
    """
    org_id = g.user["orgId"]
    filters = {
        "status": request.args.get("status", "all"),
        "search": request.args.get("search", "").strip(),
        "limit":  request.args.get("limit", 50),
        "skip":   request.args.get("skip", 0),
    }
    items, total = _fetch_bookings_for_org(org_id, filters)
    return jsonify({"bookings": items, "total": total})


@bp.get("/stats")
@require_role("org_admin")
def booking_stats():
    """
    GET /api/bookings/stats
    Returns KPI counts + percentages for the 4 dashboard cards.
    """
    db = get_db()
    org_id = g.user["orgId"]

    pipeline = [
        {"$match": {"clientOrgId": org_id}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
    ]
    raw = list(db.service_requests.aggregate(pipeline))

    counts = {row["_id"]: row["count"] for row in raw}
    total = sum(counts.values()) or 1  # avoid division by zero

    # Map DB statuses → frontend buckets
    unassigned = counts.get("accepted", 0)       # 'accepted' = awaiting action
    in_progress = counts.get("in_progress", 0)
    completed   = counts.get("completed", 0)
    # 'need_more_info' is a possible status; merge cancelled + need_info for display
    need_info   = counts.get("need_more_info", 0) + counts.get("cancelled", 0)

    def pct(n):
        return f"{round((n / total) * 100)}%"

    return jsonify({
        "total": total,
        "kpis": [
            {
                "label": "Unassigned",
                "value": pct(unassigned),
                "count": unassigned,
                "icon": "unassigned",
                "warn": True,
                "sub": "Awaiting assignment",
            },
            {
                "label": "In Process",
                "value": pct(in_progress),
                "count": in_progress,
                "icon": "process",
                "warn": False,
                "sub": "Actively being handled",
            },
            {
                "label": "Need More Info",
                "value": pct(need_info),
                "count": need_info,
                "icon": "info",
                "warn": True,
                "sub": "Requires clarification",
            },
            {
                "label": "Completed",
                "value": pct(completed),
                "count": completed,
                "icon": "check",
                "warn": False,
                "sub": "Successfully closed",
            },
        ],
    })


@bp.get("/<booking_id>")
@require_role("org_admin", "provider_staff")
def get_booking(booking_id):
    """
    GET /api/bookings/<id>
    Full detail for a single booking, including PO and provider org name.
    """
    db = get_db()
    try:
        sr_oid = ObjectId(booking_id)
    except InvalidId:
        return _err("BAD_REQUEST", "Invalid booking id", 400)

    sr = db.service_requests.find_one({"_id": sr_oid})
    if not sr:
        return _err("NOT_FOUND", "Booking not found", 404)

    # Authorization check
    role = g.user["role"]
    if role == "org_admin" and sr["clientOrgId"] != g.user["orgId"]:
        return _err("FORBIDDEN", "Not your booking", 403)
    if role == "provider_staff" and sr.get("assignedStaffId") != g.user["_id"]:
        return _err("FORBIDDEN", "Not assigned to you", 403)

    po = db.purchase_orders.find_one({"requestId": sr_oid})
    provider_org = db.organizations.find_one({"_id": sr.get("providerOrgId")}) if sr.get("providerOrgId") else None

    return jsonify({"booking": _serialize_booking(sr, po, provider_org)})


@bp.post("")
@require_role("org_admin")
def create_booking():
    """
    POST /api/bookings
    Create a new service booking and issue a PO + QR token.
    Body: {providerOrgId, serviceType, description?, scheduledDate?,
           siteLocationId, assignedStaffId, amount, taxRate?, priority?}
    """
    data = request.get_json(silent=True) or {}
    required = ["providerOrgId", "serviceType", "siteLocationId", "assignedStaffId", "amount"]
    if any(data.get(k) in (None, "") for k in required):
        return _err("BAD_REQUEST", f"Required: {', '.join(required)}", 400)

    db = get_db()
    try:
        provider_id = _oid(data["providerOrgId"], "providerOrgId")
        site_id     = _oid(data["siteLocationId"], "siteLocationId")
        staff_id    = _oid(data["assignedStaffId"], "assignedStaffId")
    except ValueError as e:
        return _err("BAD_REQUEST", str(e), 400)

    client_org_id = g.user["orgId"]

    site = db.site_locations.find_one({"_id": site_id, "orgId": client_org_id})
    if not site:
        return _err("NOT_FOUND", "Site location not found for your org", 404)

    provider = db.organizations.find_one({"_id": provider_id, "type": "provider"})
    if not provider:
        return _err("NOT_FOUND", "Provider org not found", 404)

    staff = db.users.find_one({"_id": staff_id, "orgId": provider_id, "role": "provider_staff"})
    if not staff:
        return _err("NOT_FOUND", "Assigned staff not found in provider org", 404)

    blocked, reason = is_provider_blocked(provider_id)
    if blocked:
        return _err("COMPLIANCE_EXPIRED", reason or "Provider compliance invalid", 409)

    try:
        amount   = float(data["amount"])
        tax_rate = float(data.get("taxRate", 0.0))
    except (TypeError, ValueError):
        return _err("BAD_REQUEST", "amount and taxRate must be numbers", 400)

    tax_amount = round(amount * tax_rate, 2)
    total      = round(amount + tax_amount, 2)

    scheduled = data.get("scheduledDate")
    try:
        scheduled_dt = datetime.fromisoformat(scheduled.replace("Z", "+00:00")) if scheduled else None
    except Exception:
        return _err("BAD_REQUEST", "scheduledDate must be ISO 8601", 400)

    now = datetime.now(timezone.utc)
    sr_doc = {
        "clientOrgId":    client_org_id,
        "providerOrgId":  provider_id,
        "requestedBy":    g.user["_id"],
        "assignedStaffId":staff_id,
        "siteLocationId": site_id,
        "serviceType":    data["serviceType"],
        "description":    data.get("description", ""),
        "location":       site.get("label", ""),
        "status":         "accepted",
        "priority":       data.get("priority", "medium"),
        "createdAt":      now,
        "updatedAt":      now,
    }
    if scheduled_dt:
        sr_doc["scheduledDate"] = scheduled_dt

    sr_id = db.service_requests.insert_one(sr_doc).inserted_id

    booking_token = generate_token()
    po_doc = {
        "requestId":   sr_id,
        "poNumber":    _po_number(),
        "amount":      amount,
        "taxRate":     tax_rate,
        "taxAmount":   tax_amount,
        "totalAmount": total,
        "status":      "issued",
        "issuedAt":    now,
        "bookingToken":booking_token,
    }
    po_id = db.purchase_orders.insert_one(po_doc).inserted_id

    write_audit(
        org_id=client_org_id, user_id=g.user["_id"],
        action="created", entity="service_request", entity_id=sr_id,
        description=f"Booking created → {po_doc['poNumber']}",
        metadata={"providerOrgId": str(provider_id), "poNumber": po_doc["poNumber"]},
    )

    return jsonify({
        "requestId":    str(sr_id),
        "poId":         str(po_id),
        "poNumber":     po_doc["poNumber"],
        "bookingToken": booking_token,
        "bookingQrPng": make_qr_data_url(booking_token),
    }), 201


@bp.patch("/<booking_id>/cancel")
@require_role("org_admin")
def cancel_booking(booking_id):
    """
    PATCH /api/bookings/<id>/cancel
    Client org admin cancels a booking (only if status is 'accepted' / pending).
    """
    db = get_db()
    try:
        sr_oid = ObjectId(booking_id)
    except InvalidId:
        return _err("BAD_REQUEST", "Invalid booking id", 400)

    sr = db.service_requests.find_one({"_id": sr_oid, "clientOrgId": g.user["orgId"]})
    if not sr:
        return _err("NOT_FOUND", "Booking not found", 404)

    if sr["status"] not in ("accepted", "pending"):
        return _err(
            "CONFLICT",
            f"Cannot cancel a booking with status '{sr['status']}'",
            409,
        )

    now = datetime.now(timezone.utc)
    db.service_requests.update_one(
        {"_id": sr_oid},
        {"$set": {"status": "cancelled", "updatedAt": now}},
    )
    # Also mark the PO as void
    db.purchase_orders.update_one(
        {"requestId": sr_oid},
        {"$set": {"status": "cancelled", "updatedAt": now}},
    )

    write_audit(
        org_id=g.user["orgId"], user_id=g.user["_id"],
        action="deleted", entity="service_request", entity_id=sr_oid,
        description="Booking cancelled by client admin",
    )

    return jsonify({"ok": True, "message": "Booking cancelled"})


@bp.get("/<booking_id>/qr.png")
@require_role("org_admin", "provider_staff")
def booking_qr(booking_id):
    """
    GET /api/bookings/<id>/qr.png
    Download the booking QR as a PNG image.
    """
    db = get_db()
    try:
        sr_oid = ObjectId(booking_id)
    except InvalidId:
        return _err("BAD_REQUEST", "Invalid id", 400)

    sr = db.service_requests.find_one({"_id": sr_oid})
    if not sr:
        return _err("NOT_FOUND", "Booking not found", 404)

    role = g.user["role"]
    if role == "org_admin" and sr["clientOrgId"] != g.user["orgId"]:
        return _err("FORBIDDEN", "Not your booking", 403)
    if role == "provider_staff" and sr.get("assignedProviderStaffId") != g.user["_id"]:
        return _err("FORBIDDEN", "Not assigned to you", 403)

    po = db.purchase_orders.find_one({"requestId": sr_oid})
    if not po or not po.get("bookingToken"):
        return _err("NOT_FOUND", "No booking QR for this booking", 404)

    return Response(make_qr_png(po["bookingToken"]), mimetype="image/png")