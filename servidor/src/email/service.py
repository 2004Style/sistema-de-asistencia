"""
Email service for sending notifications and reports
Similar to nodemailer in Node.js, but using aiosmtplib for Python
"""
from typing import List, Optional, Dict, Any
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from pathlib import Path
from jinja2 import Template
from src.config.settings import get_settings
import logging

logger = logging.getLogger(__name__)
settings = get_settings()


class EmailService:
    """
    Service for sending emails with support for templates and attachments.
    Similar to nodemailer in Node.js
    """
    
    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD
        self.from_email = settings.SMTP_FROM_EMAIL
        self.from_name = settings.SMTP_FROM_NAME
        self.use_tls = settings.SMTP_TLS
    
    async def send_email(
        self,
        to_email: str | List[str],
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        attachments: Optional[List[Dict[str, Any]]] = None
    ) -> bool:
        """
        Send an email with optional attachments
        
        Args:
            to_email: Recipient email address or list of addresses
            subject: Email subject
            html_content: HTML content of the email
            text_content: Plain text content (fallback)
            cc: List of CC recipients
            bcc: List of BCC recipients
            attachments: List of attachments [{"filename": "file.pdf", "path": "/path/to/file.pdf"}]
        
        Returns:
            bool: True if email was sent successfully
        """
        try:
            # Validate configuration
            if not self.smtp_user or not self.smtp_password:
                logger.error("Email credentials not configured")
                return False
            
            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = f"{self.from_name} <{self.from_email}>"
            
            # Handle recipients
            if isinstance(to_email, str):
                to_email = [to_email]
            message["To"] = ", ".join(to_email)
            
            if cc:
                message["Cc"] = ", ".join(cc)
            
            # Add text and HTML parts
            if text_content:
                text_part = MIMEText(text_content, "plain")
                message.attach(text_part)
            
            html_part = MIMEText(html_content, "html")
            message.attach(html_part)
            
            # Add attachments
            if attachments:
                for attachment in attachments:
                    filename = attachment.get("filename")
                    filepath = attachment.get("path")
                    
                    if filepath and Path(filepath).exists():
                        with open(filepath, "rb") as f:
                            part = MIMEApplication(f.read(), Name=filename)
                            part["Content-Disposition"] = f'attachment; filename="{filename}"'
                            message.attach(part)
            
            # Send email
            recipients = to_email + (cc or []) + (bcc or [])
            
            await aiosmtplib.send(
                message,
                hostname=self.smtp_host,
                port=self.smtp_port,
                username=self.smtp_user,
                password=self.smtp_password,
                use_tls=self.use_tls,
                recipients=recipients
            )
            
            logger.info(f"Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending email: {str(e)}")
            return False
    
    async def send_tardanza_notification(
        self,
        user_email: str,
        user_name: str,
        fecha: str,
        hora_entrada: str,
        minutos_tarde: int,
        supervisor_email: Optional[str] = None
    ) -> bool:
        """
        Send tardanza (late arrival) notification to employee and supervisor
        """
        subject = f"⚠️ Notificación de Tardanza - {fecha}"
        
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; padding: 20px;">
                    <h2 style="color: #ff6b6b;">⚠️ Notificación de Tardanza</h2>
                    <p>Estimado/a <strong>{user_name}</strong>,</p>
                    <p>Se ha registrado una tardanza en su asistencia:</p>
                    <ul>
                        <li><strong>Fecha:</strong> {fecha}</li>
                        <li><strong>Hora de entrada:</strong> {hora_entrada}</li>
                        <li><strong>Minutos de retraso:</strong> {minutos_tarde} minutos</li>
                    </ul>
                    <p style="color: #666;">Por favor, procure llegar a tiempo en futuras ocasiones.</p>
                    <hr style="margin: 20px 0;">
                    <p style="font-size: 12px; color: #999;">
                        Este es un mensaje automático del Sistema de Asistencia.
                    </p>
                </div>
            </body>
        </html>
        """
        
        recipients = [user_email]
        if supervisor_email:
            recipients.append(supervisor_email)
        
        return await self.send_email(
            to_email=recipients,
            subject=subject,
            html_content=html_content
        )
    
    async def send_ausencia_notification(
        self,
        user_email: str,
        user_name: str,
        fecha: str,
        supervisor_email: Optional[str] = None
    ) -> bool:
        """
        Send absence notification for unjustified absence
        """
        subject = f"🚫 Alerta de Ausencia No Justificada - {fecha}"
        
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; padding: 20px;">
                    <h2 style="color: #e74c3c;">🚫 Alerta de Ausencia</h2>
                    <p>Estimado/a <strong>{user_name}</strong>,</p>
                    <p>No se ha registrado su asistencia para el día:</p>
                    <ul>
                        <li><strong>Fecha:</strong> {fecha}</li>
                    </ul>
                    <p style="color: #e74c3c; font-weight: bold;">
                        Esta ausencia aparece como NO JUSTIFICADA.
                    </p>
                    <p>Si tiene una justificación válida, por favor comuníquese con su supervisor o el área de recursos humanos.</p>
                    <hr style="margin: 20px 0;">
                    <p style="font-size: 12px; color: #999;">
                        Este es un mensaje automático del Sistema de Asistencia.
                    </p>
                </div>
            </body>
        </html>
        """
        
        recipients = [user_email]
        if supervisor_email:
            recipients.append(supervisor_email)
        
        return await self.send_email(
            to_email=recipients,
            subject=subject,
            html_content=html_content
        )
    
    async def send_alerta_acumulada(
        self,
        user_email: str,
        user_name: str,
        tipo_alerta: str,  # "tardanzas" o "faltas"
        cantidad: int,
        supervisor_email: Optional[str] = None
    ) -> bool:
        """
        Send accumulated alert when user reaches threshold of late arrivals or absences
        """
        emoji = "⚠️" if tipo_alerta == "tardanzas" else "🚨"
        tipo_texto = "Tardanzas" if tipo_alerta == "tardanzas" else "Faltas"
        
        subject = f"{emoji} Alerta Acumulada - {cantidad} {tipo_texto}"
        
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; padding: 20px;">
                    <h2 style="color: #e67e22;">{emoji} Alerta Importante</h2>
                    <p>Estimado/a <strong>{user_name}</strong>,</p>
                    <p style="font-size: 16px; color: #e67e22; font-weight: bold;">
                        Ha acumulado {cantidad} {tipo_texto.lower()} en el período actual.
                    </p>
                    <p>Este mensaje es una alerta para que tome las medidas correspondientes.</p>
                    <p style="color: #666;">
                        Por favor, revise su asistencia y tome las acciones necesarias para mejorar su puntualidad y asistencia.
                    </p>
                    <hr style="margin: 20px 0;">
                    <p style="font-size: 12px; color: #999;">
                        Este es un mensaje automático del Sistema de Asistencia.
                    </p>
                </div>
            </body>
        </html>
        """
        
        recipients = [user_email]
        if supervisor_email:
            recipients.append(supervisor_email)
        
        return await self.send_email(
            to_email=recipients,
            subject=subject,
            html_content=html_content
        )
    
    async def send_report_email(
        self,
        to_email: str | List[str],
        report_type: str,
        period: str,
        attachments: List[Dict[str, Any]]
    ) -> bool:
        """
        Send report by email with attachments
        
        Args:
            to_email: Recipient(s)
            report_type: Type of report (daily, weekly, monthly)
            period: Period covered by the report
            attachments: List of report files to attach
        """
        subject = f"📊 Reporte de Asistencia {report_type.title()} - {period}"
        
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; padding: 20px;">
                    <h2 style="color: #3498db;">📊 Reporte de Asistencia</h2>
                    <p>Se adjunta el reporte {report_type} de asistencia correspondiente al período:</p>
                    <p style="font-size: 16px; font-weight: bold; color: #2c3e50;">
                        {period}
                    </p>
                    <p>Los archivos adjuntos contienen la información detallada en formatos PDF y Excel.</p>
                    <hr style="margin: 20px 0;">
                    <p style="font-size: 12px; color: #999;">
                        Este es un mensaje automático del Sistema de Asistencia.
                    </p>
                </div>
            </body>
        </html>
        """
        
        return await self.send_email(
            to_email=to_email,
            subject=subject,
            html_content=html_content,
            attachments=attachments
        )


# Singleton instance
email_service = EmailService()
