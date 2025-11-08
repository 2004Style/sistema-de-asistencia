"""
Controller de Notificaciones - Endpoints REST

AUTENTICACIÓN:
- 🔒 PROTECTED: GET / (listar), GET /count, GET/{id}, PUT /{id}/marcar-leida, PUT /marcar-todas-leidas
- 🔐 ADMIN: DELETE /limpiar
"""
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session
from typing import Optional, TYPE_CHECKING

from src.config.database import get_db
from src.auth import get_current_user, require_admin
from .schemas import NotificacionResponse, NotificacionList, NotificacionUpdate
from .service import notificacion_service

if TYPE_CHECKING:
    from src.users.model import User

router = APIRouter(prefix="/notificaciones", tags=["Notificaciones"])


# ============================================================================
# ENDPOINTS PARA LISTAR NOTIFICACIONES (PROTECTED)
# Requerimiento: Consulta de notificaciones del usuario
@router.get(
    "/",
    response_model=NotificacionList,
    summary="Listar notificaciones del usuario"
)
def listar_notificaciones(
    solo_no_leidas: bool = Query(False, description="Solo notificaciones no leídas"),
    skip: int = Query(0, ge=0, description="Registros a omitir"),
    limit: int = Query(50, ge=1, le=100, description="Límite de registros"),
    current_user: "User" = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    🔒 PROTECTED - Listar notificaciones del usuario actual
    
    - **solo_no_leidas**: Filtrar solo no leídas
    - **skip**: Paginación - registros a omitir
    - **limit**: Paginación - límite de registros
    """
    notificaciones = notificacion_service.obtener_notificaciones_usuario(
        db=db,
        user_id=current_user.id,
        solo_no_leidas=solo_no_leidas,
        skip=skip,
        limit=limit
    )
    
    # Contar no leídas
    no_leidas = notificacion_service.contar_no_leidas(db, current_user.id)
    
    return NotificacionList(
        total=len(notificaciones),
        no_leidas=no_leidas,
        notificaciones=[NotificacionResponse.model_validate(n) for n in notificaciones]
    )


@router.get(
    "/count",
    summary="Contar notificaciones no leídas"
)
def contar_no_leidas(
    current_user: "User" = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    🔒 PROTECTED - Contar notificaciones no leídas del usuario actual
    """
    count = notificacion_service.contar_no_leidas(db, current_user.id)
    return {"count": count}


@router.get(
    "/{notificacion_id}",
    response_model=NotificacionResponse,
    summary="Obtener notificación por ID"
)
def obtener_notificacion(
    notificacion_id: int,
    current_user: "User" = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    🔒 PROTECTED - Obtener detalles de una notificación específica
    
    - **notificacion_id**: ID de la notificación
    """
    notificacion = notificacion_service.obtener_notificacion(
        db, 
        notificacion_id, 
        current_user.id
    )
    return NotificacionResponse.model_validate(notificacion)


@router.get(
    "/admin/todas",
    response_model=NotificacionList,
    summary="Listar todas las notificaciones (ADMIN)"
)
def listar_todas_notificaciones(
    skip: int = Query(0, ge=0, description="Registros a omitir"),
    limit: int = Query(50, ge=1, le=100, description="Límite de registros"),
    current_user: "User" = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    🔐 ADMIN ONLY - Listar TODAS las notificaciones del sistema
    
    - **skip**: Paginación - registros a omitir
    - **limit**: Paginación - límite de registros
    """
    notificaciones = notificacion_service.obtener_todas_notificaciones(
        db=db,
        skip=skip,
        limit=limit
    )
    
    return NotificacionList(
        total=len(notificaciones),
        no_leidas=0,  # No aplica para admin
        notificaciones=[NotificacionResponse.model_validate(n) for n in notificaciones]
    )


# ============================================================================
# ENDPOINTS PARA MARCAR COMO LEÍDAS (PROTECTED)
# Requerimiento: Usuarios pueden marcar sus notificaciones como leídas
@router.put(
    "/{notificacion_id}/marcar-leida",
    response_model=NotificacionResponse,
    summary="Marcar notificación como leída"
)
def marcar_leida(
    notificacion_id: int,
    current_user: "User" = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    🔒 PROTECTED - Marcar una notificación como leída
    
    - **notificacion_id**: ID de la notificación
    """
    notificacion = notificacion_service.marcar_como_leida(
        db,
        notificacion_id,
        current_user.id
    )
    return NotificacionResponse.model_validate(notificacion)


@router.put(
    "/marcar-todas-leidas",
    summary="Marcar todas como leídas"
)
def marcar_todas_leidas(
    current_user: "User" = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    🔒 PROTECTED - Marcar todas las notificaciones del usuario como leídas
    """
    count = notificacion_service.marcar_todas_como_leidas(db, current_user.id)
    return {
        "message": f"{count} notificaciones marcadas como leídas",
        "count": count
    }


# ============================================================================
# ENDPOINT PARA LIMPIAR NOTIFICACIONES (ADMIN ONLY)
# Requerimiento: Solo administradores pueden limpiar notificaciones antiguas
@router.delete(
    "/limpiar",
    summary="Eliminar notificaciones antiguas"
)
def limpiar_antiguas(
    dias: int = Query(30, ge=1, le=365, description="Días de antigüedad"),
    current_user: "User" = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    🔐 ADMIN ONLY - Eliminar notificaciones leídas antiguas
    
    - **dias**: Días de antigüedad (por defecto 30)
    """
    count = notificacion_service.eliminar_antiguas(db, dias)
    return {
        "message": f"{count} notificaciones eliminadas",
        "count": count
    }
