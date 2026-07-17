from datetime import datetime, timezone
from bson import ObjectId
from db import get_db


def is_provider_blocked(provider_org_id) -> tuple[bool, str | None]:
    """
    Returns (blocked, reason). A provider is blocked if any of their
    compliance_documents has status != "verified" OR has an expiryDate in the past.
    Per fyp_functionality.txt: expired compliance => provider blocked.
    """
    if not isinstance(provider_org_id, ObjectId):
        provider_org_id = ObjectId(provider_org_id)

    db = get_db()
    docs = list(db.compliance_documents.find({"orgId": provider_org_id}))
    if not docs:
        return True, "No compliance documents on file"

    now = datetime.now(timezone.utc)
    for d in docs:
        if d.get("status") != "verified":
            return True, f"Document '{d.get('label') or d.get('type')}' is {d.get('status')}"
        exp = d.get("expiryDate")
        if exp:
            # Mongo returns naive UTC datetimes — make `now` comparable.
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if exp < now:
                return True, f"Document '{d.get('label') or d.get('type')}' expired on {exp.date().isoformat()}"
    return False, None
