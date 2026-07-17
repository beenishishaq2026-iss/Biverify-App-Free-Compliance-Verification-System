"""
BiVerify — MongoDB Atlas Collection Setup
==========================================
Run once to create all collections with:
  - Schema validation (enforces required fields & types)
  - Indexes (speeds up common queries)
  - Sample seed data (so your UI has something to render)

Usage:
  1. Make sure server_python/.env exists with MONGODB_URI=...
  2. pip install pymongo python-dotenv
  3. python setup_db.py
"""

from dotenv import load_dotenv
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.errors import CollectionInvalid
from bson import ObjectId
from datetime import datetime, timezone, timedelta
import os, sys

load_dotenv()

URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("MONGODB_DB", "biverify")

if not URI:
    print("ERROR: MONGODB_URI not set in .env")
    sys.exit(1)

client = MongoClient(URI, serverSelectionTimeoutMS=7000)
db = client[DB_NAME]

# ── helpers ────────────────────────────────────────────────────────────────────

def now():
    return datetime.now(timezone.utc)

def future(days=365):
    return now() + timedelta(days=days)

def past(days=30):
    return now() - timedelta(days=days)

def create_collection(name, validator):
    """Create collection with JSON schema validation. Skip if already exists."""
    try:
        db.create_collection(name, validator={"$jsonSchema": validator})
        print(f"  ✓ Created collection: {name}")
    except CollectionInvalid:
        print(f"  · Already exists:     {name} (skipped)")

def create_index(col_name, keys, **kwargs):
    db[col_name].create_index(keys, **kwargs)


# ══════════════════════════════════════════════════════════════════════════════
#  1. ORGANIZATIONS
# ══════════════════════════════════════════════════════════════════════════════
print("\n── Collections ──────────────────────────────────────────────────────────")

create_collection("organizations", {
    "bsonType": "object",
    "required": ["name", "type", "status", "createdAt"],
    "properties": {
        "name":        {"bsonType": "string",  "description": "Company / org name"},
        "subdomain":   {"bsonType": "string",  "description": "e.g. goodme (for goodme.biverify.com)"},
        "type":        {"bsonType": "string",  "enum": ["provider", "client"],     "description": "Org role"},
        "status":      {"bsonType": "string",  "enum": ["pending", "approved", "rejected", "suspended"]},
        "regNumber":   {"bsonType": "string"},
        "address":     {"bsonType": "string"},
        "city":        {"bsonType": "string"},
        "country":     {"bsonType": "string"},
        "website":     {"bsonType": "string"},
        "industry":    {"bsonType": "string",  "description": "Client: industry type"},
        "serviceType": {"bsonType": "string",  "description": "Provider: service category"},
        "licenseNumber": {"bsonType": "string"},
        "adminEmail":  {"bsonType": "string",  "description": "Primary admin contact"},
        "teamMembers": {
            "bsonType": "array",
            "description": "Embedded small team (use users collection for full list)",
            "items": {
                "bsonType": "object",
                "required": ["userId", "role"],
                "properties": {
                    "userId": {"bsonType": "objectId"},
                    "role":   {"bsonType": "string"}
                }
            }
        },
        "createdAt":   {"bsonType": "date"},
        "approvedAt":  {"bsonType": "date"},
        "updatedAt":   {"bsonType": "date"},
    }
})

# ── indexes
create_index("organizations", [("subdomain", ASCENDING)],  unique=True, sparse=True, name="idx_org_subdomain")
create_index("organizations", [("type",   ASCENDING), ("status", ASCENDING)], name="idx_org_type_status")
create_index("organizations", [("adminEmail", ASCENDING)], sparse=True, name="idx_org_admin_email")


# ══════════════════════════════════════════════════════════════════════════════
#  2. USERS
# ══════════════════════════════════════════════════════════════════════════════
create_collection("users", {
    "bsonType": "object",
    "required": ["orgId", "fullName", "email", "passwordHash", "role", "createdAt"],
    "properties": {
        "orgId":        {"bsonType": "objectId", "description": "FK → organizations"},
        "fullName":     {"bsonType": "string"},
        "email":        {"bsonType": "string"},
        "passwordHash": {"bsonType": "string"},
        "role":         {"bsonType": "string",
                         "enum": ["super_admin", "org_admin", "provider_staff",
                                  "compliance_officer", "client_staff"]},
        "phone":        {"bsonType": "string"},
        "department":   {"bsonType": "string"},
        "contactRole":  {"bsonType": "string", "description": "Job title"},
        "isActive":     {"bsonType": "bool"},
        "lastLoginAt":  {"bsonType": "date"},
        "createdAt":    {"bsonType": "date"},
    }
})

