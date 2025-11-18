"""
Controller de Roles - Solo endpoints
Toda la lógica está en el servicio

AUTENTICACIÓN:
- 🔓 PUBLIC: GET / (listar roles públicos), GET /activos/listar
- 🔒 PROTECTED: GET /{id} (obtener rol)
- 🔐 ADMIN: POST / (crear), PUT /{id} (actualizar), DELETE /{id} (eliminar)
"""
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session
from typing import Optional, TYPE_CHECKING

from src.config.database import get_db
from src.auth import get_current_user, require_admin
from src.common_schemas import create_paginated_response, create_single_response
from .schemas import RoleCreate, RoleUpdate, RoleResponse
from .service import role_service

if TYPE_CHECKING:
    from src.users.model import User

router = APIRouter(prefix="/roles", tags=["Roles"])


# ============================================================================
# ENDPOINT PARA CREAR ROLES (ADMIN ONLY)
# Requerimiento: Solo administradores pueden crear nuevos roles
@router.post("/", status_code=status.HTTP_201_CREATED)
async def crear_rol(
    data: RoleCreate,
    current_user: "User" = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    🔐 ADMIN ONLY - Crear un nuevo rol
    
    - **nombre**: Nombre único del rol (ej: COLABORADOR, SUPERVISOR, ADMIN)
    - **descripcion**: Descripción del rol
    - **es_admin**: Si tiene acceso total al sistema
    - **puede_aprobar**: Si puede aprobar justificaciones
    - **puede_ver_reportes**: Si puede ver reportes
    - **puede_gestionar_usuarios**: Si puede gestionar usuarios
    """
    nuevo_rol = role_service.crear_rol(db, data)
    
    return create_single_response(
        data=RoleResponse.model_validate(nuevo_rol),
        message="Rol creado exitosamente"
    )


# ============================================================================
# ENDPOINTS PARA LISTAR ROLES (PUBLIC/PROTECTED)
# Requerimiento: Consulta de roles disponibles
@router.get("/")
async def listar_roles(
    page: int = Query(1, ge=1, description="Número de página"),
    pageSize: int = Query(10, ge=1, le=100, description="Tamaño de página"),
    search: Optional[str] = Query(None, description="Buscar por nombre o descripción"),
    sortBy: Optional[str] = Query(None, description="Campo para ordenar"),
    sortOrder: str = Query("asc", pattern="^(asc|desc)$", description="Orden"),
    activos_solo: bool = Query(False, description="Solo roles activos"),
    db: Session = Depends(get_db)
):
    """
    🔓 PUBLIC - Listar todos los roles con paginación
    
    - **page**: Número de página (desde 1)
    - **pageSize**: Tamaño de página (máx 100)
    - **search**: Buscar por nombre o descripción
    - **sortBy**: Campo para ordenar
    - **sortOrder**: Orden (asc o desc)
    - **activos_solo**: Solo roles activos
    """
    resultado = role_service.listar_roles(
        db=db,
        page=page,
        page_size=pageSize,
        search=search,
        sort_by=sortBy,
        sort_order=sortOrder,
        activos_solo=activos_solo
    )
    
    # El servicio retorna un diccionario con records, totalRecords, totalPages, currentPage
    return {
        "data": resultado,
        "message": "Roles obtenidos exitosamente"
    }


@router.get("/{role_id}")
async def obtener_rol(
    role_id: int,
    current_user: "User" = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    🔒 PROTECTED - Obtener un rol por ID
    
    - **role_id**: ID del rol
    """
    role = role_service.obtener_rol(db, role_id)
    
    return create_single_response(
        data=RoleResponse.model_validate(role),
        message="Rol obtenido exitosamente"
    )


# ============================================================================
# ENDPOINT PARA ACTUALIZAR ROLES (ADMIN ONLY)
# Requerimiento: Solo administradores pueden modificar roles
@router.put("/{role_id}")
async def actualizar_rol(
    role_id: int,
    data: RoleUpdate,
    current_user: "User" = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    🔐 ADMIN ONLY - Actualizar un rol existente
    
    - **role_id**: ID del rol a actualizar
    - Solo se actualizan los campos enviados
    """
    role_actualizado = role_service.actualizar_rol(db, role_id, data)
    
    return create_single_response(
        data=RoleResponse.model_validate(role_actualizado),
        message="Rol actualizado exitosamente"
    )


# ============================================================================
# ENDPOINT PARA ELIMINAR ROLES (ADMIN ONLY)
# Requerimiento: Solo administradores pueden eliminar roles
@router.delete("/{role_id}", status_code=status.HTTP_200_OK)
async def eliminar_rol(
    role_id: int,
    current_user: "User" = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    🔐 ADMIN ONLY - Eliminar un rol (eliminación lógica)
    
    - **role_id**: ID del rol a eliminar
    - El rol se marca como inactivo, no se elimina físicamente
    - No se puede eliminar si tiene usuarios activos asociados
    """
    role_service.eliminar_rol(db, role_id)
    
    return create_single_response(
        data={"id": role_id},
        message="Rol eliminado exitosamente"
    )

@router.post("/inabilitar/{role_id}", status_code=status.HTTP_200_OK)
async def inabilitar_rol(
    role_id: int,
    current_user: "User" = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    🔐 ADMIN ONLY - Inabilitar un rol (marcar como inactivo)
    
    - **role_id**: ID del rol a inabilitar
    - No se puede inabilitar si tiene usuarios activos asociados
    """
    role_service.inabilitar_rol(db, role_id)
    
    return create_single_response(
        data={"id": role_id},
        message="Rol inhabilitado exitosamente"
    )


# ============================================================================
# ENDPOINT PARA LISTAR ROLES ACTIVOS (PUBLIC)
# Requerimiento: Consulta de roles activos para selects/dropdowns
@router.get("/activos/listar")
async def listar_roles_activos(
    db: Session = Depends(get_db)
):
    """
    🔓 PUBLIC - Listar solo roles activos (sin paginación)
    
    Útil para dropdowns y selects
    """
    roles = role_service.obtener_roles_activos(db)
    
    return create_single_response(
        data=[RoleResponse.model_validate(role) for role in roles],
        message=f"{len(roles)} roles activos obtenidos"
    )
