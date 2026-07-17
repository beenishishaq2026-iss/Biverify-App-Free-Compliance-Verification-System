from datetime import datetime, timezone
from bson import ObjectId
from db import get_db
from services.compliance import is_provider_blocked


class VerifyError(Exception):
    def __init__(self, code: str, message: str, status: int = 400):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status


def _now():
    return datetime.now(timezone.utc)


def verify_site_scan(*, site_token: str, request_id: str, user):
    """
    Provider staff scans the static site QR. Validates assignment,
    location match, and provider compliance, then transitions the
    scan_jobs row to in_progress.
    Returns the scan_jobs document.
    """
    db = get_db()

    site = db.site_locations.find_one({"siteToken": site_token, "isActive": True})
    if not site:
        raise VerifyError("SITE_QR_INVALID", "Unknown or inactive site QR", 404)

    try:
        sr_oid = ObjectId(request_id)
    except Exception:
        raise VerifyError("BOOKING_NOT_FOUND", "Invalid booking id", 400)

    sr = db.service_requests.find_one({"_id": sr_oid})
    if not sr:
        raise VerifyError("BOOKING_NOT_FOUND", "Booking not found", 404)

    if sr.get("assignedProviderStaffId") != user["_id"]:
        raise VerifyError("NOT_ASSIGNED", "This job is not assigned to you", 403)

    if sr.get("status") not in ("accepted", "in_progress", "pending"):
        raise VerifyError("BOOKING_NOT_FOUND", f"Booking is {sr.get('status')}", 409)

    sr_site = sr.get("siteLocationId")
    qr_site = site["_id"]
    print(f"Verifying site scan: sr_site={sr_site}, qr_site={qr_site}")
    if sr_site and sr_site != qr_site:
        raise VerifyError("LOCATION_MISMATCH", "Site QR does not match this booking's location", 409)
    
    blocked, reason = is_provider_blocked(sr["providerOrgId"])
    if blocked:
        raise VerifyError("COMPLIANCE_EXPIRED", reason or "Provider compliance is not valid", 409)

    po = db.purchase_orders.find_one({"requestId": sr["_id"]})
    if not po:
        raise VerifyError("BOOKING_NOT_FOUND", "No purchase order issued for this booking", 409)

    now = _now()

    # Upsert one scan_jobs row per requestId.
    existing = db.scan_jobs.find_one({"requestId": sr["_id"]})
    if existing and existing.get("status") in ("in_progress", "completed"):
        return existing

    job_doc = {
        "requestId": sr["_id"],
        "poId": po["_id"],
        "scannedBy": user["_id"],
        "providerOrgId": sr["providerOrgId"],
        "clientOrgId": sr["clientOrgId"],
        "assignedStaffId": user["_id"],
        "siteLocationId": site["_id"],
        "qrPayload": site_token,
        "status": "in_progress",
        "scannedAt": now,
        "startedAt": now,
        "startedBy": user["_id"],
        "location": site.get("label", ""),
    }

    if existing:
        db.scan_jobs.update_one({"_id": existing["_id"]}, {"$set": job_doc})
        job_doc["_id"] = existing["_id"]
    else:
        ins = db.scan_jobs.insert_one(job_doc)
        job_doc["_id"] = ins.inserted_id

    db.service_requests.update_one(
        {"_id": sr["_id"]},
        {"$set": {"status": "in_progress", "updatedAt": now}},
    )
    return job_doc


def verify_booking_scan(*, booking_token: str, user):
    """
    Client staff (or org_admin of the client org) scans the booking QR
    shown on the provider's phone. Validates the job was started, then
    closes it out.
    Returns the scan_jobs document.
    """
    db = get_db()

    po = db.purchase_orders.find_one({"bookingToken": booking_token})
    if not po:
        raise VerifyError("BOOKING_QR_INVALID", "Unknown booking QR", 404)

    sr = db.service_requests.find_one({"_id": po["requestId"]})
    if not sr:
        raise VerifyError("BOOKING_NOT_FOUND", "Linked booking missing", 404)

    if user["orgId"] != sr["clientOrgId"]:
        raise VerifyError("FORBIDDEN", "You can only verify your own org's bookings", 403)

    job = db.scan_jobs.find_one({"requestId": sr["_id"]})
    if not job or job.get("status") != "in_progress":
        raise VerifyError("NOT_STARTED", "Provider has not started this job yet", 409)

    if job.get("status") == "completed":
        raise VerifyError("ALREADY_COMPLETED", "Job already completed", 409)

    now = _now()
    db.scan_jobs.update_one(
        {"_id": job["_id"]},
        {"$set": {
            "status": "completed",
            "completedAt": now,
            "completedBy": user["_id"],
        }},
    )
    db.service_requests.update_one(
        {"_id": sr["_id"]},
        {"$set": {"status": "completed", "updatedAt": now}},
    )
    db.purchase_orders.update_one(
        {"_id": po["_id"]},
        {"$set": {"status": "issued"}},  # leave PO at issued; payment is out of scope
    )
    job["status"] = "completed"
    job["completedAt"] = now
    job["completedBy"] = user["_id"]
    job["poNumber"] = po["poNumber"]
    return job
