"""
Test Configuration and Fixtures

Proporciona fixtures reutilizables para todos los tests unitarios:
- Database mocking
- Session mocking
- Factory functions para crear instancias de prueba
- Configuración compartida
"""

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



