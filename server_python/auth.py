from datetime import datetime, timezone, timedelta
from functools import wraps
import bcrypt
import jwt
from bson import ObjectId
from bson.errors import InvalidId
from flask import request, g, jsonify
from config import Config
from db import get_db


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    if not hashed:
        return False
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def issue_token(user_id, role: str, org_id) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "role": role,
        "orgId": str(org_id),
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=Config.JWT_TTL_HOURS)).timestamp()),
    }
    return jwt.encode(payload, Config.JWT_SECRET, algorithm="HS256")


def _decode(token: str):
    return jwt.decode(token, Config.JWT_SECRET, algorithms=["HS256"])


def _err(code: str, message: str, status: int):
    return jsonify({"error": {"code": code, "message": message}}), status


def require_auth(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        header = request.headers.get("Authorization", "")
        if not header.startswith("Bearer "):
            return _err("UNAUTHORIZED", "Missing bearer token", 401)
        token = header.split(" ", 1)[1].strip()
        try:
            claims = _decode(token)
        except jwt.ExpiredSignatureError:
            return _err("UNAUTHORIZED", "Token expired", 401)
        except jwt.InvalidTokenError:
            return _err("UNAUTHORIZED", "Invalid token", 401)

        try:
            user = get_db().users.find_one({"_id": ObjectId(claims["sub"])})
        except InvalidId:
            return _err("UNAUTHORIZED", "Invalid token subject", 401)
        if not user or user.get("isActive") is False:
            return _err("UNAUTHORIZED", "User not found or inactive", 401)

        g.user = user
        g.claims = claims
        return fn(*args, **kwargs)
    return wrapper


def require_role(*roles):
    def decorator(fn):
        @wraps(fn)
        @require_auth
        def wrapper(*args, **kwargs):
            if g.user.get("role") not in roles:
                return _err("FORBIDDEN", f"Requires role: {', '.join(roles)}", 403)
            return fn(*args, **kwargs)
        return wrapper
    return decorator