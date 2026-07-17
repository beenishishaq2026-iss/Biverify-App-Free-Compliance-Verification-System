from datetime import datetime, timezone
from bson import ObjectId
from bson.errors import InvalidId
from flask import Blueprint, request, jsonify, g
from db import get_db
from auth import require_role, hash_password
from utils.audit import write_audit

bp = Blueprint("team", __name__, url_prefix="/api/team")


def _err(code, msg, status):
    return jsonify({"error": {"code": code, "message": msg}}), status


# Roles an org_admin may create, by org type
ALLOWED_ROLES = {
    "provider": {"provider_staff"},
    "client":   {"client_staff", "compliance_officer"},
}


def _public(u):
    return {
        "id": str(u["_id"]),
        "fullName": u.get("fullName"),
        "email": u.get("email"),
        "role": u.get("role"),
        "isActive": u.get("isActive", True),
        "createdAt": u["createdAt"].isoformat() if u.get("createdAt") else None,
    }


@bp.get("")
@require_role("org_admin")
def list_team():
    db = get_db()
    org = db.organizations.find_one({"_id": g.user["orgId"]})
    if not org:
        return _err("NOT_FOUND", "Org missing", 404)

    # Only return staff roles that belong to this org type.
    # This ensures client-side admins never see provider_staff and vice-versa.
    allowed_roles = list(ALLOWED_ROLES.get(org["type"], set()))

    cur = db.users.find(
        {
            "orgId": g.user["orgId"],
            "_id":  {"$ne": g.user["_id"]},
            "role": {"$in": allowed_roles},
        }
    ).sort("createdAt", -1)
    return jsonify([_public(u) for u in cur])


@bp.post("")
@require_role("org_admin")
def create_member():
    data = request.get_json(silent=True) or {}
    full_name = (data.get("fullName") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    role = data.get("role")

    if not (full_name and email and password):
        return _err("BAD_REQUEST", "fullName, email, password required", 400)
    if len(password) < 6:
        return _err("BAD_REQUEST", "password must be at least 6 characters", 400)

    db = get_db()
    org = db.organizations.find_one({"_id": g.user["orgId"]})
    if not org:
        return _err("NOT_FOUND", "Org missing", 404)

    allowed = ALLOWED_ROLES.get(org["type"], set())
    if not role:
        # Sensible default per org type
        role = "provider_staff" if org["type"] == "provider" else "client_staff"
    if role not in allowed:
        return _err("BAD_REQUEST", f"Role must be one of: {', '.join(sorted(allowed))}", 400)

    if db.users.find_one({"email": email}):
        return _err("CONFLICT", "Email already registered", 409)

    now = datetime.now(timezone.utc)
    doc = {
        "orgId": g.user["orgId"],
        "fullName": full_name,
        "email": email,
        "passwordHash": hash_password(password),
        "role": role,
        "phone": data.get("phone", ""),
        "isActive": True,
        "createdAt": now,
    }
    user_id = db.users.insert_one(doc).inserted_id
    doc["_id"] = user_id

    write_audit(
        org_id=g.user["orgId"], user_id=g.user["_id"],
        action="created", entity="user", entity_id=user_id,
        description=f"Team member created: {email} ({role})",
    )
    return jsonify(_public(doc)), 201


@bp.delete("/<member_id>")
@require_role("org_admin")
def delete_member(member_id):
    db = get_db()
    try:
        oid = ObjectId(member_id)
    except InvalidId:
        return _err("BAD_REQUEST", "Invalid id", 400)
    if oid == g.user["_id"]:
        return _err("BAD_REQUEST", "You cannot delete yourself", 400)

    res = db.users.delete_one({"_id": oid, "orgId": g.user["orgId"]})
    if res.deleted_count == 0:
        return _err("NOT_FOUND", "Member not found in your org", 404)

    write_audit(
        org_id=g.user["orgId"], user_id=g.user["_id"],
        action="deleted", entity="user", entity_id=oid,
        description="Team member removed",
    )
    return jsonify({"ok": True})