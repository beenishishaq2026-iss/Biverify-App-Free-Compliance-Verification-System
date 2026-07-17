from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from flask import Blueprint, g, jsonify, request

from utils.audit import write_audit
from auth import require_role
from db import get_db

bp = Blueprint("compliance_ops", __name__, url_prefix="/api/compliance-ops")


# ── helpers ──────────────────────────────────────────────────────────────────

def _err(code, msg, status):
    return jsonify({"error": {"code": code, "message": msg}}), status


def _serialize_job(sr, po, provider_org):
    """
    Combine a service_request + purchase_order + provider_org into the
    shape ComplianceOperations.jsx expects.

    Status mapping (DB  →  UI):
      accepted    → pending
      in_progress → in-progress
      completed   → completed
    """
    status_map = {
        "accepted":    {"status": "pending",     "label": "Pending"},
        "in_progress": {"status": "in-progress", "label": "In Progress"},
        "completed":   {"status": "completed",   "label": "Completed"},
        "cancelled":   {"status": "cancelled",   "label": "Cancelled"},
    }
    raw = sr.get("status", "accepted")
    mapped = status_map.get(raw, {"status": raw, "label": raw.capitalize()})

    result = {
        "id":           str(sr["_id"]),
        "serviceType":  sr.get("serviceType", ""),
        "description":  sr.get("description", ""),
        "location":     sr.get("location", ""),
        "status":       mapped["status"],
        "label":        mapped["label"],
        "rawStatus":    raw,
        "priority":     sr.get("priority", "medium"),
        "scheduledDate": sr["scheduledDate"].isoformat() if sr.get("scheduledDate") else None,
        "createdAt":    sr["createdAt"].isoformat() if sr.get("createdAt") else None,
        "providerOrgId": str(sr.get("providerOrgId", "")),
        "clientOrgId":   str(sr.get("clientOrgId", "")),
    }

    # Provider info
    if provider_org:
        result["provider"] = provider_org.get("name", "Unknown")
        result["providerServiceType"] = provider_org.get("serviceType", "")
    else:
        result["provider"] = "Unknown"
        result["providerServiceType"] = ""

    # Purchase order info
    if po:
        result["poNumber"]   = po.get("poNumber", "")
        result["poId"]       = str(po["_id"])
        result["amount"]     = po.get("amount")
        result["taxRate"]    = po.get("taxRate", 0.0)
        result["taxAmount"]  = po.get("taxAmount")
        result["totalAmount"] = po.get("totalAmount")
        result["poStatus"]   = po.get("status", "issued")
        result["bookingToken"] = po.get("bookingToken", "")
    else:
        result["poNumber"]    = ""
        result["poId"]        = None
        result["bookingToken"] = ""

    return result


# ══════════════════════════════════════════════════════════════════════════════
# GET /api/compliance-ops/jobs
# ══════════════════════════════════════════════════════════════════════════════

@bp.get("/jobs")
@require_role("client_staff", "compliance_officer", "org_admin")
def list_jobs():
    """
    Returns all service_requests where assignedStaffId == logged-in user.
    These are the verification jobs shown in the "Assigned Verifications" table.

    Query params (all optional):
      status  – filter by UI status: pending | in-progress | completed
      limit   – default 50
      skip    – default 0
    """
    db = get_db()
    user_id = g.user["_id"]

    # Build mongo filter
    mongo_filter = {"assignedStaffId": user_id}

    status_param = request.args.get("status", "").strip()
    # Map UI status values back to DB values for filtering
    status_db_map = {
        "pending":     "accepted",
        "in-progress": "in_progress",
        "completed":   "completed",
    }
    if status_param and status_param in status_db_map:
        mongo_filter["status"] = status_db_map[status_param]
    else:
        # Default: show active jobs only (exclude cancelled)
        mongo_filter["status"] = {"$in": ["accepted", "in_progress", "completed"]}

    try:
        limit = int(request.args.get("limit", 50))
        skip  = int(request.args.get("skip", 0))
    except (TypeError, ValueError):
        limit, skip = 50, 0

    cursor = (
        db.service_requests
        .find(mongo_filter)
        .sort("createdAt", -1)
        .skip(skip)
        .limit(limit)
    )

    jobs = []
    for sr in cursor:
        po           = db.purchase_orders.find_one({"requestId": sr["_id"]})
        provider_org = db.organizations.find_one({"_id": sr.get("providerOrgId")}) if sr.get("providerOrgId") else None
        jobs.append(_serialize_job(sr, po, provider_org))

    total = db.service_requests.count_documents(mongo_filter)

    return jsonify({"jobs": jobs, "total": total})


# ══════════════════════════════════════════════════════════════════════════════
# GET /api/compliance-ops/stats
# ══════════════════════════════════════════════════════════════════════════════