create_index("users", [("email", ASCENDING)], unique=True, name="idx_user_email")
create_index("users", [("orgId", ASCENDING), ("role", ASCENDING)], name="idx_user_org_role")


# ══════════════════════════════════════════════════════════════════════════════
#  3. COMPLIANCE DOCUMENTS
# ══════════════════════════════════════════════════════════════════════════════
create_collection("compliance_documents", {
    "bsonType": "object",
    "required": ["orgId", "type", "status", "uploadedAt", "uploadedBy"],
    "properties": {
        "orgId":        {"bsonType": "objectId", "description": "FK → organizations (provider)"},
        "type":         {"bsonType": "string",
                         "enum": ["insurance", "license", "certificate",
                                  "tax_clearance", "health_safety", "other"]},
        "label":        {"bsonType": "string",  "description": "Custom display name"},
        "fileName":     {"bsonType": "string"},
        "fileUrl":      {"bsonType": "string",  "description": "Storage path / S3 URL"},
        "status":       {"bsonType": "string",
                         "enum": ["pending_review", "verified", "rejected", "expired"]},
        "expiryDate":   {"bsonType": "date"},
        "uploadedAt":   {"bsonType": "date"},
        "uploadedBy":   {"bsonType": "objectId", "description": "FK → users"},
        "reviewNotes":  {"bsonType": "string"},
        "reviewedBy":   {"bsonType": "objectId", "description": "FK → users (admin/compliance)"},
        "reviewedAt":   {"bsonType": "date"},
    }
})

create_index("compliance_documents", [("orgId", ASCENDING), ("status", ASCENDING)], name="idx_doc_org_status")
create_index("compliance_documents", [("expiryDate", ASCENDING)], name="idx_doc_expiry")
create_index("compliance_documents", [("type", ASCENDING)],       name="idx_doc_type")


# ══════════════════════════════════════════════════════════════════════════════
#  4. SERVICE REQUESTS
# ══════════════════════════════════════════════════════════════════════════════
create_collection("service_requests", {
    "bsonType": "object",
    "required": ["clientOrgId", "providerOrgId", "serviceType", "status", "createdAt", "requestedBy"],
    "properties": {
        "clientOrgId":   {"bsonType": "objectId", "description": "FK → organizations (client)"},
        "providerOrgId": {"bsonType": "objectId", "description": "FK → organizations (provider)"},
        "requestedBy":   {"bsonType": "objectId", "description": "FK → users"},
        "assignedStaffId": {"bsonType": "objectId", "description": "FK → users (provider_staff who will perform the job)"},
        "siteLocationId": {"bsonType": "objectId", "description": "FK → site_locations"},
        "serviceType":   {"bsonType": "string"},
        "description":   {"bsonType": "string"},
        "location":      {"bsonType": "string"},
        "scheduledDate": {"bsonType": "date"},
        "status":        {"bsonType": "string",
                          "enum": ["pending", "accepted", "rejected",
                                   "in_progress", "completed", "cancelled"]},
        "priority":      {"bsonType": "string",  "enum": ["low", "medium", "high"]},
        "notes":         {"bsonType": "string"},
        "createdAt":     {"bsonType": "date"},
        "updatedAt":     {"bsonType": "date"},
    }
})

create_index("service_requests", [("clientOrgId", ASCENDING),   ("status", ASCENDING)], name="idx_sr_client")
create_index("service_requests", [("providerOrgId", ASCENDING), ("status", ASCENDING)], name="idx_sr_provider")
create_index("service_requests", [("scheduledDate", ASCENDING)], name="idx_sr_scheduled")


