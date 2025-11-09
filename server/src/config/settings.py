"""
Application settings and configuration
"""
from pydantic_settings import BaseSettings
from pydantic import field_validator
from functools import lru_cache
import os
from pathlib import Path
from typing import List


# Check if running tests
def _is_testing():
    """Check if pytest is running"""
    return "pytest" in os.environ.get("_", "") or "PYTEST_CURRENT_TEST" in os.environ


class Settings(BaseSettings):
    """Application settings with environment variable support"""
    
    # ===== DATABASE & MIGRATIONS =====
    DATABASE_URL: str  # Debe venir del .env
    AUTO_MIGRATE: bool = False  # Set to True to apply migrations on startup
    
    # ===== APPLICATION CORE =====
    SECRET_KEY: str  # Debe venir del .env
    DEBUG: bool
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    TIMEZONE: str = "America/Lima"
    
    # ===== CORS CONFIGURATION =====
    # Orígenes permitidos para CORS (separados por comas en .env)
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3001"  # Parsear a lista en method
    
    # ===== UPLOAD & FILE HANDLING =====
    UPLOAD_DIR: str  # Debe venir del .env
    REPORTS_DIR: str  # Debe venir del .env
    TEMP_DIR: str  # Debe venir del .env
    MAX_FILE_SIZE: int  # Debe venir del .env
    ALLOWED_IMAGE_EXTENSIONS: set = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
    
    # ===== SECURITY & JWT =====
    PASSWORD_MIN_LENGTH: int  # Debe venir del .env
    JWT_SECRET_KEY: str  # Debe venir del .env
    JWT_ALGORITHM: str = "HS256"  # JWT algorithm (HS256, RS256, etc.)
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 50  # Access token expiration time
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7  # Refresh token expiration time
    
    # ===== MAIL API (external HTTP mail service) =====
    # URL base de la API de envío de correos (ej: http://localhost:3001)
    MAIL_API_URL: str  # Debe venir del .env
    # Credenciales para autorizar en la API de correo (se pasan como headers)
    MAIL_API_CLIENT_ID: str  # Debe venir del .env
    MAIL_API_SECRET: str  # Debe venir del .env
    # Email de origen para los correos (configurar en .env)
    SMTP_FROM_EMAIL: str  # Debe venir del .env
    SMTP_FROM_NAME: str  # Debe venir del .env
    
    # ===== ALERTS & THRESHOLDS =====
    # Número máximo de tardanzas antes de enviar alerta
    TARDANZAS_MAX_ALERTA: int  # Debe venir del .env
    # Número máximo de faltas antes de enviar alerta
    FALTAS_MAX_ALERTA: int  # Debe venir del .env
    # Minutos de retraso para considerar como tardanza
    MINUTOS_TARDANZA: int  # Debe venir del .env
    
    class Config:
        # Use .env.test when running tests, .env otherwise
        env_file = ".env.test" if _is_testing() else ".env"
        case_sensitive = True
    
    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: str) -> str:
        """
        ✅ Valida y parsea CORS_ORIGINS
        Acepta: "http://localhost:3000,http://localhost:3001"
        Retorna: Lista limpiada
        """
        if isinstance(v, str):
            # Limpiar espacios y retornar como lista
            return ",".join([origin.strip() for origin in v.split(",") if origin.strip()])
        return v
    
    def get_cors_origins_list(self) -> List[str]:
        """
        ✅ Método para obtener CORS_ORIGINS como lista
        Uso: settings.get_cors_origins_list()
        """
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


@lru_cache()
def get_settings() -> Settings:
    """
    Singleton pattern for settings.
    Returns cached settings instance.
    Automatically loads .env.test when running pytest.
    """
    return Settings()


# Ensure upload directory exists
def ensure_directories():
    """Create necessary directories if they don't exist"""
    settings = get_settings()
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
    Path(settings.REPORTS_DIR).mkdir(parents=True, exist_ok=True)
    Path(settings.TEMP_DIR).mkdir(parents=True, exist_ok=True)