@bp.get("/stats")
@require_role("client_staff", "compliance_officer", "org_admin")
def get_stats():
    """
    Returns KPI data for the three cards on ComplianceOperations.jsx:
      - Total PO Value         (sum of po.totalAmount for assigned jobs)
      - Total Tax Generated    (sum of po.taxAmount)
      - Completed Jobs         (count of completed service_requests)

    Scope: only jobs assigned to the logged-in client_staff user.
    """
    db = get_db()
    user_id = g.user["_id"]

    # All service_requests assigned to this user (non-cancelled)
    all_assigned = list(db.service_requests.find({
        "assignedStaffId": user_id,
        "status": {"$in": ["accepted", "in_progress", "completed"]},
    }))

    sr_ids = [sr["_id"] for sr in all_assigned]

    # Pull POs for all those requests in one query
    pos = list(db.purchase_orders.find({"requestId": {"$in": sr_ids}})) if sr_ids else []
    po_by_request = {po["requestId"]: po for po in pos}

    total_po_value  = 0.0
    total_tax       = 0.0
    completed_count = 0

    for sr in all_assigned:
        po = po_by_request.get(sr["_id"])
        if po:
            total_po_value += po.get("totalAmount") or 0.0
            total_tax      += po.get("taxAmount")   or 0.0
        if sr.get("status") == "completed":
            completed_count += 1

    return jsonify({
        "totalPOValue":       round(total_po_value, 2),
        "totalTaxGenerated":  round(total_tax, 2),
        "completedJobs":      completed_count,
        "totalAssigned":      len(all_assigned),
    })


# ══════════════════════════════════════════════════════════════════════════════
# POST /api/compliance-ops/jobs/<id>/start
# ══════════════════════════════════════════════════════════════════════════════

@bp.post("/jobs/<job_id>/start")
@require_role("client_staff", "compliance_officer", "org_admin")
def start_job(job_id):
    """
    Transition a service_request from 'accepted' → 'in_progress'.
    Called when the client staff marks a job as started manually
    (alternative to the site-QR scan flow if not using QR).

    Body: {} (no body required)
    Returns: { ok: true, jobId, status: "in_progress", updatedAt }
    """
    db = get_db()

    try:
        sr_id = ObjectId(job_id)
    except (InvalidId, TypeError):
        return _err("BAD_REQUEST", "Invalid job id", 400)

    sr = db.service_requests.find_one({
        "_id": sr_id,
        "assignedStaffId": g.user["_id"],
    })
    if not sr:
        return _err("NOT_FOUND", "Job not found or not assigned to you", 404)

    if sr.get("status") != "accepted":
        return _err("CONFLICT", f"Job is already '{sr.get('status')}'; can only start a pending job", 409)

    now = datetime.now(timezone.utc)
    db.service_requests.update_one(
        {"_id": sr_id},
        {"$set": {"status": "in_progress", "updatedAt": now}},
    )

    write_audit(
        org_id=g.user["orgId"],
        user_id=g.user["_id"],
        action="updated",
        entity="service_request",
        entity_id=sr_id,
        description="Compliance job started by assigned staff",
        metadata={"newStatus": "in_progress"},
    )

    return jsonify({"ok": True, "jobId": job_id, "status": "in_progress", "updatedAt": now.isoformat()})


# ══════════════════════════════════════════════════════════════════════════════
# POST /api/compliance-ops/jobs/<id>/complete
# ══════════════════════════════════════════════════════════════════════════════

@bp.post("/jobs/<job_id>/complete")
@require_role("client_staff", "compliance_officer", "org_admin")
def complete_job(job_id):
    """
    Transition a service_request from 'in_progress' → 'completed'
    and mark the linked purchase_order as 'paid'.

    This is the manual-completion path. The QR-scan path in scan_routes.py
    also completes jobs but goes through verify_booking_scan().

    Body: { notes?: string }
    Returns: { ok: true, jobId, poNumber, status: "completed", completedAt }
    """
    db = get_db()
    data = request.get_json(silent=True) or {}

    try:
        sr_id = ObjectId(job_id)
    except (InvalidId, TypeError):
        return _err("BAD_REQUEST", "Invalid job id", 400)

    sr = db.service_requests.find_one({
        "_id": sr_id,
        "assignedStaffId": g.user["_id"],
    })
    if not sr:
        return _err("NOT_FOUND", "Job not found or not assigned to you", 404)

    if sr.get("status") == "completed":
        return _err("CONFLICT", "Job is already completed", 409)

    if sr.get("status") not in ("accepted", "in_progress"):
        return _err("CONFLICT", f"Cannot complete a job with status '{sr.get('status')}'", 409)

    now = datetime.now(timezone.utc)

    # Update service_request
    update_fields = {"status": "completed", "updatedAt": now}
    if data.get("notes"):
        update_fields["notes"] = data["notes"]

    db.service_requests.update_one({"_id": sr_id}, {"$set": update_fields})

    # Update linked PO → paid
    po = db.purchase_orders.find_one({"requestId": sr_id})
    po_number = None
    if po:
        po_number = po.get("poNumber")
        db.purchase_orders.update_one(
            {"_id": po["_id"]},
            {"$set": {"status": "paid", "paidAt": now}},
        )

    write_audit(
        org_id=g.user["orgId"],
        user_id=g.user["_id"],
        action="updated",
        entity="service_request",
        entity_id=sr_id,
        description=f"Compliance job completed by assigned staff ({po_number or 'no PO'})",
        metadata={"newStatus": "completed", "poNumber": po_number},
    )

    return jsonify({
        "ok": True,
        "jobId":       job_id,
        "poNumber":    po_number,
        "status":      "completed",
        "completedAt": now.isoformat(),
    })