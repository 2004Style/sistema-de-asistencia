"""
Controller de Turnos - Solo endpoints

AUTENTICACIÓN:
- 🔓 PUBLIC: GET / (listar turnos)
- 🔒 PROTECTED: GET /{id} (obtener turno)
- 🔐 ADMIN: POST / (crear), PUT /{id} (actualizar), DELETE /{id} (eliminar)
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional, TYPE_CHECKING

from src.config.database import get_db
from src.auth import get_current_user, require_admin
from src.common_schemas import create_single_response
from .schemas import TurnoCreate, TurnoResponse, TurnoUpdate
from .service import turno_service

if TYPE_CHECKING:
    from src.users.model import User

router = APIRouter(prefix="/turnos", tags=["Turnos"])


# ============================================================================
# ENDPOINT PARA CREAR TURNOS (ADMIN ONLY)
# Requerimiento: Solo administradores pueden crear nuevos turnos
@router.post(
    "/",
    response_model=TurnoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear nuevo turno"
)
def crear_turno(
    turno_data: TurnoCreate,
    current_user: "User" = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    🔐 ADMIN ONLY - Crear un nuevo turno de trabajo
    """
    nuevo_turno = turno_service.crear_turno(db, turno_data)
    return nuevo_turno


# ============================================================================
# ENDPOINT PARA LISTAR TURNOS (PUBLIC)
# Requerimiento: Consulta de turnos disponibles
@router.get(
    "/",
    summary="Listar todos los turnos"
)
def listar_turnos(
    page: int = Query(1, ge=1, description="Número de página"),
    pageSize: int = Query(10, ge=1, le=100, description="Tamaño de página"),
    search: Optional[str] = Query(None, description="Buscar por nombre o descripción"),
    sortBy: Optional[str] = Query(None, description="Campo para ordenar"),
    sortOrder: str = Query("asc", pattern="^(asc|desc)$", description="Orden"),
    db: Session = Depends(get_db)
):
    """
    🔓 PUBLIC - Listar todos los turnos con paginación
    
    - **page**: Número de página (desde 1)
    - **pageSize**: Tamaño de página (máx 100)
    - **search**: Buscar por nombre o descripción
    - **sortBy**: Campo para ordenar
    - **sortOrder**: Orden (asc o desc)
    """
    resultado = turno_service.listar_turnos(
        db=db,
        page=page,
        page_size=pageSize,
        search=search,
        sort_by=sortBy,
        sort_order=sortOrder,
        activos_solo=False
    )
    
    # El servicio retorna un diccionario con records, totalRecords, totalPages, currentPage
    return {
        "data": resultado,
        "message": "Turnos obtenidos exitosamente"
    }


@router.get(
    "/activos",
    summary="Listar turnos activos"
)
def listar_turnos_activos(
    page: int = Query(1, ge=1, description="Número de página"),
    pageSize: int = Query(10, ge=1, le=100, description="Tamaño de página"),
    search: Optional[str] = Query(None, description="Buscar por nombre o descripción"),
    sortBy: Optional[str] = Query(None, description="Campo para ordenar"),
    sortOrder: str = Query("asc", pattern="^(asc|desc)$", description="Orden"),
    db: Session = Depends(get_db)
):
    """
    🔓 PUBLIC - Listar solo los turnos activos con paginación
    
    Útil para selección de turnos al crear horarios
    
    - **page**: Número de página (desde 1)
    - **pageSize**: Tamaño de página (máx 100)
    - **search**: Buscar por nombre o descripción
    - **sortBy**: Campo para ordenar
    - **sortOrder**: Orden (asc o desc)
    """
    resultado = turno_service.listar_turnos_activos(
        db=db,
        page=page,
        page_size=pageSize,
        search=search,
        sort_by=sortBy,
        sort_order=sortOrder
    )
    
    # El servicio retorna un diccionario con records, totalRecords, totalPages, currentPage
    return {
        "data": resultado,
        "message": "Turnos activos obtenidos exitosamente"
    }


@router.get(
    "/{turno_id}",
    response_model=TurnoResponse,
    summary="Obtener turno por ID"
)
def obtener_turno(
    turno_id: int,
    current_user: "User" = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    🔒 PROTECTED - Obtener información detallada de un turno específico
    
    - **turno_id**: ID del turno
    """
    turno = turno_service.obtener_turno(db, turno_id)
    return turno


# ============================================================================
# ENDPOINT PARA ACTUALIZAR TURNOS (ADMIN ONLY)
# Requerimiento: Solo administradores pueden modificar turnos
@router.put(
    "/{turno_id}",
    response_model=TurnoResponse,
    summary="Actualizar turno"
)
def actualizar_turno(
    turno_id: int,
    turno_data: TurnoUpdate,
    current_user: "User" = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    🔐 ADMIN ONLY - Actualizar información de un turno existente
    
    - **turno_id**: ID del turno a actualizar
    - Solo se actualizan los campos enviados
    """
    turno_actualizado = turno_service.actualizar_turno(db, turno_id, turno_data)
    return turno_actualizado


# ============================================================================
# ENDPOINT PARA ELIMINAR TURNOS (ADMIN ONLY)
# Requerimiento: Solo administradores pueden eliminar turnos
@router.delete(
    "/{turno_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar turno (eliminación física)"
)
def eliminar_turno(
    turno_id: int,
    current_user: "User" = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    🔐 ADMIN ONLY - Eliminar un turno de la base de datos (eliminación física)
    
    - **turno_id**: ID del turno a eliminar
    - Solo se puede eliminar si no tiene horarios asociados
    - No se pueden recuperar turnos eliminados
    """
    turno_service.eliminar_turno(db, turno_id)
    return None


# ============================================================================
# ENDPOINT PARA DESACTIVAR TURNOS (ADMIN ONLY)
# Requerimiento: Solo administradores pueden desactivar turnos
@router.post(
    "/{turno_id}/desactivar",
    response_model=TurnoResponse,
    summary="Desactivar turno (soft delete)"
)
def desactivar_turno(
    turno_id: int,
    current_user: "User" = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    🔐 ADMIN ONLY - Desactivar un turno (soft delete)
    
    - **turno_id**: ID del turno a desactivar
    - No elimina físicamente, solo marca como inactivo
    - No se puede desactivar si tiene horarios activos asociados
    - Se puede reactivar usando el endpoint `/activar`
    """
    turno_actualizado = turno_service.desactivar_turno(db, turno_id)
    return turno_actualizado


# ============================================================================
# ENDPOINT PARA ACTIVAR TURNOS (ADMIN ONLY)
# Requerimiento: Solo administradores pueden reactivar turnos
@router.post(
    "/{turno_id}/activar",
    response_model=TurnoResponse,
    summary="Activar turno"
)
def activar_turno(
    turno_id: int,
    current_user: "User" = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    🔐 ADMIN ONLY - Reactivar un turno previamente desactivado
    
    - **turno_id**: ID del turno a activar
    """
    turno_actualizado = turno_service.activar_turno(db, turno_id)
    return turno_actualizado
