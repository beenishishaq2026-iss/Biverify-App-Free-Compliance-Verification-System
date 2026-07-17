"""
Email service for sending password reset OTPs via SMTP.
Uses Python's built-in smtplib — no extra packages needed.
"""
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()

EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_USER = os.getenv("EMAIL_USER", "")
EMAIL_PASS = os.getenv("EMAIL_PASS", "")
EMAIL_FROM = os.getenv("EMAIL_FROM", EMAIL_USER)


def send_reset_otp(to_email: str, otp: str, full_name: str = "User") -> bool:
    """
    Send a password-reset OTP email.
    Returns True on success, False on failure (logs error to console).
    """
    subject = "BiVerify — Password Reset OTP"

    html_body = f"""
    <div style="font-family:'Inter',Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;">
        <div style="text-align:center;margin-bottom:28px;">
            <div style="display:inline-block;background:#2b9d4e;color:#fff;font-size:20px;font-weight:700;padding:10px 22px;border-radius:8px;letter-spacing:0.5px;">
                ∞ Bi-Verify
            </div>
        </div>

        <h2 style="color:#1a1d23;font-size:22px;margin:0 0 8px 0;">Password Reset Request</h2>
        <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 24px 0;">
            Hi <strong>{full_name}</strong>, we received a request to reset your password.
            Use the OTP below to proceed. This code is valid for <strong>1 hour</strong>.
        </p>

        <div style="background:#f0fdf4;border:2px dashed #2b9d4e;border-radius:10px;padding:20px;text-align:center;margin-bottom:24px;">
            <span style="font-size:36px;font-weight:800;letter-spacing:8px;color:#2b9d4e;">{otp}</span>
        </div>

        <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0 0 8px 0;">
            If you did not request this, please ignore this email — your password will remain unchanged.
        </p>

        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0 16px 0;" />
        <p style="color:#9ca3af;font-size:11px;text-align:center;margin:0;">
            © BiVerify Compliance System — All rights reserved.
        </p>
    </div>
    """

    plain_body = (
        f"Hi {full_name},\n\n"
        f"Your BiVerify password reset OTP is: {otp}\n\n"
        f"This code is valid for 1 hour.\n"
        f"If you did not request this, please ignore this email.\n\n"
        f"— BiVerify Team"
    )

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = EMAIL_FROM
    msg["To"] = to_email
    msg.attach(MIMEText(plain_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT, timeout=15) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(EMAIL_USER, EMAIL_PASS)
            server.sendmail(EMAIL_USER, to_email, msg.as_string())
        print(f"[EMAIL] OTP sent successfully to {to_email}")
        return True
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send OTP to {to_email}: {e}")
        return False