# ══════════════════════════════════════════════════════════════════════════════
#  5. PURCHASE ORDERS
# ══════════════════════════════════════════════════════════════════════════════
create_collection("purchase_orders", {
    "bsonType": "object",
    "required": ["requestId", "poNumber", "amount", "status", "issuedAt"],
    "properties": {
        "requestId":   {"bsonType": "objectId", "description": "FK → service_requests"},
        "poNumber":    {"bsonType": "string",   "description": "e.g. PO-3956128047"},
        "amount":      {"bsonType": "double",   "description": "Pre-tax total"},
        "taxRate":     {"bsonType": "double",   "description": "e.g. 0.10 for 10%"},
        "taxAmount":   {"bsonType": "double"},
        "totalAmount": {"bsonType": "double",   "description": "amount + taxAmount"},
        "status":      {"bsonType": "string",
                        "enum": ["draft", "issued", "paid", "cancelled"]},
        "issuedAt":    {"bsonType": "date"},
        "paidAt":      {"bsonType": "date"},
        "notes":       {"bsonType": "string"},
        "bookingToken": {"bsonType": "string", "description": "Random opaque token; encoded in the booking QR"},
    }
})

create_index("purchase_orders", [("bookingToken", ASCENDING)], unique=True, sparse=True, name="idx_po_booking_token")
create_index("purchase_orders", [("poNumber",  ASCENDING)], unique=True, name="idx_po_number")
create_index("purchase_orders", [("requestId", ASCENDING)], unique=True, name="idx_po_request")
create_index("purchase_orders", [("status",    ASCENDING)], name="idx_po_status")


# ══════════════════════════════════════════════════════════════════════════════
#  5b. SITE LOCATIONS (static QR codes posted at client sites)
# ══════════════════════════════════════════════════════════════════════════════
create_collection("site_locations", {
    "bsonType": "object",
    "required": ["orgId", "label", "siteToken", "isActive", "createdAt"],
    "properties": {
        "orgId":     {"bsonType": "objectId", "description": "FK → organizations (client)"},
        "label":     {"bsonType": "string",   "description": "Human-readable site name"},
        "siteToken": {"bsonType": "string",   "description": "Random opaque token; encoded in the static QR"},
        "isActive":  {"bsonType": "bool"},
        "createdAt": {"bsonType": "date"},
        "createdBy": {"bsonType": "objectId", "description": "FK → users"},
    }
})

create_index("site_locations", [("siteToken", ASCENDING)], unique=True, name="idx_site_token")
create_index("site_locations", [("orgId", ASCENDING), ("isActive", ASCENDING)], name="idx_site_org_active")


# ══════════════════════════════════════════════════════════════════════════════
#  6. SCAN JOBS  (QR scan & verify)
# ══════════════════════════════════════════════════════════════════════════════
create_collection("scan_jobs", {
    "bsonType": "object",
    "required": ["scannedBy", "status", "scannedAt"],
    "properties": {
        "requestId":    {"bsonType": "objectId", "description": "FK → service_requests"},
        "poId":         {"bsonType": "objectId", "description": "FK → purchase_orders"},
        "scannedBy":    {"bsonType": "objectId", "description": "FK → users (legacy: first scanner)"},
        "providerOrgId":{"bsonType": "objectId", "description": "FK → organizations (provider)"},
        "clientOrgId":  {"bsonType": "objectId", "description": "FK → organizations (client)"},
        "assignedStaffId": {"bsonType": "objectId", "description": "FK → users (provider_staff)"},
        "siteLocationId":  {"bsonType": "objectId", "description": "FK → site_locations"},
        "qrPayload":    {"bsonType": "string"},
        "result":       {"bsonType": "string"},
        "status":       {"bsonType": "string",
                         "enum": ["verified", "failed", "pending", "in_progress", "completed"]},
        "failReason":   {"bsonType": "string"},
        "scannedAt":    {"bsonType": "date"},
        "startedAt":    {"bsonType": "date",   "description": "Set when site QR scan succeeds"},
        "startedBy":    {"bsonType": "objectId", "description": "FK → users (provider_staff)"},
        "completedAt":  {"bsonType": "date",   "description": "Set when booking QR scan succeeds"},
        "completedBy":  {"bsonType": "objectId", "description": "FK → users (client_staff / org_admin)"},
        "location":     {"bsonType": "string"},
    }
})

create_index("scan_jobs", [("scannedBy",     ASCENDING), ("scannedAt", DESCENDING)], name="idx_scan_user_date")
create_index("scan_jobs", [("providerOrgId", ASCENDING), ("scannedAt", DESCENDING)], name="idx_scan_provider")
create_index("scan_jobs", [("requestId",     ASCENDING)], sparse=True, name="idx_scan_request")


