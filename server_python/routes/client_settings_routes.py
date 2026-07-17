"""
client_settings_routes.py  –  Backend for OrganizationSettings.jsx (ClientSide)

Endpoints
─────────
GET   /api/client/settings/profile          Load org profile + localization settings
PATCH /api/client/settings/profile          Update org profile (name, email, website, timezone, currency)
PATCH /api/client/settings/password         Change the logged-in user's own password

Collections used (from setup_db.py)
────────────────────────────────────
  organizations  →  name, adminEmail, website, address, city, country,
                    industry, updatedAt
                    + settings.timezone, settings.currency (flexible sub-doc
                      stored alongside existing schema fields — no migration needed)
  users          →  fullName, email, passwordHash, phone

Register in app.py:
    from routes.client_settings_routes import bp as client_settings_bp
    app.register_blueprint(client_settings_bp)
"""

from datetime import datetime, timezone
from bson import ObjectId
from flask import Blueprint, g, jsonify, request

from auth import require_role, verify_password, hash_password
from utils.audit import write_audit
from db import get_db

bp = Blueprint("client_settings", __name__, url_prefix="/api/client/settings")


def _err(code, msg, status):
    return jsonify({"error": {"code": code, "message": msg}}), status


def _normalise_oid(raw):
    return ObjectId(raw) if not isinstance(raw, ObjectId) else raw


# ── Serialisers ───────────────────────────────────────────────────────────────

def _serialize_profile(org, user):
    """
    Shape returned to the frontend for the settings form.
    Maps org + user fields to what OrganizationSettings.jsx binds to.
    """
    settings = org.get("settings") or {}
    return {
        # Branding & Identity section
        "orgName":    org.get("name", ""),
        "email":      org.get("adminEmail", "") or user.get("email", ""),
        "websiteUrl": org.get("website", ""),
        # Extra org info (available for future form fields)
        "address":    org.get("address", ""),
        "city":       org.get("city", ""),
        "country":    org.get("country", ""),
        "industry":   org.get("industry", ""),
        "regNumber":  org.get("regNumber", ""),
        # Localization section
        "timezone":   settings.get("timezone", "UTC (Universal Coordinated Time)"),
        "currency":   settings.get("currency", "USD ($)"),
        # Read-only context for the nav bar
        "fullName":   user.get("fullName", ""),
        "role":       user.get("role", ""),
        "orgType":    org.get("type", "client"),
        "orgStatus":  org.get("status", ""),
    }


# ══════════════════════════════════════════════════════════════════════════════
# GET /api/client/settings/profile
# ══════════════════════════════════════════════════════════════════════════════

@bp.get("/profile")
@require_role("org_admin", "client_staff", "compliance_officer")
def get_profile():
    """
    Load the org profile and localization settings for the settings form.
    Pre-fills all input fields in OrganizationSettings.jsx on mount.

    Response:
    {
      orgName, email, websiteUrl, address, city, country,
      industry, regNumber, timezone, currency,
      fullName, role, orgType, orgStatus
    }
    """
    db     = get_db()
    org_id = _normalise_oid(g.user["orgId"])

    org  = db.organizations.find_one({"_id": org_id})
    user = g.user   # already loaded by require_role → require_auth

    if not org:
        return _err("NOT_FOUND", "Organisation not found", 404)

    return jsonify({"profile": _serialize_profile(org, user)})


# ══════════════════════════════════════════════════════════════════════════════
# PATCH /api/client/settings/profile
# ══════════════════════════════════════════════════════════════════════════════

