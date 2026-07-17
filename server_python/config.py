import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    MONGODB_URI = os.getenv("MONGODB_URI")
    MONGODB_DB = os.getenv("MONGODB_DB", "biverify")
    JWT_SECRET = os.getenv("JWT_SECRET")
    JWT_TTL_HOURS = int(os.getenv("JWT_TTL_HOURS", "12"))
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")

    @classmethod
    def validate(cls):
        missing = [k for k in ("MONGODB_URI", "JWT_SECRET") if not getattr(cls, k)]
        if missing:
            raise RuntimeError(
                f"Missing required env vars: {', '.join(missing)}. "
                f"Set them in server_python/.env"
            )