# ══════════════════════════════════════════════════════════════════════════════
#  7. DOCUMENT VERIFICATIONS
# ══════════════════════════════════════════════════════════════════════════════
create_collection("document_verifications", {
    "bsonType": "object",
    "required": ["documentId", "verifiedBy", "outcome", "verifiedAt"],
    "properties": {
        "documentId": {"bsonType": "objectId", "description": "FK → compliance_documents"},
        "verifiedBy": {"bsonType": "objectId", "description": "FK → users"},
        "outcome":    {"bsonType": "string",   "enum": ["approved", "rejected", "needs_resubmission"]},
        "notes":      {"bsonType": "string"},
        "verifiedAt": {"bsonType": "date"},
    }
})

create_index("document_verifications", [("documentId", ASCENDING)], name="idx_docver_document")
create_index("document_verifications", [("verifiedBy",  ASCENDING), ("verifiedAt", DESCENDING)], name="idx_docver_reviewer")


# ══════════════════════════════════════════════════════════════════════════════
#  8. B2B CONNECTIONS
# ══════════════════════════════════════════════════════════════════════════════
create_collection("b2b_connections", {
    "bsonType": "object",
    "required": ["org1Id", "org2Id", "status", "initiatedBy", "createdAt"],
    "properties": {
        "org1Id":      {"bsonType": "objectId", "description": "FK → organizations (initiator)"},
        "org2Id":      {"bsonType": "objectId", "description": "FK → organizations (recipient)"},
        "initiatedBy": {"bsonType": "objectId", "description": "FK → users"},
        "status":      {"bsonType": "string",
                        "enum": ["pending", "connected", "disconnected", "blocked"]},
        "createdAt":   {"bsonType": "date"},
        "connectedAt": {"bsonType": "date"},
        "notes":       {"bsonType": "string"},
    }
})

create_index("b2b_connections", [("org1Id", ASCENDING), ("org2Id", ASCENDING)], unique=True, name="idx_b2b_pair")
create_index("b2b_connections", [("org2Id", ASCENDING), ("status", ASCENDING)], name="idx_b2b_recipient")


# ══════════════════════════════════════════════════════════════════════════════
#  9. AUDIT LOGS
# ══════════════════════════════════════════════════════════════════════════════
create_collection("audit_logs", {
    "bsonType": "object",
    "required": ["orgId", "action", "entity", "timestamp"],
    "properties": {
        "orgId":      {"bsonType": "objectId", "description": "FK → organizations"},
        "userId":     {"bsonType": "objectId", "description": "FK → users (null = system)"},
        "action":     {"bsonType": "string",
                       "enum": ["created", "updated", "deleted", "approved",
                                "rejected", "uploaded", "scanned", "login",
                                "logout", "connected", "disconnected"]},
        "entity":     {"bsonType": "string",
                       "enum": ["organization", "user", "compliance_document",
                                "service_request", "purchase_order", "scan_job",
                                "b2b_connection"]},
        "entityId":   {"bsonType": "objectId"},
        "description":{"bsonType": "string",   "description": "Human-readable summary"},
        "metadata":   {"bsonType": "object",   "description": "Extra key/value context"},
        "ipAddress":  {"bsonType": "string"},
        "timestamp":  {"bsonType": "date"},
    }
})

create_index("audit_logs", [("orgId",     ASCENDING), ("timestamp", DESCENDING)], name="idx_log_org_time")
create_index("audit_logs", [("userId",    ASCENDING), ("timestamp", DESCENDING)], sparse=True, name="idx_log_user_time")
create_index("audit_logs", [("entity",    ASCENDING), ("entityId",  ASCENDING)],  name="idx_log_entity")
create_index("audit_logs", [("timestamp", DESCENDING)], name="idx_log_time")

# TTL: auto-delete logs older than 2 years (optional — comment out to keep forever)
# create_index("audit_logs", [("timestamp", ASCENDING)], expireAfterSeconds=63072000, name="idx_log_ttl")


# ══════════════════════════════════════════════════════════════════════════════
#  SEED DATA  (matches the hardcoded UI data in your JSX files)
# ══════════════════════════════════════════════════════════════════════════════
print("\n── Seed data ────────────────────────────────────────────────────────────")

