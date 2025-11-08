"""
Unit Tests - Roles Service

Pruebas unitarias para la lógica de negocio del servicio de roles.
Tests enfocados en la lógica de negocio, NO en detalles de BD.
"""

import pytest
from unittest.mock import Mock, MagicMock, patch
from fastapi import HTTPException, status


class TestRoleSchemas:
    """Tests para validación de schemas de roles."""
    
    def test_schema_rolecreat_nombre_requerido(self):
        """Test: Nombre es requerido."""
        from pydantic import ValidationError
        from src.roles.schemas import RoleCreate
        
        with pytest.raises(ValidationError):
            RoleCreate(nombre="")
    
    def test_schema_rolecreat_nombre_minimo_caracteres(self):
        """Test: Nombre mínimo 3 caracteres."""
        from pydantic import ValidationError
        from src.roles.schemas import RoleCreate
        
        with pytest.raises(ValidationError):
            RoleCreate(nombre="AB")
    
    def test_schema_rolecreat_valido(self):
        """Test: RoleCreate válido."""
        from src.roles.schemas import RoleCreate
        
        role = RoleCreate(
            nombre="ADMIN",
            descripcion="Administrador del sistema",
            activo=True
        )
        
        assert role.nombre == "ADMIN"
        assert role.activo is True


class TestRoleServiceCrearLogica:
    """Tests para la lógica de crear_rol."""
    
    @pytest.fixture
    def role_service(self, mock_role_model):
        """Crear instancia del servicio con Role mockeado."""
        from src.roles.service import RoleService
        return RoleService()
    
    def test_crear_rol_normaliza_nombre_a_mayusculas(self, role_service, mock_role_model):
        """Test: crear_rol convierte nombre a mayúsculas."""
        from src.roles.schemas import RoleCreate
        
        role_data = RoleCreate(nombre="admin", descripcion="Admin")
        mock_db = MagicMock()
        
        with patch.object(role_service, 'assert_field_unique') as mock_assert:
            with patch.object(role_service, 'save_with_transaction') as mock_save:
                mock_save.return_value = Mock(id=1, nombre="ADMIN")
                
                role_service.crear_rol(mock_db, role_data)
                
                # Verificar que assert_field_unique fue llamado con "ADMIN"
                assert mock_assert.called
                call_args = mock_assert.call_args
                assert call_args[0][2] == "ADMIN"
    
    def test_crear_rol_valida_unicidad(self, role_service, mock_role_model):
        """Test: crear_rol valida nombre único antes de guardar."""
        from src.roles.schemas import RoleCreate
        
        role_data = RoleCreate(nombre="ADMIN")
        mock_db = MagicMock()
        
        with patch.object(role_service, 'assert_field_unique') as mock_assert:
            mock_assert.side_effect = HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe un rol con este nombre 'ADMIN'"
            )
            
            with pytest.raises(HTTPException) as exc_info:
                role_service.crear_rol(mock_db, role_data)
            
            assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_crear_rol_guarda_con_save_transaction(self, role_service, mock_role_model):
        """Test: crear_rol usa save_with_transaction para guardar."""
        from src.roles.schemas import RoleCreate
        
        role_data = RoleCreate(nombre="ADMIN")
        mock_db = MagicMock()
        
        with patch.object(role_service, 'assert_field_unique'):
            with patch.object(role_service, 'save_with_transaction') as mock_save:
                mock_save.return_value = Mock(id=1, nombre="ADMIN")
                
                resultado = role_service.crear_rol(mock_db, role_data)
                
                assert mock_save.called
                assert resultado is not None


class TestRoleServiceListarLogica:
    """Tests para la lógica de listar_roles."""
    
    @pytest.fixture
    def role_service(self):
        from src.roles.service import RoleService
        return RoleService()
    
    def test_listar_roles_aplica_filtro_activos(self, role_service):
        """Test: listar_roles con activos_solo=True filtra activos."""
        mock_db = MagicMock()
        
        with patch.object(role_service, 'paginate_with_search') as mock_paginate:
            mock_paginate.return_value = {
                "records": [],
                "totalRecords": 0,
                "totalPages": 1,
                "currentPage": 1
            }
            
            role_service.listar_roles(mock_db, activos_solo=True)
            
            call_kwargs = mock_paginate.call_args[1]
            assert call_kwargs['filters'] == {"activo": True}
    
    def test_listar_roles_sin_filtro_cuando_activos_solo_false(self, role_service):
        """Test: listar_roles sin filtro cuando activos_solo=False."""
        mock_db = MagicMock()
        
        with patch.object(role_service, 'paginate_with_search') as mock_paginate:
            mock_paginate.return_value = {
                "records": [],
                "totalRecords": 0,
                "totalPages": 1,
                "currentPage": 1
            }
            
            role_service.listar_roles(mock_db, activos_solo=False)
            
            call_kwargs = mock_paginate.call_args[1]
            assert call_kwargs['filters'] is None
    
    def test_listar_roles_paginacion(self, role_service):
        """Test: listar_roles respeta parámetros de paginación."""
        mock_db = MagicMock()
        
        with patch.object(role_service, 'paginate_with_search') as mock_paginate:
            mock_paginate.return_value = {
                "records": [],
                "totalRecords": 100,
                "totalPages": 5,
                "currentPage": 2
            }
            
            role_service.listar_roles(mock_db, page=2, page_size=20)
            
            call_kwargs = mock_paginate.call_args[1]
            assert call_kwargs['page'] == 2
            assert call_kwargs['page_size'] == 20


class TestRoleServiceObtenerLogica:
    """Tests para obtener_rol."""
    
    @pytest.fixture
    def role_service(self):
        from src.roles.service import RoleService
        return RoleService()
    
    def test_obtener_rol_por_id(self, role_service):
        """Test: obtener_rol usa get_by_id del BaseService."""
        mock_db = MagicMock()
        
        with patch.object(role_service, 'get_by_id') as mock_get:
            mock_get.return_value = Mock(id=1, nombre="ADMIN")
            
            resultado = role_service.obtener_rol(mock_db, 1)
            
            mock_get.assert_called_once()
            assert resultado is not None
