from datetime import datetime, timezone
from bson import ObjectId
from db import get_db

def write_audit(*, org_id, user_id, action, entity, entity_id=None,
                description="", metadata=None, ip=None):
    db = get_db()
    doc = {
        "orgId":      ObjectId(org_id)  if isinstance(org_id,  str) else org_id,
        "userId":     ObjectId(user_id) if isinstance(user_id, str) else user_id,
        "action":     action,
        "entity":     entity,
        "description": description,
        "timestamp":  datetime.now(timezone.utc),
    }
    if entity_id is not None:
        doc["entityId"] = ObjectId(entity_id) if isinstance(entity_id, str) else entity_id
    if metadata:
        doc["metadata"] = metadata
    if ip:
        doc["ipAddress"] = ip
    db.audit_logs.insert_one(doc)