def seed_if_empty(collection_name, docs):
    col = db[collection_name]
    if col.count_documents({}) == 0:
        result = col.insert_many(docs)
        print(f"  ✓ Seeded {len(result.inserted_ids)} docs → {collection_name}")
    else:
        print(f"  · Already has data:   {collection_name} (skipped)")

# ── Orgs ──────────────────────────────────────────────────────────────────────
admin_org_id   = ObjectId()
goodme_id      = ObjectId()
endure_id      = ObjectId()
safeguard_id   = ObjectId()
client_org_id  = ObjectId()

seed_if_empty("organizations", [
    {
        "_id": admin_org_id,
        "name": "BiVerify Platform",
        "subdomain": "admin",
        "type": "client",
        "status": "approved",
        "adminEmail": "admin@biverify.com",
        "teamMembers": [],
        "createdAt": past(90),
        "approvedAt": past(90),
        "updatedAt": past(90),
    },
    {
        "_id": goodme_id,
        "name": "goodme",
        "subdomain": "goodme",
        "type": "provider",
        "status": "approved",
        "regNumber": "REG-10029",
        "address": "12 Industry Rd",
        "city": "Cape Town",
        "country": "ZA",
        "website": "https://goodme.co.za",
        "serviceType": "Cleaning Services",
        "licenseNumber": "LIC-88712",
        "adminEmail": "goodme@example.com",
        "teamMembers": [],
        "createdAt": past(60),
        "approvedAt": past(55),
        "updatedAt": past(55),
    },
    {
        "_id": endure_id,
        "name": "endure",
        "subdomain": "endure",
        "type": "provider",
        "status": "approved",
        "regNumber": "REG-10041",
        "address": "7 Corporate Park",
        "city": "Johannesburg",
        "country": "ZA",
        "website": "https://endure.co.za",
        "serviceType": "Security Services",
        "licenseNumber": "LIC-22093",
        "adminEmail": "admin@endure.com",
        "teamMembers": [],
        "createdAt": past(58),
        "approvedAt": past(50),
        "updatedAt": past(50),
    },
    {
        "_id": safeguard_id,
        "name": "SafeGuard Ltd",
        "subdomain": "safeguard",
        "type": "provider",
        "status": "approved",
        "regNumber": "REG-10055",
        "address": "88 Safety Ave",
        "city": "Durban",
        "country": "ZA",
        "serviceType": "Health & Safety",
        "adminEmail": "ops@safeguard.co.za",
        "teamMembers": [],
        "createdAt": past(45),
        "approvedAt": past(40),
        "updatedAt": past(40),
    },
    {
        "_id": client_org_id,
        "name": "Asset Owner Corp",
        "subdomain": "assetowner",
        "type": "client",
        "status": "approved",
        "regNumber": "REG-20011",
        "address": "1 Commerce Blvd",
        "city": "Pretoria",
        "country": "ZA",
        "industry": "Manufacturing",
        "adminEmail": "ao@assetowner.co.za",
        "teamMembers": [],
        "createdAt": past(50),
        "approvedAt": past(48),
        "updatedAt": past(48),
    },
])

# ── Users ─────────────────────────────────────────────────────────────────────
admin_user_id    = ObjectId()
goodme_admin_id  = ObjectId()
ao_user_id       = ObjectId()
ao_staff_id      = ObjectId()
shawn_id         = ObjectId()

