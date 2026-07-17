"""
service_request_routes.py  –  Backend for ServiceRequest.jsx wizard

Endpoints
─────────
GET  /api/service-request/providers     Step 0 – connected provider orgs for partner dropdown
GET  /api/service-request/client-staff  Step 2 – client staff for verifier list
GET  /api/service-request/sites         Step 1 – client's own site location chips
POST /api/service-request/submit        Final submit – creates booking + PO + QR

Register in app.py:
    from routes.service_request_routes import bp as service_request_bp
    app.register_blueprint(service_request_bp)
"""

import random
from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from flask import Blueprint, request, jsonify, g

from db import get_db
from auth import require_role
from qr import generate_token, make_qr_data_url
from utils.audit import write_audit
from services.compliance import is_provider_blocked

bp = Blueprint("service_request", __name__, url_prefix="/api/service-request")


def _err(code, msg, status):
    return jsonify({"error": {"code": code, "message": msg}}), status


def _po_number():
    return f"PO-{random.randint(1_000_000_000, 9_999_999_999)}"


# ── Step 0: load connected provider orgs ─────────────────────────────────────

@bp.get("/providers")
@require_role("org_admin")
def list_providers():
    """
    Returns all provider orgs that are connected to the logged-in client org.
    The frontend uses this to populate the partner card / dropdown on Step 0.

    Connection = a b2b_connections doc where clientOrgId == this org
    and status == "active" (or similar). Falls back to all providers if
    no connections collection exists yet.
    """
    db = get_db()
    client_org_id = g.user["orgId"]

    # Find all active (connected) B2B connections for this org — bidirectional.
    # We check both org1Id and org2Id because the client may have been either
    # the initiator or the acceptor of the connection.
    # Only "connected" status is shown — pending/disconnected orgs are excluded
    # because the user should only request services from confirmed partners.
    connections = list(db.b2b_connections.find({
        "$or": [
            {"org1Id": client_org_id},
            {"org2Id": client_org_id},
        ],
        "status": "connected",
    }))

    if connections:
        # Extract the *other* org's id from each connection
        partner_ids = []
        for c in connections:
            if c.get("org1Id") == client_org_id:
                partner_ids.append(c["org2Id"])
            else:
                partner_ids.append(c["org1Id"])

        providers = list(db.organizations.find({
            "_id": {"$in": partner_ids},
            "type": "provider",
            "status": "approved",   # Only admin-approved providers are bookable
        }))
    else:
        # No connections yet — return empty list so the UI shows a clear
        # "no connected partners" state rather than a confusing all-orgs dump.
        providers = []

    result = []
    for p in providers:
        # Check compliance status
        blocked, reason = is_provider_blocked(p["_id"])
        initials = "".join(w[0].upper() for w in (p.get("name") or "?").split()[:2])
        result.append({
            "id":           str(p["_id"]),
            "name":         p.get("name", "Unknown"),
            "industry":     p.get("industry", ""),
            "serviceType":  p.get("serviceType", ""),
            "city":         p.get("city", ""),
            "initials":     initials,
            "complianceOk": not blocked,
            "complianceNote": reason or "Compliance verified",
        })

    return jsonify({"providers": result})


# ── Step 2: load client staff for verifier list ───────────────────────────────

@bp.get("/client-staff")
@require_role("org_admin")
def list_client_staff():
    """
    Returns all active client_staff and compliance_officer users
    belonging to the logged-in client org.
    The frontend uses this to populate the verifier radio list on Step 2.
    These are the people who will scan the QR on the service date to
    confirm the work was completed.
    """
    db = get_db()
    staff_list = list(db.users.find({
        "orgId": g.user["orgId"],
        "role": {"$in": ["client_staff", "compliance_officer"]},
        "isActive": {"$ne": False},
    }).sort("fullName", 1))

    result = []
    for s in staff_list:
        name = s.get("fullName") or s.get("email") or "Staff"
        initials = "".join(w[0].upper() for w in name.split()[:2])
        role_label = "Compliance Officer" if s.get("role") == "compliance_officer" else "Client Staff"
        result.append({
            "id":       str(s["_id"]),
            "fullName": name,
            "email":    s.get("email", ""),
            "initials": initials,
            "role":     role_label,
        })

    return jsonify({"staff": result})


# ── Step 1: load client's site locations ─────────────────────────────────────

@bp.get("/sites")
@require_role("org_admin")
def list_sites():
    """
    Returns the client org's site locations for the map chip selector on Step 1.
    Already exists at GET /api/locations but duplicated here for the wizard's
    dedicated namespace so the frontend import stays clean.
    """
    db = get_db()
    sites = list(db.site_locations.find({
        "orgId": g.user["orgId"],
        "isActive": {"$ne": False},
    }).sort("label", 1))

    return jsonify({
        "sites": [
            {"id": str(s["_id"]), "label": s.get("label", ""), "address": s.get("address", "")}
            for s in sites
        ]
    })


# ── Final submit ──────────────────────────────────────────────────────────────

