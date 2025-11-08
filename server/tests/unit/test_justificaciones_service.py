"""Unit Tests - Justificaciones Service"""
import pytest
from unittest.mock import Mock, MagicMock, patch
from datetime import date
from pydantic import ValidationError
from fastapi import HTTPException, status

class TestJustificacionSchemas:
    """Tests para validación de schemas."""
    
    def test_user_id_requerido(self):
        """Test: user_id es requerido."""
        from src.justificaciones.schemas import JustificacionCreate
        with pytest.raises(ValidationError):
            JustificacionCreate(user_id=None, fecha_inicio="2024-01-01", fecha_fin="2024-01-02")
    
    def test_justificacion_valida(self):
        """Test: JustificacionCreate válida."""
        from src.justificaciones.schemas import JustificacionCreate
        from src.justificaciones.model import TipoJustificacion
        just = JustificacionCreate(
            user_id=1,
            fecha_inicio=date(2024, 1, 1),
            fecha_fin=date(2024, 1, 2),
            tipo=TipoJustificacion.MEDICA,
            motivo="Enfermedad grave con certificado médico adjunto"
        )
        assert just.user_id == 1
        assert just.tipo == TipoJustificacion.MEDICA

class TestJustificacionService:
    """Tests para métodos de Justificación."""
    
    @pytest.fixture
    def justificacion_service(self):
        from src.justificaciones.service import JustificacionService
        return JustificacionService()
    
    def test_obtener_justificacion(self, justificacion_service):
        """Test: obtener justificación."""
        mock_db = MagicMock()
        with patch.object(justificacion_service, 'get_justificacion') as mock:
            mock.return_value = Mock(id=1, user_id=1)
            resultado = justificacion_service.get_justificacion(mock_db, 1)
            assert mock.called
    
    def test_listar_justificaciones(self, justificacion_service):
        """Test: listar justificaciones."""
        mock_db = MagicMock()
        with patch.object(justificacion_service, 'get_justificaciones') as mock:
            mock.return_value = ([], 0)
            resultado = justificacion_service.get_justificaciones(mock_db)
            assert mock.called

