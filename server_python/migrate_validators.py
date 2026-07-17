"""
Update Mongo collection validators to match the latest schema in setup_db.py.
setup_db.py skips collections that already exist; this script runs `collMod`
to update validators in place. Idempotent.
"""
from db import get_db

db = get_db()

print("Updating scan_jobs validator…")
db.command({
    "collMod": "scan_jobs",
    "validator": {"$jsonSchema": {
        "bsonType": "object",
        "required": ["scannedBy", "status", "scannedAt"],
        "properties": {
            "requestId":    {"bsonType": "objectId"},
            "poId":         {"bsonType": "objectId"},
            "scannedBy":    {"bsonType": "objectId"},
            "providerOrgId":{"bsonType": "objectId"},
            "clientOrgId":  {"bsonType": "objectId"},
            "assignedStaffId": {"bsonType": "objectId"},
            "siteLocationId":  {"bsonType": "objectId"},
            "qrPayload":    {"bsonType": "string"},
            "result":       {"bsonType": "string"},
            "status":       {"bsonType": "string",
                             "enum": ["verified", "failed", "pending", "in_progress", "completed"]},
            "failReason":   {"bsonType": "string"},
            "scannedAt":    {"bsonType": "date"},
            "startedAt":    {"bsonType": "date"},
            "startedBy":    {"bsonType": "objectId"},
            "completedAt":  {"bsonType": "date"},
            "completedBy":  {"bsonType": "objectId"},
            "location":     {"bsonType": "string"},
        },
    }},
})
print("  ok")

print("\nDone.")
