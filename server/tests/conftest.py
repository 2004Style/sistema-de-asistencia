"""
Test Configuration and Fixtures

Proporciona fixtures reutilizables para todos los tests unitarios:
- Database mocking
- Session mocking
- Factory functions para crear instancias de prueba
- Configuración compartida
"""

import os
import sys
from pathlib import Path

# Configurar variables de entorno para tests ANTES de cualquier import
def pytest_configure(config):
    """Configurar entorno de testing antes de ejecutar tests."""
    # Obtener ruta al directorio server
    server_dir = Path(__file__).parent.parent
    env_test_file = server_dir / ".env.test"
    
    # Si existe .env.test, cargar las variables
    if env_test_file.exists():
        from dotenv import load_dotenv
        load_dotenv(env_test_file)
        print(f"✓ Variables de entorno cargadas desde {env_test_file}")
    else:
        print(f"⚠️  Archivo {env_test_file} no encontrado")
        # Configurar valores mínimos para evitar errores
        os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
        os.environ.setdefault("SECRET_KEY", "test-secret-key")
        os.environ.setdefault("JWT_SECRET_KEY", "test-jwt-secret")
        os.environ.setdefault("DEBUG", "true")
        os.environ.setdefault("UPLOAD_DIR", "./test_uploads")
        os.environ.setdefault("REPORTS_DIR", "./test_reports")
        os.environ.setdefault("TEMP_DIR", "./test_temp")
        os.environ.setdefault("MAX_FILE_SIZE", "5242880")
        os.environ.setdefault("PASSWORD_MIN_LENGTH", "8")
        os.environ.setdefault("MAIL_API_URL", "http://localhost:8080")
        os.environ.setdefault("MAIL_API_CLIENT_ID", "test-client")
        os.environ.setdefault("MAIL_API_SECRET", "test-secret")
        os.environ.setdefault("SMTP_FROM_EMAIL", "test@test.com")
        os.environ.setdefault("SMTP_FROM_NAME", "Test")
        os.environ.setdefault("TARDANZAS_MAX_ALERTA", "3")
        os.environ.setdefault("FALTAS_MAX_ALERTA", "2")
        os.environ.setdefault("MINUTOS_TARDANZA", "15")
        os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")
        os.environ.setdefault("AUTO_MIGRATE", "false")

import pytest
from unittest.mock import MagicMock, patch





# ===== FIXTURES PARA TESTS DE SERVICIOS CON MODELOS =====

@pytest.fixture
def mock_role_model():
    """Mock de la clase Role para evitar problemas con SQLAlchemy."""
    with patch('src.roles.service.Role') as mock:
        mock.return_value = MagicMock(id=1, nombre="ADMIN")
        yield mock




@pytest.fixture
def mock_turno_model():
    """Mock de la clase Turno para tests de TurnoService."""
    with patch('src.turnos.service.Turno') as mock:
        mock.return_value = MagicMock(id=1, nombre="TURNO1")
        yield mock



