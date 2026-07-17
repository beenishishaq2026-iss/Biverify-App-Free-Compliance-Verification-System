from flask import Blueprint, request, jsonify, g
from db import get_db
from auth import require_role
from services.verification import verify_site_scan, verify_booking_scan, VerifyError
from utils.audit import write_audit

bp = Blueprint("scan", __name__, url_prefix="/api/scan")


def _err(code, msg, status):
    return jsonify({"error": {"code": code, "message": msg}}), status


@bp.post("/site")
@require_role("provider_staff")
def scan_site():
    data = request.get_json(silent=True) or {}
    token = data.get("siteToken")
    request_id = data.get("requestId")
    if not token or not request_id:
        return _err("BAD_REQUEST", "siteToken and requestId required", 400)

    try:
        job = verify_site_scan(site_token=token, request_id=request_id, user=g.user)
    except VerifyError as e:
        write_audit(
            org_id=g.user["orgId"], user_id=g.user["_id"],
            action="scanned", entity="scan_job",
            description=f"Site scan failed: {e.code}",
            metadata={"code": e.code, "requestId": request_id},
        )
        return _err(e.code, e.message, e.status)

    write_audit(
        org_id=g.user["orgId"], user_id=g.user["_id"],
        action="scanned", entity="scan_job", entity_id=job["_id"],
        description="Site scan: arrival verified",
    )
    return jsonify({
        "ok": True,
        "jobId": str(job["_id"]),
        "startedAt": job["startedAt"].isoformat(),
        "siteLabel": job.get("location", ""),
    })


@bp.post("/booking")
@require_role("client_staff", "org_admin", "compliance_officer")
def scan_booking():
    data = request.get_json(silent=True) or {}
    token = data.get("bookingToken")
    if not token:
        return _err("BAD_REQUEST", "bookingToken required", 400)

    try:
        job = verify_booking_scan(booking_token=token, user=g.user)
    except VerifyError as e:
        write_audit(
            org_id=g.user["orgId"], user_id=g.user["_id"],
            action="scanned", entity="scan_job",
            description=f"Booking scan failed: {e.code}",
            metadata={"code": e.code},
        )
        return _err(e.code, e.message, e.status)

    write_audit(
        org_id=g.user["orgId"], user_id=g.user["_id"],
        action="scanned", entity="scan_job", entity_id=job["_id"],
        description=f"Booking scan: completion verified ({job.get('poNumber')})",
    )
    return jsonify({
        "ok": True,
        "jobId": str(job["_id"]),
        "completedAt": job["completedAt"].isoformat(),
        "poNumber": job.get("poNumber"),
    })


@bp.get("/jobs")
@require_role("provider_staff")
def my_jobs():
    db = get_db()
    cur = db.service_requests.find({
        "assignedProviderStaffId": g.user["_id"],
        "status": {"$in": ["accepted", "pending"]},
    }).sort("scheduledDate", 1)

    out = []
    for sr in cur:
        po = db.purchase_orders.find_one({"requestId": sr["_id"]})
        site = db.site_locations.find_one({"_id": sr.get("siteLocationId")}) if sr.get("siteLocationId") else None
        client = db.organizations.find_one({"_id": sr["clientOrgId"]})
        out.append({
            "requestId": str(sr["_id"]),
            "serviceType": sr.get("serviceType"),
            "description": sr.get("description"),
            "status": sr.get("status"),
            "scheduledDate": sr["scheduledDate"].isoformat() if sr.get("scheduledDate") else None,
            "clientName": client.get("name") if client else "",
            "siteLabel": site.get("label") if site else "",
            "poNumber": po.get("poNumber") if po else None,
        })
    return jsonify(out)
