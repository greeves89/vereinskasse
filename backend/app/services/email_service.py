import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from typing import Optional
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings
from app.models.email_log import EmailLog
import logging

logger = logging.getLogger(__name__)


async def send_email(
    db: AsyncSession,
    recipient: str,
    subject: str,
    html_body: str,
    text_body: Optional[str] = None,
    attachment: Optional[bytes] = None,
    attachment_filename: Optional[str] = None,
) -> bool:
    log_entry = EmailLog(
        recipient=recipient,
        subject=subject,
        status="pending",
    )
    db.add(log_entry)
    await db.flush()

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.SMTP_FROM
        msg["To"] = recipient

        if text_body:
            msg.attach(MIMEText(text_body, "plain", "utf-8"))
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        if attachment and attachment_filename:
            part = MIMEApplication(attachment, Name=attachment_filename)
            part["Content-Disposition"] = f'attachment; filename="{attachment_filename}"'
            msg.attach(part)

        if not settings.SMTP_HOST or settings.SMTP_HOST == "localhost":
            logger.warning(f"SMTP not configured, would send to {recipient}: {subject}")
            log_entry.status = "sent"
            log_entry.sent_at = datetime.now(timezone.utc)
            await db.commit()
            return True

        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER if settings.SMTP_USER else None,
            password=settings.SMTP_PASSWORD if settings.SMTP_PASSWORD else None,
            use_tls=False,
            start_tls=settings.SMTP_TLS,
        )

        log_entry.status = "sent"
        log_entry.sent_at = datetime.now(timezone.utc)
        await db.commit()
        return True

    except Exception as e:
        logger.error(f"Failed to send email to {recipient}: {e}")
        log_entry.status = "failed"
        log_entry.error = str(e)
        await db.commit()
        return False


def build_welcome_email(name: str, organization: str) -> tuple[str, str]:
    html = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
        <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <h1 style="color: #3b82f6; margin-bottom: 8px;">Willkommen bei VereinsKasse!</h1>
            <p style="color: #6b7280; margin-bottom: 24px;">Die Kassenverwaltung für Ihren Verein</p>
            
            <p>Hallo {name},</p>
            <p>herzlich willkommen bei <strong>VereinsKasse</strong>! Ihr Konto für <em>{organization}</em> wurde erfolgreich erstellt.</p>
            
            <h3 style="color: #374151;">Was Sie jetzt tun können:</h3>
            <ul style="color: #4b5563; line-height: 1.8;">
                <li>Mitglieder verwalten (bis zu 50 im kostenlosen Plan)</li>
                <li>Einnahmen und Ausgaben im Kassenbuch erfassen</li>
                <li>Kategorien anlegen und Statistiken einsehen</li>
                <li>Mit Premium unlimitierte Mitglieder und PDF-Exporte</li>
            </ul>
            
            <div style="text-align: center; margin: 32px 0;">
                <a href="{settings.FRONTEND_URL}/dashboard" 
                   style="background: #3b82f6; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                    Zum Dashboard
                </a>
            </div>
            
            <p style="color: #9ca3af; font-size: 14px; margin-top: 32px;">
                Falls Sie Fragen haben, nutzen Sie die Feedback-Funktion in der App.
            </p>
        </div>
    </body>
    </html>
    """
    text = f"Willkommen bei VereinsKasse, {name}! Ihr Konto für {organization} wurde erstellt. Login: {settings.FRONTEND_URL}"
    return html, text


def build_payment_reminder_email(
    member_name: str,
    organization: str,
    amount: float,
    due_date: str,
    notes: Optional[str] = None,
) -> tuple[str, str]:
    html = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
        <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <h1 style="color: #f59e0b;">Zahlungserinnerung</h1>
            <p style="color: #6b7280;">von {organization}</p>
            
            <p>Sehr geehrte/r {member_name},</p>
            <p>wir möchten Sie freundlich daran erinnern, dass folgende Zahlung aussteht:</p>
            
            <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 20px; margin: 24px 0;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: #374151; font-weight: bold;">Betrag:</span>
                    <span style="color: #374151; font-size: 20px; font-weight: bold;">{amount:.2f} €</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span style="color: #374151; font-weight: bold;">Fälligkeitsdatum:</span>
                    <span style="color: #374151;">{due_date}</span>
                </div>
                {f'<p style="color: #6b7280; margin-top: 12px; margin-bottom: 0;">{notes}</p>' if notes else ''}
            </div>
            
            <p>Bitte überweisen Sie den fälligen Betrag auf unser Vereinskonto.</p>
            <p>Falls Sie bereits gezahlt haben, bitten wir Sie, diese E-Mail zu ignorieren.</p>
            
            <p style="margin-top: 32px;">Mit freundlichen Grüßen,<br><strong>{organization}</strong></p>
        </div>
    </body>
    </html>
    """
    text = f"Zahlungserinnerung von {organization}: {amount:.2f} € fällig am {due_date}."
    return html, text


def build_feedback_response_email(
    user_name: str,
    feedback_title: str,
    feedback_type: str,
    admin_response: str,
    status: str,
) -> tuple[str, str]:
    status_labels = {"approved": "angenommen", "rejected": "abgelehnt", "in_review": "in Bearbeitung"}
    status_colors = {"approved": "#10b981", "rejected": "#ef4444", "in_review": "#f59e0b"}
    status_label = status_labels.get(status, status)
    status_color = status_colors.get(status, "#6b7280")

    html = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
        <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <h1 style="color: #3b82f6;">Antwort auf Ihr Feedback</h1>
            
            <p>Hallo {user_name},</p>
            <p>Ihr Feedback wurde bearbeitet:</p>
            
            <div style="background: #f9fafb; border-left: 4px solid {status_color}; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
                <p style="margin: 0 0 8px; color: #374151;"><strong>Titel:</strong> {feedback_title}</p>
                <p style="margin: 0 0 8px; color: #374151;"><strong>Typ:</strong> {feedback_type}</p>
                <p style="margin: 0; color: {status_color};"><strong>Status:</strong> {status_label}</p>
            </div>
            
            <h3 style="color: #374151;">Antwort des Teams:</h3>
            <p style="color: #4b5563; background: #f9fafb; padding: 16px; border-radius: 8px;">{admin_response}</p>
            
            <p style="color: #9ca3af; font-size: 14px; margin-top: 32px;">
                Vielen Dank für Ihr Feedback - es hilft uns, VereinsKasse besser zu machen!
            </p>
        </div>
    </body>
    </html>
    """
    text = f"Antwort auf Ihr Feedback '{feedback_title}': Status={status_label}. {admin_response}"
    return html, text
