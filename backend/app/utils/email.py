"""
Email utilities
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

# Email Configuration
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


def send_email(to_email: str, subject: str, body: str) -> bool:
    """
    Send email using SMTP

    Args:
        to_email: Recipient email address
        subject: Email subject
        body: Email body (HTML supported)

    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # For development: just print the email content
        if not SMTP_USERNAME or not SMTP_PASSWORD:
            print(f"\n{'='*50}")
            print(f"📧 EMAIL (Development Mode)")
            print(f"{'='*50}")
            print(f"To: {to_email}")
            print(f"Subject: {subject}")
            print(f"\n{body}")
            print(f"{'='*50}\n")
            return True

        # Production: send actual email
        msg = MIMEMultipart()
        msg['From'] = SMTP_USERNAME
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'html'))

        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        return True

    except Exception as e:
        print(f"Failed to send email: {str(e)}")
        return False
