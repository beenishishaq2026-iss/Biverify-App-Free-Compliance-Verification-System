"""
BiVerify — demo seed for the QR flow.

Run AFTER setup_db.py. It:
  1. Sets a real bcrypt password ("password123") on three seeded users.
  2. Marks goodme's seeded insurance doc as verified + not expired
     (so the provider isn't blocked by compliance checks).
  3. Creates one site_location for the client org "Asset Owner Corp".
  4. Creates one booking (service_request + purchase_order with bookingToken)
     assigning Shawn (provider_staff @ goodme) to that site.
  5. Prints the credentials and the URLs/IDs you need.

Idempotent: re-running re-uses existing rows where possible.

Usage:
  cd server_python
  python seed_demo.py
"""

from datetime import datetime, timezone, timedelta
import secrets
import bcrypt
from db import get_db

DEMO_PASSWORD = "password123"

db = get_db()
now = datetime.now(timezone.utc)


def set_password(email):
    h = bcrypt.hashpw(DEMO_PASSWORD.encode(), bcrypt.gensalt()).decode()
    res = db.users.update_one({"email": email}, {"$set": {"passwordHash": h, "isActive": True}})
    print(f"  user {email}: {'updated' if res.modified_count else 'no change (already set?)'}")


def main():
    print("\n[1/4] Setting demo passwords (all = 'password123')")
    for email in [
        "ao@assetowner.co.za",       # org_admin, client
        "compliance@assetowner.co.za",  # compliance_officer, client
        "shawn@goodme.co.za",        # provider_staff
        "provider@biverify.com",      # org_admin, provider
    ]:
        set_password(email)

    print("\n[2/4] Marking goodme insurance as verified + valid")
    goodme = db.organizations.find_one({"subdomain": "goodme"})
    if not goodme:
        print("  ! goodme org not found — did you run setup_db.py?")
        return
    db.compliance_documents.update_many(
        {"orgId": goodme["_id"]},
        {"$set": {
            "status": "verified",
            "expiryDate": now + timedelta(days=365),
        }},
    )
    print("  ok")

    print("\n[3/4] Ensuring a site_location for Asset Owner Corp")
    client_org = db.organizations.find_one({"subdomain": "assetowner"})
    site = db.site_locations.find_one({"orgId": client_org["_id"], "label": "West Wing"})
    if site:
        print(f"  reused existing site: {site['_id']}")
    else:
        site_token = secrets.token_urlsafe(16)
        site_id = db.site_locations.insert_one({
            "orgId": client_org["_id"],
            "label": "West Wing",
            "siteToken": site_token,
            "isActive": True,
            "createdAt": now,
        }).inserted_id
        site = db.site_locations.find_one({"_id": site_id})
        print(f"  created site: {site_id}")

    print("\n[4/4] Ensuring a demo booking assigned to Shawn")
    shawn = db.users.find_one({"email": "shawn@goodme.co.za"})
    ao_admin = db.users.find_one({"email": "ao@assetowner.co.za"})

    sr = db.service_requests.find_one({
        "clientOrgId": client_org["_id"],
        "providerOrgId": goodme["_id"],
        "assignedStaffId": shawn["_id"],
        "siteLocationId": site["_id"],
        "status": {"$in": ["accepted", "in_progress"]},
    })
    if sr:
        print(f"  reused existing booking: {sr['_id']}")
    else:
        sr_id = db.service_requests.insert_one({
            "clientOrgId": client_org["_id"],
            "providerOrgId": goodme["_id"],
            "requestedBy": ao_admin["_id"],
            "assignedStaffId": shawn["_id"],
            "siteLocationId": site["_id"],
            "serviceType": "Cleaning Services",
            "description": "Demo booking for QR flow",
            "location": site["label"],
            "status": "accepted",
            "priority": "medium",
            "scheduledDate": now,
            "createdAt": now,
            "updatedAt": now,
        }).inserted_id
        sr = db.service_requests.find_one({"_id": sr_id})
        print(f"  created booking: {sr_id}")

    po = db.purchase_orders.find_one({"requestId": sr["_id"]})
    if po and po.get("bookingToken"):
        print(f"  reused PO: {po['poNumber']}")
    else:
        booking_token = secrets.token_urlsafe(16)
        po_doc = {
            "requestId": sr["_id"],
            "poNumber": f"PO-{secrets.randbelow(9_000_000_000) + 1_000_000_000}",
            "amount": 50.0, "taxRate": 0.10, "taxAmount": 5.0, "totalAmount": 55.0,
            "status": "issued", "issuedAt": now, "bookingToken": booking_token,
        }
        if po:
            db.purchase_orders.update_one({"_id": po["_id"]}, {"$set": po_doc})
        else:
            db.purchase_orders.insert_one(po_doc)
        po = db.purchase_orders.find_one({"requestId": sr["_id"]})
        print(f"  created PO: {po['poNumber']}")

    print("\n══════════ DEMO READY ══════════")
    print(f"  Login (all use password '{DEMO_PASSWORD}'):")
    print(f"    Provider admin   →  provider@biverify.com")
    print(f"    Provider staff   →  shawn@goodme.co.za")
    print(f"    Client org admin →  ao@assetowner.co.za")
    print(f"    Compliance off.  →  compliance@assetowner.co.za")
    print()
    print(f"  Site QR token  : {site['siteToken']}")
    print(f"  Booking token  : {po['bookingToken']}")
    print(f"  PO number      : {po['poNumber']}")
    print(f"  Booking id     : {sr['_id']}")
    print()
    print("  Render the QRs as PNGs (or just paste the tokens manually):")
    print("    GET  http://localhost:5000/api/locations/<site_id>/qr.png  (auth as ao@…)")
    print("    GET  http://localhost:5000/api/bookings/<booking_id>/qr.png (auth as shawn@…)")
    print("════════════════════════════════\n")


if __name__ == "__main__":
    main()
