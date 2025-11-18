"""
Service de Roles - Lógica de negocio para gestión de roles

Hereda de BaseService para obtener métodos CRUD genéricos.
"""
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_, asc, desc
from fastapi import HTTPException, status

from .model import Role
from .schemas import RoleCreate, RoleUpdate, RoleResponse
from src.utils.base_service import BaseService


class RoleService(BaseService):
    """
    Servicio de Roles - Gestión de roles
    
    Hereda de BaseService para métodos CRUD genéricos.
    """
    
    model_class = Role
    
    def __init__(self):
        """Inicializa el servicio."""
        super().__init__()
    
    def crear_rol(self, db: Session, data: RoleCreate) -> Role:
        """
        Crear un nuevo rol con validación de unicidad.
        
        Normaliza nombre a mayúsculas y usa assert_field_unique del BaseService.
        
        Args:
            db: Sesión de base de datos
            data: Datos del rol a crear
            
        Returns:
            Role creado
            
        Raises:
            HTTPException: Si el nombre ya existe
        """
        # Normalizar nombre a mayúsculas
        nombre_upper = data.nombre.upper()
        
        # Validar nombre único usando BaseService
        self.assert_field_unique(
            db, "nombre", nombre_upper,
            f"Ya existe un rol con el nombre '{data.nombre}'"
        )
        
        # Crear rol
        role_data = data.model_dump()
        role_data['nombre'] = nombre_upper
        
        nuevo_rol = Role(**role_data)
        return self.save_with_transaction(db, nuevo_rol, "Error al crear rol")
    
    def listar_roles(
        self,
        db: Session,
        page: int = 1,
        page_size: int = 10,
        search: Optional[str] = None,
        sort_by: Optional[str] = None,
        sort_order: str = "asc",
        activos_solo: bool = False
    ) -> Dict[str, Any]:
        """
        Listar roles con paginación y filtros.
        
        Usa paginate_with_search del BaseService.
        
        Args:
            page: Número de página
            page_size: Tamaño de página
            search: Término de búsqueda
            sort_by: Campo para ordenar
            sort_order: Orden (asc/desc)
            activos_solo: Solo roles activos
            
        Returns:
            Dict con records, totalRecords, totalPages, currentPage
        """
        filters = {"activo": True} if activos_solo else None
        result = self.paginate_with_search(
            db,
            page=page,
            page_size=page_size,
            search=search,
            search_fields=["nombre", "descripcion"],
            filters=filters,
            sort_by=sort_by or "nombre",
            sort_order=sort_order
        )
        
        # Convertir registros a RoleResponse
        result["records"] = [RoleResponse.model_validate(role) for role in result["records"]]
        return result
    
    def obtener_rol(self, db: Session, role_id: int) -> Role:
        """Obtiene un rol por ID (usa get_by_id del BaseService)."""
        return self.get_by_id(db, role_id, f"Rol con ID {role_id} no encontrado")
    
    def actualizar_rol(
        self,
        db: Session,
        role_id: int,
        data: RoleUpdate
    ) -> Role:
        """
        Actualiza un rol existente.
        
        Usa assert_field_unique del BaseService y update_with_transaction.
        
        Args:
            db: Sesión de base de datos
            role_id: ID del rol
            data: Datos a actualizar
            
        Returns:
            Role actualizado
            
        Raises:
            HTTPException: Si nombre duplicado
        """
        # Obtener rol existente
        role = self.obtener_rol(db, role_id)
        
        # Preparar datos
        update_data = data.model_dump(exclude_unset=True)
        
        # Si se actualiza nombre, normalizar y validar
        if 'nombre' in update_data:
            nombre_upper = update_data['nombre'].upper()
            self.assert_field_unique(
                db, "nombre", nombre_upper,
                f"Ya existe otro rol con el nombre '{update_data['nombre']}'",
                exclude_id=role_id
            )
            update_data['nombre'] = nombre_upper
        
        # Actualizar campos
        for field, value in update_data.items():
            setattr(role, field, value)
        
        return self.update_with_transaction(db, role, "Error al actualizar rol")
    
    def eliminar_rol(self, db: Session, role_id: int) -> None:
        """
        Eliminación física de un rol de la base de datos.
        
        Reasigna todos los usuarios del rol a eliminar al rol por defecto (COLABORADOR)
        antes de eliminar el rol.
        
        Args:
            db: Sesión de base de datos
            role_id: ID del rol a eliminar
            
        Raises:
            HTTPException: Si no existe el rol o hay error en la reasignación
        """
        role = self.obtener_rol(db, role_id)
        
        # Si el rol tiene usuarios, reasignarlos al rol por defecto
        if role.users:
            from .service import role_service as self_service
            rol_default = self_service.obtener_rol_default(db)
            
            if not rol_default:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="No se encontró el rol por defecto (COLABORADOR) para reasignar usuarios"
                )
            
            # Reasignar todos los usuarios del rol a eliminar al rol por defecto
            for usuario in role.users:
                usuario.role_id = rol_default.id
            
            # Hacer commit de los cambios en usuarios
            db.commit()
        
        # Eliminación física del rol
        self.delete_with_transaction(db, role, "Error al eliminar rol")

    def inabilitar_rol(self, db: Session, role_id: int) -> None:
        role = self.obtener_rol(db, role_id)
        if role.users:
            usuarios_activos = [u for u in role.users if u.is_active]
            if usuarios_activos:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"No se puede inhabilitar: tiene {len(usuarios_activos)} usuario(s) activo(s)"
                )
        role.activo = False
        self.update_with_transaction(db, role, "Error al inhabilitar rol")
    
    def obtener_roles_activos(self, db: Session) -> List[Role]:
        """Obtiene todos los roles activos."""
        return db.query(Role).filter(Role.activo == True).all()
    
    def obtener_rol_por_nombre(self, db: Session, nombre: str) -> Optional[Role]:
        """Obtiene un rol por nombre (usa get_by_field del BaseService)."""
        return self.get_by_field(db, "nombre", nombre.upper())
    
    def obtener_rol_default(self, db: Session) -> Optional[Role]:
        """
        Obtener el rol por defecto (COLABORADOR)
        
        Args:
            db: Sesión de base de datos
            
        Returns:
            Role por defecto o None
        """
        return self.obtener_rol_por_nombre(db, Role.get_default_role_name())
    
    
# Instancia singleton del servicio
role_service = RoleService()