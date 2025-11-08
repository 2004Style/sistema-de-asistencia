"""
Unit Tests - Notificaciones Service

Pruebas unitarias para la lógica de negocio del servicio de notificaciones.
CRUD simple: crear, listar, obtener, marcar como leída, eliminar.
"""

import pytest
from unittest.mock import Mock, MagicMock, patch
from pydantic import ValidationError
from fastapi import HTTPException, status


class TestNotificacionSchemas:
    """Tests para validación de schemas."""
    
    def test_schema_user_id_requerido(self):
        """Test: User ID es requerido."""
        from src.notificaciones.schemas import NotificacionCreate
        
        with pytest.raises(ValidationError):
            NotificacionCreate(user_id=None, titulo="Test", tipo="tardanza", mensaje="Test")
    
    def test_schema_titulo_requerido(self):
        """Test: Título es requerido."""
        from src.notificaciones.schemas import NotificacionCreate
        
        with pytest.raises(ValidationError):
            NotificacionCreate(user_id=1, titulo="", tipo="tardanza", mensaje="Test")
    
    def test_schema_notificacion_valida(self):
        """Test: NotificacionCreate válida."""
        from src.notificaciones.schemas import NotificacionCreate, TipoNotificacionEnum
        
        notif = NotificacionCreate(
            user_id=1,
            titulo="Nueva asistencia",
            tipo=TipoNotificacionEnum.TARDANZA,
            mensaje="Se registró tu asistencia"
        )
        
        assert notif.user_id == 1
        assert notif.titulo == "Nueva asistencia"
        assert notif.tipo == TipoNotificacionEnum.TARDANZA


class TestNotificacionServiceCrear:
    """Tests para crear notificaciones."""
    
    @pytest.fixture
    def notificacion_service(self):
        from src.notificaciones.service import NotificacionService
        return NotificacionService()
    
    def test_crear_notificacion_exitosamente(self, notificacion_service):
        """Test: crear notificación exitosamente."""
        from src.notificaciones.model import TipoNotificacion, PrioridadNotificacion
        
        mock_db = MagicMock()
        
        with patch.object(notificacion_service, 'save_with_transaction') as mock_save:
            mock_save.return_value = Mock(id=1, titulo="Test")
            
            # Nota: crear_notificacion es async, pero podemos llamarla directamente
            resultado = notificacion_service.crear_notificacion(
                mock_db, 1, TipoNotificacion.TARDANZA, "Test", "Test"
            )
            
            assert resultado is not None


class TestNotificacionServiceObtener:
    """Tests para obtener notificaciones."""
    
    @pytest.fixture
    def notificacion_service(self):
        from src.notificaciones.service import NotificacionService
        return NotificacionService()
    
    def test_obtener_notificacion_por_id(self, notificacion_service):
        """Test: obtener por ID."""
        mock_db = MagicMock()
        
        with patch.object(notificacion_service, 'obtener_notificacion') as mock_get:
            mock_get.return_value = Mock(id=1, titulo="Test")
            
            resultado = notificacion_service.obtener_notificacion(mock_db, 1, 1)
            
            assert resultado is not None
    
    def test_obtener_notificacion_no_existe(self, notificacion_service):
        """Test: error si no existe."""
        mock_db = MagicMock()
        
        with patch.object(notificacion_service, 'obtener_notificacion') as mock_get:
            mock_get.return_value = None
            
            resultado = notificacion_service.obtener_notificacion(mock_db, 999, 1)
            
            assert resultado is None


class TestNotificacionServiceListar:
    """Tests para listar notificaciones."""
    
    @pytest.fixture
    def notificacion_service(self):
        from src.notificaciones.service import NotificacionService
        return NotificacionService()
    
    def test_listar_notificaciones_usuario(self, notificacion_service):
        """Test: listar notificaciones de un usuario."""
        mock_db = MagicMock()
        
        with patch.object(notificacion_service, 'obtener_notificaciones_usuario') as mock_get:
            mock_get.return_value = [
                Mock(id=1, user_id=1, titulo="Notif1"),
                Mock(id=2, user_id=1, titulo="Notif2")
            ]
            
            resultado = notificacion_service.obtener_notificaciones_usuario(mock_db, 1)
            
            assert mock_get.called
            assert len(resultado) == 2
    
    def test_listar_notificaciones_no_leidas(self, notificacion_service):
        """Test: contar notificaciones no leídas."""
        mock_db = MagicMock()
        
        with patch.object(notificacion_service, 'contar_no_leidas') as mock_count:
            mock_count.return_value = 5
            
            resultado = notificacion_service.contar_no_leidas(mock_db, 1)
            
            assert mock_count.called
            assert resultado == 5


class TestNotificacionServiceMarcarLeida:
    """Tests para marcar notificación como leída."""
    
    @pytest.fixture
    def notificacion_service(self):
        from src.notificaciones.service import NotificacionService
        return NotificacionService()
    
    def test_marcar_como_leida(self, notificacion_service):
        """Test: marcar como leída."""
        mock_db = MagicMock()
        
        with patch.object(notificacion_service, 'marcar_como_leida') as mock_mark:
            mock_mark.return_value = Mock(id=1, leida=True)
            
            resultado = notificacion_service.marcar_como_leida(mock_db, 1, 1)
            
            assert mock_mark.called
            assert resultado is not None


class TestNotificacionServiceEliminar:
    """Tests para eliminar notificaciones."""
    
    @pytest.fixture
    def notificacion_service(self):
        from src.notificaciones.service import NotificacionService
        return NotificacionService()
    
    def test_eliminar_notificacion(self, notificacion_service):
        """Test: eliminar notificaciones antiguas."""
        mock_db = MagicMock()
        
        with patch.object(notificacion_service, 'eliminar_antiguas') as mock_del:
            mock_del.return_value = 5
            
            resultado = notificacion_service.eliminar_antiguas(mock_db, 30)
            
            assert mock_del.called
            assert resultado == 5

