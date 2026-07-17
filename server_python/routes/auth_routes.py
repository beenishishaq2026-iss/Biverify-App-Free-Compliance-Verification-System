from datetime import datetime, timezone, timedelta
import secrets
import random
from bson import ObjectId
from flask import Blueprint, request, jsonify, g
from db import get_db
from auth import hash_password, verify_password, issue_token, require_auth
from utils.audit import write_audit
from email_service import send_reset_otp

bp = Blueprint("auth", __name__, url_prefix="/api/auth")


def _err(code, msg, status):
    return jsonify({"error": {"code": code, "message": msg}}), status


def _user_public(u):
    db = get_db()
    org = db.organizations.find_one({"_id": u["orgId"]}, {"type": 1, "name": 1}) or {}
    return {
        "id": str(u["_id"]),
        "fullName": u.get("fullName"),
        "email": u.get("email"),
        "role": u.get("role"),
        "orgId": str(u["orgId"]),
        "orgName": org.get("name", ""),          # ← NEW: organisation display name
        "orgType": org.get("type", "client"),    # "client" | "provider"
    }


@bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    if not email or not password:
        return _err("BAD_REQUEST", "email and password required", 400)

    db = get_db()

    # Platform owner super_admin uses a fixed password (no bcrypt hash in DB).
    # Every other user is verified normally via bcrypt — completely unchanged.
    if email == "admin@biverify.com":
        user = db.users.find_one({"email": email})
        if not user or password != "admin123":
            return _err("UNAUTHORIZED", "Invalid email or password", 401)
    else:
        user = db.users.find_one({"email": email})
        if not user or not verify_password(password, user.get("passwordHash", "")):
            return _err("UNAUTHORIZED", "Invalid email or password", 401)

    if user.get("isActive") is False:
        return _err("UNAUTHORIZED", "User is inactive", 401)

    # Block login only for PROVIDER orgs that have not been approved yet.
    # Client orgs are auto-approved on registration and are never blocked.
    _org_check = get_db().organizations.find_one({"_id": user["orgId"]}, {"status": 1, "type": 1})
    if _org_check and _org_check.get("type") == "provider":
        if _org_check.get("status") == "pending":
            return _err(
                "ORG_PENDING_APPROVAL",
                "Your organization registration is pending admin approval. You will be notified once it is approved.",
                403,
            )
        if _org_check.get("status") == "rejected":
            return _err(
                "ORG_REJECTED",
                "Your organization registration was rejected. Please contact support.",
                403,
            )

    db.users.update_one({"_id": user["_id"]}, {"$set": {"lastLoginAt": datetime.now()}})
    token = issue_token(user["_id"], user["role"], user["orgId"])
    write_audit(
        org_id=user["orgId"], user_id=user["_id"],
        action="login", entity="user", entity_id=user["_id"],
        description="User logged in",
    )
    return jsonify({"token": token, "user": _user_public(user)})


@bp.post("/register-org")
def register_org():
    """
    Per spec: only organizations can self-signup. Creates an org (status=pending)
    and its first org_admin user.
    """
    data = request.get_json(silent=True) or {}
    required = ["orgName", "orgType", "adminFullName", "adminEmail", "password"]
    if any(not data.get(k) for k in required):
        return _err("BAD_REQUEST", f"Required: {', '.join(required)}", 400)
    if data["orgType"] not in ("client", "provider"):
        return _err("BAD_REQUEST", "orgType must be 'client' or 'provider'", 400)

    db = get_db()
    email = data["adminEmail"].strip().lower()
    if db.users.find_one({"email": email}):
        return _err("CONFLICT", "Email already registered", 409)

    now = datetime.now()
    org = {
        "name": data["orgName"],
        "type": data["orgType"],
        "status": "pending",
        "adminEmail": email,
        "address": data.get("address", ""),
        "city": data.get("city", ""),
        "country": data.get("country", ""),
        "industry": data.get("industry", ""),
        "serviceType": data.get("serviceType", ""),
        "teamMembers": [],
        "createdAt": now,
        "updatedAt": now,
    }
    org_id = db.organizations.insert_one(org).inserted_id

    user_doc = {
        "orgId": org_id,
        "fullName": data["adminFullName"],
        "email": email,
        "passwordHash": hash_password(data["password"]),
        "role": "org_admin",
        "phone": data.get("phone", ""),
        "isActive": True,
        "createdAt": now,
    }
    user_id = db.users.insert_one(user_doc).inserted_id
    user_doc["_id"] = user_id

    write_audit(
        org_id=org_id, user_id=user_id,
        action="created", entity="organization", entity_id=org_id,
        description=f"Org self-registered: {data['orgName']}",
    )

    # Providers must wait for admin approval before they can log in.
    # Return a simple success response so the frontend redirects to the
    # "application submitted" page instead of issuing a session token.
    if data["orgType"] == "provider":
        return jsonify({
            "pending": True,
            "message": "Registration successful. Your organization is pending admin approval.",
        }), 201

    # Client orgs are auto-approved and can log in immediately.
    db.organizations.update_one(
        {"_id": org_id},
        {"$set": {"status": "approved", "approvedAt": datetime.now()}}
    )
    token = issue_token(user_id, "org_admin", org_id)
    return jsonify({"token": token, "user": _user_public(user_doc)}), 201


