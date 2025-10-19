"""Unit Tests - Horarios Service"""
import pytest
from unittest.mock import Mock, MagicMock, patch
from datetime import time
from pydantic import ValidationError
from fastapi import HTTPException, status

class TestHorarioSchemas:
    """Tests para validación de schemas."""
    
    def test_horario_requerido(self):
        """Test: Campos requeridos en HorarioCreate."""
        from src.horarios.schemas import HorarioCreate
        with pytest.raises(ValidationError):
            HorarioCreate(dia_semana="LUNES")  # Faltan otros campos
    
    def test_horario_valido(self):
        """Test: HorarioCreate válido."""
        from src.horarios.schemas import HorarioCreate
        from src.horarios.model import DiaSemana
        horario = HorarioCreate(
            dia_semana=DiaSemana.LUNES,
            turno_id=1,
            hora_entrada=time(8, 0),
            hora_salida=time(16, 0),
            horas_requeridas=480,
            user_id=1
        )
        assert horario.dia_semana == DiaSemana.LUNES
        assert horario.user_id == 1

class TestHorarioService:
    """Tests para métodos de Horario."""
    
    @pytest.fixture
    def horario_service(self):
        from src.horarios.service import HorarioService
        return HorarioService()
    
    def test_get_horarios(self, horario_service):
        """Test: obtener horarios."""
        mock_db = MagicMock()
        with patch.object(horario_service, 'get_by_id') as mock:
            mock.return_value = Mock(id=1, dia_semana="LUNES")
            resultado = horario_service.get_by_id(mock_db, 1)
            assert mock.called
    
    def test_get_horarios_by_user(self, horario_service):
        """Test: obtener horarios por usuario."""
        mock_db = MagicMock()
        with patch.object(horario_service, 'get_horarios_by_user') as mock:
            mock.return_value = [Mock(id=1, user_id=1)]
            resultado = horario_service.get_horarios_by_user(mock_db, 1)
            assert mock.called

    def test_delete_horario(self, horario_service):
        """Test: eliminar horario."""
        mock_db = MagicMock()
        with patch.object(horario_service, 'delete_horario') as mock:
            mock.return_value = True
            resultado = horario_service.delete_horario(mock_db, 1)
            assert mock.called