seed_if_empty("users", [
    {
        "_id": admin_user_id,
        "orgId": admin_org_id,
        "fullName": "Super Admin",
        "email": "admin@biverify.com",
        "passwordHash": "hashed_placeholder",
        "role": "super_admin",
        "isActive": True,
        "createdAt": past(90),
    },
    {
        "_id": ObjectId(),
        "orgId": goodme_id,
        "fullName": "Provider Admin",
        "email": "provider@biverify.com",
        "passwordHash": "hashed_placeholder",
        "role": "org_admin",
        "isActive": True,
        "createdAt": past(60),
    },
    {
        "_id": goodme_admin_id,
        "orgId": goodme_id,
        "fullName": "Goodme Admin",
        "email": "goodme@example.com",
        "passwordHash": "hashed_placeholder",
        "role": "org_admin",
        "isActive": True,
        "createdAt": past(60),
    },
    {
        "_id": ao_user_id,
        "orgId": client_org_id,
        "fullName": "Asset Owner",
        "email": "ao@assetowner.co.za",
        "passwordHash": "hashed_placeholder",
        "role": "org_admin",
        "isActive": True,
        "createdAt": past(50),
    },
    {
        "_id": ao_staff_id,
        "orgId": client_org_id,
        "fullName": "Compliance Officer",
        "email": "compliance@assetowner.co.za",
        "passwordHash": "hashed_placeholder",
        "role": "compliance_officer",
        "department": "Operations",
        "isActive": True,
        "createdAt": past(48),
    },
    {
        "_id": shawn_id,
        "orgId": goodme_id,
        "fullName": "Shawn",
        "email": "shawn@goodme.co.za",
        "passwordHash": "hashed_placeholder",
        "role": "provider_staff",
        "isActive": True,
        "createdAt": past(45),
    },
])

# ── Compliance Documents ───────────────────────────────────────────────────────
doc_insurance_goodme  = ObjectId()
doc_insurance_endure  = ObjectId()

seed_if_empty("compliance_documents", [
    {
        "_id": doc_insurance_goodme,
        "orgId": goodme_id,
        "type": "insurance",
        "label": "Public Liability Insurance",
        "fileName": "goodme_insurance_2026.pdf",
        "fileUrl": "/uploads/goodme/insurance.pdf",
        "status": "expired",
        "expiryDate": past(2),
        "uploadedAt": past(60),
        "uploadedBy": goodme_admin_id,
    },
    {
        "_id": doc_insurance_endure,
        "orgId": endure_id,
        "type": "insurance",
        "label": "Public Liability Insurance",
        "fileName": "endure_insurance_2026.pdf",
        "fileUrl": "/uploads/endure/insurance.pdf",
        "status": "expired",
        "expiryDate": past(3),
        "uploadedAt": past(58),
        "uploadedBy": ObjectId(),
    },
    {
        "orgId": goodme_id,
        "type": "certificate",
        "label": "Health & Safety Certificate",
        "fileName": "goodme_hs_cert.pdf",
        "fileUrl": "/uploads/goodme/hs_cert.pdf",
        "status": "verified",
        "expiryDate": future(300),
        "uploadedAt": past(55),
        "uploadedBy": goodme_admin_id,
        "reviewedBy": admin_user_id,
        "reviewedAt": past(54),
    },
])

# ── Service Requests ──────────────────────────────────────────────────────────
sr1_id = ObjectId()
sr2_id = ObjectId()
sr3_id = ObjectId()
sr4_id = ObjectId()

seed_if_empty("service_requests", [
    {
        "_id": sr1_id,
        "clientOrgId": client_org_id,
        "providerOrgId": safeguard_id,
        "requestedBy": ao_staff_id,
        "serviceType": "Health & Safety Audit",
        "description": "Monthly site safety inspection",
        "status": "completed",
        "priority": "medium",
        "scheduledDate": past(28),
        "createdAt": past(30),
        "updatedAt": past(20),
    },
    {
        "_id": sr2_id,
        "clientOrgId": client_org_id,
        "providerOrgId": goodme_id,
        "requestedBy": ao_staff_id,
        "serviceType": "Cleaning Services",
        "description": "Facility deep clean — Building A",
        "status": "in_progress",
        "priority": "high",
        "scheduledDate": now() + timedelta(days=2),
        "createdAt": past(10),
        "updatedAt": past(3),
    },
    {
        "_id": sr3_id,
        "clientOrgId": client_org_id,
        "providerOrgId": goodme_id,
        "requestedBy": ao_user_id,
        "serviceType": "Cleaning Services",
        "description": "Office block weekly clean",
        "status": "in_progress",
        "priority": "low",
        "scheduledDate": now() + timedelta(days=5),
        "createdAt": past(7),
        "updatedAt": past(2),
    },
    {
        "_id": sr4_id,
        "clientOrgId": client_org_id,
        "providerOrgId": endure_id,
        "requestedBy": ao_staff_id,
        "serviceType": "Security Services",
        "description": "Weekend event security cover",
        "status": "pending",
        "priority": "medium",
        "scheduledDate": now() + timedelta(days=10),
        "createdAt": past(2),
        "updatedAt": past(2),
    },
])

