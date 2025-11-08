"""Unit Tests - Users Service"""
import pytest
from unittest.mock import Mock, MagicMock, patch
from pydantic import ValidationError
from fastapi import HTTPException, status

class TestUserSchemas:
    """Tests para validación de schemas."""
    
    def test_email_requerido(self):
        """Test: Email es requerido."""
        from src.users.schemas import UserCreate
        with pytest.raises(ValidationError):
            UserCreate(email="", password="Pass123", name="John", codigo_user="U1", role_id=1)
    
    def test_usuario_valido(self):
        """Test: UserCreate válido."""
        from src.users.schemas import UserCreate
        user = UserCreate(
            email="test@test.com",
            password="Pass12345",
            confirm_password="Pass12345",
            name="John",
            codigo_user="U1",
            role_id=1
        )
        assert user.email == "test@test.com"

class TestUserService:
    """Tests para métodos de Usuario."""
    
    @pytest.fixture
    def user_service(self):
        from src.users.service import UserService
        return UserService()
    
    def test_obtener_por_email(self, user_service):
        """Test: obtener usuario por email."""
        mock_db = MagicMock()
        with patch.object(user_service, 'get_by_field') as mock:
            mock.return_value = Mock(id=1, email="test@test.com")
            resultado = user_service.get_by_email(mock_db, "test@test.com")
            assert mock.called
    
    def test_email_existe(self, user_service):
        """Test: verificar email existe."""
        mock_db = MagicMock()
        with patch.object(user_service, 'field_exists') as mock:
            mock.return_value = True
            resultado = user_service.email_exists(mock_db, "test@test.com")
            assert resultado is True