@bp.post("/submit")
@require_role("org_admin")
def submit_request():
    """
    POST /api/service-request/submit
    Called when the user clicks "Send Request" on Step 3 (Review).

    Body:
    {
      providerOrgId:   string,        // Step 0
      serviceType:     string,        // Step 0
      description:     string,        // Step 0  (optional)
      siteLocationId:  string,        // Step 1  (one of client's sites)
      manualAddress:   string,        // Step 1  (optional free-text address)
      scheduledDate:   string,        // Step 2  ISO date e.g. "2026-06-01"
      amount:          number,        // Step 2  budget
      assignedStaffId: string,        // Step 2  verifier (provider staff id)
      priority:        string         // optional, default "medium"
    }

    Returns: { requestId, poId, poNumber, bookingToken, bookingQrPng }
    """
    data = request.get_json(silent=True) or {}

    required = ["providerOrgId", "serviceType", "assignedStaffId", "amount"]
    missing = [k for k in required if not data.get(k)]
    if missing:
        return _err("BAD_REQUEST", f"Required fields missing: {', '.join(missing)}", 400)

    # At least one location signal is required: a saved site, manual address, or pin coords
    has_location = (
        data.get("siteLocationId") or
        (data.get("manualAddress") or "").strip() or
        (data.get("pinLat") is not None and data.get("pinLng") is not None)
    )
    if not has_location:
        return _err("BAD_REQUEST", "A location is required (saved site, address, or map pin)", 400)

    db = get_db()
    client_org_id = g.user["orgId"]

    # Validate provider
    try:
        provider_id = ObjectId(data["providerOrgId"])
    except (InvalidId, TypeError):
        return _err("BAD_REQUEST", "Invalid providerOrgId", 400)

    provider = db.organizations.find_one({"_id": provider_id, "type": "provider", "status": "approved"})
    if not provider:
        return _err("NOT_FOUND", "Provider org not found", 404)

    # Validate site (optional — user may have used map pin or manual address instead)
    site = None
    site_id = None
    if data.get("siteLocationId"):
        try:
            site_id = ObjectId(data["siteLocationId"])
        except (InvalidId, TypeError):
            return _err("BAD_REQUEST", "Invalid siteLocationId", 400)
        site = db.site_locations.find_one({"_id": site_id, "orgId": client_org_id})
        if not site:
            return _err("NOT_FOUND", "Site location not found for your org", 404)

    # Validate staff
    try:
        staff_id = ObjectId(data["assignedStaffId"])
    except (InvalidId, TypeError):
        return _err("BAD_REQUEST", "Invalid assignedStaffId", 400)

    staff = db.users.find_one({
        "_id": staff_id,
        "orgId": client_org_id,
        "role": {"$in": ["client_staff", "compliance_officer"]},
    })
    if not staff:
        return _err("NOT_FOUND", "Assigned verifier not found in your org", 404)

    # Block submission if provider org is not admin-approved
    if provider.get("status") != "approved":
        return _err("PROVIDER_NOT_APPROVED",
                    "This provider organization has not been approved by the platform admin yet.", 403)

    # Compliance check — provider documents must be verified and not expired
    blocked, reason = is_provider_blocked(provider_id)
    if blocked:
        return _err("COMPLIANCE_EXPIRED", reason or "Provider compliance documents are invalid or expired", 409)
    # Amount
    try:
        amount = float(data["amount"])
        tax_rate = float(data.get("taxRate", 0.0))
    except (TypeError, ValueError):
        return _err("BAD_REQUEST", "amount must be a number", 400)

    tax_amount = round(amount * tax_rate, 2)
    total = round(amount + tax_amount, 2)

    # Scheduled date
    scheduled = data.get("scheduledDate")
    try:
        scheduled_dt = datetime.fromisoformat(scheduled) if scheduled else None
        if scheduled_dt and scheduled_dt.tzinfo is None:
            scheduled_dt = scheduled_dt.replace(tzinfo=timezone.utc)
    except Exception:
        return _err("BAD_REQUEST", "scheduledDate must be a valid date (YYYY-MM-DD)", 400)

    # Build location string
    location_parts = []
    if site and site.get("label"):
        location_parts.append(site["label"])
    if data.get("manualAddress", "").strip():
        location_parts.append(data["manualAddress"].strip())
    elif data.get("pinLat") is not None and data.get("pinLng") is not None:
        location_parts.append(f"{data['pinLat']:.5f}, {data['pinLng']:.5f}")
    location_str = " — ".join(location_parts) if location_parts else ""

    now = datetime.now(timezone.utc)

    # Create service_request
    sr_doc = {
        "clientOrgId":     client_org_id,
        "providerOrgId":   provider_id,
        "requestedBy":     g.user["_id"],
        "assignedStaffId": staff_id,
        "siteLocationId":  site_id if site else None,
        "serviceType":     data["serviceType"],
        "description":     data.get("description", ""),
        "location":        location_str,
        "manualAddress":   data.get("manualAddress", ""),
        "status":          "pending",
        "priority":        data.get("priority", "medium"),
        "createdAt":       now,
        "updatedAt":       now,
    }
    if scheduled_dt:
        sr_doc["scheduledDate"] = scheduled_dt

    sr_id = db.service_requests.insert_one(sr_doc).inserted_id

    # Create purchase_order
    booking_token = generate_token()
    po_number = _po_number()
    po_doc = {
        "requestId":    sr_id,
        "poNumber":     po_number,
        "amount":       amount,
        "taxRate":      tax_rate,
        "taxAmount":    tax_amount,
        "totalAmount":  total,
        "status":       "issued",
        "issuedAt":     now,
        "bookingToken": booking_token,
    }
    po_id = db.purchase_orders.insert_one(po_doc).inserted_id

    write_audit(
        org_id=client_org_id,
        user_id=g.user["_id"],
        action="created",
        entity="service_request",
        entity_id=sr_id,
        description=f"Service request submitted → {po_number}",
        metadata={
            "providerOrgId": str(provider_id),
            "providerName":  provider.get("name", ""),
            "serviceType":   data["serviceType"],
            "poNumber":      po_number,
        },
    )

    return jsonify({
        "requestId":    str(sr_id),
        "poId":         str(po_id),
        "poNumber":     po_number,
        "bookingToken": booking_token,
        "bookingQrPng": make_qr_data_url(booking_token),
        "providerName": provider.get("name", ""),
    }), 201