# ─────────────────────────────────────────────────────────
# Forgot Password  →  sends 6-digit OTP to email
# ─────────────────────────────────────────────────────────
@bp.post("/forgot-password")
def forgot_password():
    """
    Step 1: User submits their email.
    Backend generates a 6-digit OTP, saves it with 1-hour expiry,
    invalidates any previous token, and sends the OTP via email.
    Response never reveals whether the email exists (security).
    """
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    if not email:
        return _err("BAD_REQUEST", "Email is required", 400)

    db = get_db()
    user = db.users.find_one({"email": email})

    # Always return same message to prevent email enumeration
    success_msg = "If an account with that email exists, an OTP has been sent."

    if user:
        # Generate 6-digit OTP
        otp = str(random.randint(100000, 999999))
        expiry = datetime.now() + timedelta(hours=1)

        # Invalidate any old token and save new one
        db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {
                "resetToken": otp,
                "resetTokenExpiry": expiry,
                "resetAttempts": 0,
            }}
        )

        # Send email (logs error internally if SMTP fails)
        full_name = user.get("fullName", "User")
        email_sent = send_reset_otp(to_email=email, otp=otp, full_name=full_name)

        if not email_sent:
            print(f"[WARN] Email send failed for {email}, OTP: {otp}")

    return jsonify({"message": success_msg})


# ─────────────────────────────────────────────────────────
# Verify OTP  →  confirms OTP is valid before allowing reset
# ─────────────────────────────────────────────────────────
@bp.post("/verify-otp")
def verify_otp():
    """
    Step 2: User submits email + OTP.
    If valid, returns a one-time resetKey that the client sends
    along with the new password in /reset-password.
    """
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    otp = (data.get("otp") or "").strip()

    if not email or not otp:
        return _err("BAD_REQUEST", "Email and OTP are required", 400)

    db = get_db()
    user = db.users.find_one({"email": email})

    if not user:
        return _err("INVALID_OTP", "Invalid OTP or email", 400)

    # Rate-limit: max 5 failed attempts per OTP
    if user.get("resetAttempts", 0) >= 5:
        db.users.update_one(
            {"_id": user["_id"]},
            {"$unset": {"resetToken": "", "resetTokenExpiry": "", "resetAttempts": ""}}
        )
        return _err("TOO_MANY_ATTEMPTS", "Too many failed attempts. Please request a new OTP.", 429)

    stored_otp = user.get("resetToken")
    expiry = user.get("resetTokenExpiry")

    # Strip timezone info from expiry if present, then compare
    if expiry and hasattr(expiry, 'tzinfo') and expiry.tzinfo is not None:
        expiry = expiry.replace(tzinfo=None)

    if not stored_otp or not expiry or datetime.now() > expiry:
        return _err("EXPIRED_OTP", "OTP has expired. Please request a new one.", 400)

    if otp != stored_otp:
        db.users.update_one(
            {"_id": user["_id"]},
            {"$inc": {"resetAttempts": 1}}
        )
        remaining = 5 - (user.get("resetAttempts", 0) + 1)
        return _err("INVALID_OTP", f"Invalid OTP. {remaining} attempts remaining.", 400)

    # OTP is valid — generate a secure one-time resetKey
    reset_key = secrets.token_urlsafe(48)
    db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "resetKey": reset_key,
            "resetKeyExpiry": datetime.now() + timedelta(minutes=10),
        },
        "$unset": {"resetToken": "", "resetTokenExpiry": "", "resetAttempts": ""}}
    )

    return jsonify({
        "message": "OTP verified successfully.",
        "resetKey": reset_key,
    })


# ─────────────────────────────────────────────────────────
# Reset Password  →  uses resetKey from verify-otp
# ─────────────────────────────────────────────────────────
@bp.post("/reset-password")
def reset_password():
    """
    Step 3: User submits resetKey + new password.
    Backend validates the key, hashes the new password, and cleans up.
    """
    data = request.get_json(silent=True) or {}
    reset_key = (data.get("resetKey") or "").strip()
    new_password = data.get("password") or ""

    if not reset_key or not new_password:
        return _err("BAD_REQUEST", "Reset key and new password are required", 400)

    if len(new_password) < 8:
        return _err("BAD_REQUEST", "Password must be at least 8 characters", 400)

    db = get_db()
    user = db.users.find_one({"resetKey": reset_key})

    if not user:
        return _err("INVALID_TOKEN", "Reset key is invalid or expired. Please start over.", 400)

    # Check expiry manually (handles both naive and aware datetimes)
    reset_key_expiry = user.get("resetKeyExpiry")
    if reset_key_expiry:
        if hasattr(reset_key_expiry, 'tzinfo') and reset_key_expiry.tzinfo is not None:
            reset_key_expiry = reset_key_expiry.replace(tzinfo=None)
        if datetime.now() > reset_key_expiry:
            return _err("INVALID_TOKEN", "Reset key is invalid or expired. Please start over.", 400)
    else:
        return _err("INVALID_TOKEN", "Reset key is invalid or expired. Please start over.", 400)

    # Update password and clean up all reset fields
    db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {"passwordHash": hash_password(new_password)},
            "$unset": {
                "resetKey": "",
                "resetKeyExpiry": "",
                "resetToken": "",
                "resetTokenExpiry": "",
                "resetAttempts": "",
            }
        }
    )

    write_audit(
        org_id=user["orgId"], user_id=user["_id"],
        action="updated", entity="user", entity_id=user["_id"],
        description="Password reset successfully via OTP verification",
    )

    return jsonify({"message": "Password has been successfully reset."})


@bp.get("/me")
@require_auth
def me():
    return jsonify({"user": _user_public(g.user)})