@bp.patch("/profile")
@require_role("org_admin", "client_staff", "compliance_officer")
def update_profile():
    """
    Save changes from the settings form.

    Accepted JSON body (all fields optional — only send what changed):
    {
      "orgName":    "Acme Corp",
      "email":      "admin@acme.com",
      "websiteUrl": "https://acme.com",
      "address":    "1 Commerce Blvd",
      "city":       "Pretoria",
      "country":    "ZA",
      "industry":   "Manufacturing",
      "regNumber":  "REG-20011",
      "timezone":   "EST (Eastern Standard Time)",
      "currency":   "EUR (€)"
    }

    Returns the updated profile in the same shape as GET.
    """
    data   = request.get_json(silent=True) or {}
    db     = get_db()
    org_id = _normalise_oid(g.user["orgId"])

    org = db.organizations.find_one({"_id": org_id})
    if not org:
        return _err("NOT_FOUND", "Organisation not found", 404)

    # Build update dict — only include fields present in request body
    org_updates   = {}
    user_updates  = {}
    extra_settings = {}

    # ── Org-level fields (mapped to organizations collection fields) ──
    if "orgName" in data:
        val = (data["orgName"] or "").strip()
        if not val:
            return _err("BAD_REQUEST", "orgName cannot be empty", 400)
        org_updates["name"] = val

    if "email" in data:
        val = (data["email"] or "").strip().lower()
        if not val or "@" not in val:
            return _err("BAD_REQUEST", "A valid email is required", 400)
        org_updates["adminEmail"] = val
        # Also keep the logged-in user's email in sync
        user_updates["email"] = val

    if "websiteUrl" in data:
        org_updates["website"] = (data["websiteUrl"] or "").strip()

    if "address" in data:
        org_updates["address"] = (data["address"] or "").strip()

    if "city" in data:
        org_updates["city"] = (data["city"] or "").strip()

    if "country" in data:
        org_updates["country"] = (data["country"] or "").strip()

    if "industry" in data:
        org_updates["industry"] = (data["industry"] or "").strip()

    if "regNumber" in data:
        org_updates["regNumber"] = (data["regNumber"] or "").strip()

    # ── Localization (stored in org.settings sub-document) ──
    if "timezone" in data:
        extra_settings["settings.timezone"] = (data["timezone"] or "UTC (Universal Coordinated Time)").strip()

    if "currency" in data:
        extra_settings["settings.currency"] = (data["currency"] or "USD ($)").strip()

    if not org_updates and not user_updates and not extra_settings:
        return _err("BAD_REQUEST", "No valid fields to update", 400)

    # ── Apply updates ──
    now = datetime.now(timezone.utc)

    if org_updates or extra_settings:
        combined = {**org_updates, **extra_settings, "updatedAt": now}
        db.organizations.update_one({"_id": org_id}, {"$set": combined})

    if user_updates:
        db.users.update_one({"_id": g.user["_id"]}, {"$set": user_updates})

    # ── Audit log ──
    write_audit(
        org_id=org_id, user_id=g.user["_id"],
        action="updated", entity="organization", entity_id=org_id,
        description="Organisation settings updated",
        metadata={"fields": list({**org_updates, **extra_settings}.keys())},
    )

    # ── Return fresh data ──
    updated_org  = db.organizations.find_one({"_id": org_id})
    updated_user = db.users.find_one({"_id": g.user["_id"]})
    return jsonify({
        "message": "Settings saved successfully",
        "profile": _serialize_profile(updated_org, updated_user),
    })


# ══════════════════════════════════════════════════════════════════════════════
# PATCH /api/client/settings/password
# ══════════════════════════════════════════════════════════════════════════════

@bp.patch("/password")
@require_role("org_admin", "client_staff", "compliance_officer")
def change_password():
    """
    Change the logged-in user's own password.

    Required JSON body:
    {
      "currentPassword": "old-password",
      "newPassword":     "new-password"
    }

    Rules:
    - currentPassword must match what is stored (verify_password from auth.py)
    - newPassword must be at least 8 characters
    - newPassword must differ from currentPassword
    """
    data = request.get_json(silent=True) or {}

    current_pw = data.get("currentPassword") or ""
    new_pw     = data.get("newPassword")     or ""

    if not current_pw or not new_pw:
        return _err("BAD_REQUEST", "currentPassword and newPassword are required", 400)

    if len(new_pw) < 8:
        return _err("BAD_REQUEST", "New password must be at least 8 characters", 400)

    db   = get_db()
    user = db.users.find_one({"_id": g.user["_id"]})

    # Verify current password
    if not verify_password(current_pw, user.get("passwordHash", "")):
        return _err("UNAUTHORIZED", "Current password is incorrect", 401)

    # Prevent reuse of the same password
    if verify_password(new_pw, user.get("passwordHash", "")):
        return _err("BAD_REQUEST", "New password must be different from the current password", 400)

    # Hash and save
    new_hash = hash_password(new_pw)
    db.users.update_one(
        {"_id": g.user["_id"]},
        {"$set": {"passwordHash": new_hash}},
    )

    write_audit(
        org_id=g.user["orgId"], user_id=g.user["_id"],
        action="updated", entity="user", entity_id=g.user["_id"],
        description="User changed their password",
    )

    return jsonify({"message": "Password changed successfully"})
