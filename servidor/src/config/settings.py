"""
Application settings and configuration
"""
from pydantic_settings import BaseSettings
from functools import lru_cache
import os
from pathlib import Path




class Settings(BaseSettings):
    """Application settings with environment variable support"""
    
    # ===== DATABASE & MIGRATIONS =====
    DATABASE_URL: str = "postgresql://rdev:rdev@localhost:5432/asistencia"
    AUTO_MIGRATE: bool = False  # Set to True to apply migrations on startup
    
    # ===== APPLICATION CORE =====
    SECRET_KEY: str = "your-secret-key-change-in-production"  # ⚠️ MUST change in production
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    TIMEZONE: str = "America/Lima"
    
    # ===== UPLOAD & FILE HANDLING =====
    UPLOAD_DIR: str = "recognize/data"  # Recognition data directory (unchanged from recognize module)
    REPORTS_DIR: str = "public/reports"  # Reports directory
    TEMP_DIR: str = "public/temp"  # Temporary files directory
    MAX_FILE_SIZE: int = 10485760  # 10MB in bytes
    ALLOWED_IMAGE_EXTENSIONS: set = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
    
    # ===== SECURITY & JWT =====
    PASSWORD_MIN_LENGTH: int = 8  # Minimum password length for users
    JWT_SECRET_KEY: str = "your-jwt-secret-key-change-in-production"  # ⚠️ MUST change in production
    JWT_ALGORITHM: str = "HS256"  # JWT algorithm (HS256, RS256, etc.)
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 50  # Access token expiration time
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7  # Refresh token expiration time
    
    # ===== EMAIL CONFIGURATION (SMTP) =====
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 465
    SMTP_USER: str = ""  # Email account (configure in .env)
    SMTP_PASSWORD: str = ""  # Email password/app token (configure in .env)
    SMTP_FROM_EMAIL: str = ""  # Sender email (configure in .env)
    SMTP_FROM_NAME: str = "Sistema de Asistencia"  # Sender display name
    SMTP_TLS: bool = True  # Use TLS encryption

    # ===== MAIL API (external HTTP mail service) =====
    # URL base de la API de envío de correos (ej: http://localhost:3001)
    MAIL_API_URL: str = "http://localhost:3001"
    # Credenciales para autorizar en la API de correo (se pasan como headers)
    MAIL_API_CLIENT_ID: str = ""
    MAIL_API_SECRET: str = ""
    
    # ===== ALERTS & THRESHOLDS =====
    # Número máximo de tardanzas antes de enviar alerta
    TARDANZAS_MAX_ALERTA: int = 3
    # Número máximo de faltas antes de enviar alerta
    FALTAS_MAX_ALERTA: int = 2
    # Minutos de retraso para considerar como tardanza
    MINUTOS_TARDANZA: int = 15
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """
    Singleton pattern for settings.
    Returns cached settings instance.
    """
    return Settings()


# Ensure upload directory exists
def ensure_directories():
    """Create necessary directories if they don't exist"""
    settings = get_settings()
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
    Path(settings.REPORTS_DIR).mkdir(parents=True, exist_ok=True)
    Path(settings.TEMP_DIR).mkdir(parents=True, exist_ok=True)
