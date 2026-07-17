import secrets
import io
import base64
import qrcode


def generate_token(nbytes: int = 16) -> str:
    """Random URL-safe token. 16 bytes = 128 bits of entropy."""
    return secrets.token_urlsafe(nbytes)


def make_qr_png(payload: str) -> bytes:
    """Render `payload` as a PNG QR code, return raw bytes."""
    img = qrcode.make(payload)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def make_qr_data_url(payload: str) -> str:
    b64 = base64.b64encode(make_qr_png(payload)).decode("ascii")
    return f"data:image/png;base64,{b64}"
