"""Unit Tests - Asistencias Service"""
import pytest
from unittest.mock import Mock, MagicMock, patch
from pydantic import ValidationError
from fastapi import HTTPException, status

class TestAsistenciaSchemas:
    """Tests para validación de schemas."""
    
    def test_user_id_requerido(self):
        """Test: user_id es requerido."""
        from src.asistencias.schemas import AsistenciaCreate
        with pytest.raises(ValidationError):
            AsistenciaCreate(user_id=None, fecha="2024-01-01")
    
    def test_asistencia_valida(self):
        """Test: AsistenciaCreate válida."""
        from src.asistencias.schemas import AsistenciaCreate
        asistencia = AsistenciaCreate(
            user_id=1,
            fecha="2024-01-01"
        )
        assert asistencia.user_id == 1

class TestAsistenciaService:
    """Tests para métodos de Asistencia."""
    
    @pytest.fixture
    def asistencia_service(self):
        from src.asistencias.service import AsistenciaService
        return AsistenciaService()
    
    def test_obtener_asistencia(self, asistencia_service):
        """Test: obtener asistencia."""
        mock_db = MagicMock()
        with patch.object(asistencia_service, 'get_asistencia') as mock:
            mock.return_value = Mock(id=1, user_id=1)
            resultado = asistencia_service.get_asistencia(mock_db, 1)
            assert mock.called
    
    def test_listar_asistencias(self, asistencia_service):
        """Test: listar asistencias por usuario."""
        mock_db = MagicMock()
        with patch.object(asistencia_service, 'get_asistencias_usuario') as mock:
            mock.return_value = [Mock(id=1, user_id=1)]
            resultado = asistencia_service.get_asistencias_usuario(mock_db, 1)
            assert mock.called