# ── Purchase Orders ────────────────────────────────────────────────────────────
seed_if_empty("purchase_orders", [
    {
        "requestId": sr1_id,
        "poNumber": "PO-3956128047",
        "amount": 45.50,
        "taxRate": 0.10,
        "taxAmount": 4.55,
        "totalAmount": 50.05,
        "status": "paid",
        "issuedAt": past(29),
        "paidAt": past(20),
    },
    {
        "requestId": sr2_id,
        "poNumber": "PO-1772507457",
        "amount": 33.06,
        "taxRate": 0.10,
        "taxAmount": 3.31,
        "totalAmount": 36.37,
        "status": "issued",
        "issuedAt": past(9),
    },
    {
        "requestId": sr3_id,
        "poNumber": "PO-2841903621",
        "amount": 27.80,
        "taxRate": 0.10,
        "taxAmount": 2.78,
        "totalAmount": 30.58,
        "status": "issued",
        "issuedAt": past(6),
    },
    {
        "requestId": sr4_id,
        "poNumber": "PO-4103857294",
        "amount": 62.00,
        "taxRate": 0.10,
        "taxAmount": 6.20,
        "totalAmount": 68.20,
        "status": "draft",
        "issuedAt": past(1),
    },
])

# ── Scan Jobs ─────────────────────────────────────────────────────────────────
seed_if_empty("scan_jobs", [
    {
        "requestId": sr1_id,
        "scannedBy": ao_staff_id,
        "providerOrgId": safeguard_id,
        "qrPayload": str(safeguard_id),
        "result": "SafeGuard Ltd — all compliance docs valid",
        "status": "verified",
        "scannedAt": past(28),
        "location": "Site entrance — Building A",
    },
])

# ── B2B Connections ───────────────────────────────────────────────────────────
seed_if_empty("b2b_connections", [
    {
        "org1Id": client_org_id,
        "org2Id": goodme_id,
        "initiatedBy": ao_user_id,
        "status": "connected",
        "createdAt": past(40),
        "connectedAt": past(38),
    },
    {
        "org1Id": client_org_id,
        "org2Id": safeguard_id,
        "initiatedBy": ao_user_id,
        "status": "connected",
        "createdAt": past(35),
        "connectedAt": past(33),
    },
    {
        "org1Id": client_org_id,
        "org2Id": endure_id,
        "initiatedBy": ao_user_id,
        "status": "pending",
        "createdAt": past(3),
    },
])

# ── Audit Logs ────────────────────────────────────────────────────────────────
seed_if_empty("audit_logs", [
    {
        "orgId": client_org_id,
        "userId": ao_user_id,
        "action": "login",
        "entity": "user",
        "entityId": ao_user_id,
        "description": "User logged in",
        "timestamp": past(1),
    },
    {
        "orgId": client_org_id,
        "userId": ao_staff_id,
        "action": "scanned",
        "entity": "scan_job",
        "entityId": ObjectId(),
        "description": "QR scan verified SafeGuard Ltd on-site",
        "timestamp": past(28),
    },
    {
        "orgId": goodme_id,
        "userId": goodme_admin_id,
        "action": "uploaded",
        "entity": "compliance_document",
        "entityId": doc_insurance_goodme,
        "description": "Uploaded insurance document",
        "timestamp": past(60),
    },
    {
        "orgId": admin_org_id,
        "userId": admin_user_id,
        "action": "approved",
        "entity": "organization",
        "entityId": goodme_id,
        "description": "Approved provider: goodme",
        "timestamp": past(55),
    },
])

# ── Done ───────────────────────────────────────────────────────────────────────
print(f"""
── Done ──────────────────────────────────────────────────────────────────
  Database : {DB_NAME}
  Collections created with validators + indexes.
  Seed data inserted (skipped if collections already had data).

  Next steps:
    1. Replace passwordHash values with bcrypt hashes in production.
    2. Store real file URLs (S3/GCS) in compliance_documents.fileUrl.
    3. Generate QR payloads with org ObjectId + HMAC signature.
    4. Add a TTL index on audit_logs if log retention is needed.
──────────────────────────────────────────────────────────────────────────
""")
client.close()