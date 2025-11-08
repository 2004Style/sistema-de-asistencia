"""
Controlador para la gestión de justificaciones.

Define los endpoints HTTP para CRUD y aprobación de justificaciones.

AUTENTICACIÓN:
- 🔓 PUBLIC: POST / (crear justificación)
- 🔒 PROTECTED: GET /, GET/{id}, GET/usuario/{user_id}, GET/pendientes/usuario/{user_id}, PUT /{id}
- 🔐 ADMIN: GET /pendientes/todas, POST /{id}/aprobar, POST /{id}/rechazar, DELETE /{id}, GET /estadisticas/general
"""

from typing import Optional, TYPE_CHECKING
from datetime import date
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, Query, status
from src.config.database import get_db
from src.auth import get_current_user, require_admin, require_can_approve, require_can_view_reports

from .model import EstadoJustificacion, TipoJustificacion
from .schemas import (
    JustificacionCreate,
    JustificacionUpdate,
    JustificacionResponse,
)
from src.common_schemas import create_paginated_response, create_single_response
from .service import justificacion_service

if TYPE_CHECKING:
    from src.users.model import User


router = APIRouter(
    prefix="/justificaciones",
    tags=["Justificaciones"]
)


# ============================================================================
# ENDPOINT PARA CREAR JUSTIFICACIÓN (PUBLIC)
# Requerimiento: Los usuarios pueden crear sus propias justificaciones
@router.post(
    "",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
    summary="Crear una nueva justificación",
    description="Crea una nueva justificación de ausencia o tardanza"
)
def create_justificacion(
    justificacion_data: JustificacionCreate,
    db: Session = Depends(get_db)
):
    """
    🔓 PUBLIC - Crea una nueva justificación.
    
    - **user_id**: ID del usuario que crea la justificación
    - **fecha_inicio**: Fecha de inicio de la justificación
    - **fecha_fin**: Fecha de fin de la justificación
    - **tipo**: Tipo de justificación (medica, personal, familiar, academica, permiso_autorizado, vacaciones, licencia, otro)
    - **motivo**: Motivo detallado de la justificación (mínimo 10 caracteres)
    - **documento_url**: URL opcional del documento adjunto (certificado, etc.)
    
    La justificación se crea en estado PENDIENTE y debe ser revisada por un administrador.
    """
    justificacion = justificacion_service.create_justificacion(db, justificacion_data)
    
    # Agregar datos adicionales del usuario
    response_data = JustificacionResponse.model_validate(justificacion)
    if justificacion.user:
        response_data.usuario_nombre = justificacion.user.name
        response_data.usuario_email = justificacion.user.email
    
    return create_single_response(
        data=response_data,
        message="Justificación creada exitosamente. Está pendiente de revisión."
    )


# ============================================================================
# ENDPOINTS PARA LISTAR JUSTIFICACIONES (PROTECTED)
# Requerimiento: Consulta de justificaciones con autenticación
@router.get(
    "",
    response_model=dict,
    summary="Listar justificaciones",
    description="Obtiene una lista paginada de justificaciones con filtros opcionales"
)
def list_justificaciones(
    page: int = Query(1, ge=1, description="Número de página"),
    page_size: int = Query(10, ge=1, le=100, description="Tamaño de página"),
    estado: Optional[EstadoJustificacion] = Query(None, description="Filtrar por estado"),
    tipo: Optional[TipoJustificacion] = Query(None, description="Filtrar por tipo"),
    fecha_desde: Optional[date] = Query(None, description="Filtrar desde fecha"),
    fecha_hasta: Optional[date] = Query(None, description="Filtrar hasta fecha"),
    current_user: "User" = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    🔒 PROTECTED - Obtiene una lista paginada de justificaciones del usuario actual.
    
    Solo muestra justificaciones del usuario logueado.
    
    Filtros disponibles:
    - **estado**: Estado de la justificación (PENDIENTE, APROBADA, RECHAZADA)
    - **tipo**: Tipo de justificación (medica, personal, familiar, academica, permiso_autorizado, vacaciones, licencia, otro)
    - **fecha_desde**: Fecha de inicio desde
    - **fecha_hasta**: Fecha de fin hasta
    """
    skip = (page - 1) * page_size
    justificaciones, total = justificacion_service.get_justificaciones(db, 
        skip=skip,
        limit=page_size,
        user_id=current_user.id,  # Solo del usuario logueado
        estado=estado,
        tipo=tipo,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta
    )
    
    # Agregar datos adicionales de usuarios
    justificaciones_response = []
    for j in justificaciones:
        response = JustificacionResponse.model_validate(j)
        if j.user:
            response.usuario_nombre = j.user.name
            response.usuario_email = j.user.email
        if j.aprobador:
            response.revisor_nombre = j.aprobador.name
        justificaciones_response.append(response)
    
    return create_paginated_response(
        records=justificaciones_response,
        total_records=total,
        page=page,
        page_size=page_size,
        message="Justificaciones obtenidas exitosamente"
    )


@router.get(
    "/admin/todas",
    response_model=dict,
    summary="Listar todas las justificaciones (ADMIN)",
    description="Obtiene una lista paginada de TODAS las justificaciones del sistema (solo admin)"
)
def list_justificaciones_admin(
    page: int = Query(1, ge=1, description="Número de página"),
    page_size: int = Query(10, ge=1, le=100, description="Tamaño de página"),
    user_id: Optional[int] = Query(None, description="Filtrar por ID de usuario"),
    estado: Optional[EstadoJustificacion] = Query(None, description="Filtrar por estado"),
    tipo: Optional[TipoJustificacion] = Query(None, description="Filtrar por tipo"),
    fecha_desde: Optional[date] = Query(None, description="Filtrar desde fecha"),
    fecha_hasta: Optional[date] = Query(None, description="Filtrar hasta fecha"),
    current_user: "User" = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    🔐 ADMIN ONLY - Obtiene una lista paginada de TODAS las justificaciones del sistema.
    
    Solo disponible para administradores.
    
    Filtros disponibles:
    - **user_id**: Filtrar por ID de usuario
    - **estado**: Estado de la justificación (PENDIENTE, APROBADA, RECHAZADA)
    - **tipo**: Tipo de justificación
    - **fecha_desde**: Fecha de inicio desde
    - **fecha_hasta**: Fecha de fin hasta
    """
    skip = (page - 1) * page_size
    justificaciones, total = justificacion_service.get_justificaciones(db, 
        skip=skip,
        limit=page_size,
        user_id=user_id,
        estado=estado,
        tipo=tipo,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta
    )
    
    # Agregar datos adicionales de usuarios
    justificaciones_response = []
    for j in justificaciones:
        response = JustificacionResponse.model_validate(j)
        if j.user:
            response.usuario_nombre = j.user.name
            response.usuario_email = j.user.email
        if j.aprobador:
            response.revisor_nombre = j.aprobador.name
        justificaciones_response.append(response)
    
    return create_paginated_response(
        records=justificaciones_response,
        total_records=total,
        page=page,
        page_size=page_size,
        message="Todas las justificaciones obtenidas exitosamente"
    )


@router.get(
    "/{justificacion_id}",
    response_model=dict,
    summary="Obtener una justificación",
    description="Obtiene los detalles de una justificación específica por su ID"
)
def get_justificacion(
    justificacion_id: int,
    current_user: "User" = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    🔒 PROTECTED - Obtiene una justificación por su ID.
    
    - **justificacion_id**: ID de la justificación a obtener
    """
    justificacion = justificacion_service.get_justificacion(db, justificacion_id)
    
    # Agregar datos adicionales de usuarios
    response_data = JustificacionResponse.model_validate(justificacion)
    if justificacion.user:
        response_data.usuario_nombre = justificacion.user.name
        response_data.usuario_email = justificacion.user.email
    if justificacion.aprobador:
        response_data.revisor_nombre = justificacion.aprobador.name
    
    return create_single_response(
        data=response_data,
        message="Justificación obtenida exitosamente"
    )


@router.get(
    "/usuario/{user_id}",
    response_model=dict,
    summary="Obtener justificaciones de un usuario",
    description="Obtiene todas las justificaciones de un usuario específico"
)
def get_justificaciones_by_user(
    user_id: int,
    current_user: "User" = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    🔒 PROTECTED - Obtiene todas las justificaciones de un usuario.
    
    - **user_id**: ID del usuario
    """
    justificaciones = justificacion_service.get_justificaciones_by_user(db, user_id)
    
    # Agregar datos adicionales
    justificaciones_response = []
    for j in justificaciones:
        response = JustificacionResponse.model_validate(j)
        if j.user:
            response.usuario_nombre = j.user.name
            response.usuario_email = j.user.email
        if j.aprobador:
            response.revisor_nombre = j.aprobador.name
        justificaciones_response.append(response)
    
    return create_paginated_response(
        records=justificaciones_response,
        total_records=len(justificaciones_response),
        page=1,
        page_size=len(justificaciones_response),
        message=f"Justificaciones del usuario {user_id} obtenidas exitosamente"
    )


# ============================================================================
# ENDPOINTS PARA PENDIENTES (PERMITE APROBAR)
# Requerimiento: Usuarios que pueden aprobar (ADMIN, SUPERVISOR, RRHH)
@router.get(
    "/pendientes/todas",
    response_model=dict,
    summary="Obtener justificaciones pendientes",
    description="Obtiene todas las justificaciones pendientes de revisión (ADMIN, SUPERVISOR, RRHH)"
)
def get_justificaciones_pendientes(
    current_user: "User" = Depends(require_can_approve),
    db: Session = Depends(get_db)
):
    """
    🔐 PUEDE APROBAR - Obtiene todas las justificaciones pendientes de revisión.
    
    Permitido para: ADMIN, SUPERVISOR, RRHH
    
    Este endpoint es usado por administradores, supervisores y personal de RRHH
    para revisar y aprobar/rechazar justificaciones.
    """
    justificaciones = justificacion_service.get_justificaciones_pendientes(db, )
    
    # Agregar datos adicionales
    justificaciones_response = []
    for j in justificaciones:
        response = JustificacionResponse.model_validate(j)
        if j.user:
            response.usuario_nombre = j.user.name
            response.usuario_email = j.user.email
        justificaciones_response.append(response)
    
    return create_paginated_response(
        records=justificaciones_response,
        total_records=len(justificaciones_response),
        page=1,
        page_size=len(justificaciones_response),
        message="Justificaciones pendientes obtenidas exitosamente"
    )


@router.get(
    "/pendientes/usuario/{user_id}",
    response_model=dict,
    summary="Obtener justificaciones pendientes de un usuario",
    description="Obtiene las justificaciones pendientes de un usuario específico"
)
def get_justificaciones_pendientes_by_user(
    user_id: int,
    current_user: "User" = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    🔒 PROTECTED - Obtiene las justificaciones pendientes de un usuario.
    
    - **user_id**: ID del usuario
    """
    justificaciones = justificacion_service.get_justificaciones_pendientes_by_user(db, user_id)
    
    # Agregar datos adicionales
    justificaciones_response = []
    for j in justificaciones:
        response = JustificacionResponse.model_validate(j)
        if j.user:
            response.usuario_nombre = j.user.name
            response.usuario_email = j.user.email
        justificaciones_response.append(response)
    
    return create_paginated_response(
        records=justificaciones_response,
        total_records=len(justificaciones_response),
        page=1,
        page_size=len(justificaciones_response),
        message=f"Justificaciones pendientes del usuario {user_id} obtenidas exitosamente"
    )


# ============================================================================
# ENDPOINTS PARA ACTUALIZAR JUSTIFICACIONES (PROTECTED)
# Requerimiento: Los usuarios pueden actualizar sus justificaciones pendientes
@router.put(
    "/{justificacion_id}",
    response_model=dict,
    summary="Actualizar una justificación",
    description="Actualiza los datos de una justificación pendiente"
)
def update_justificacion(
    justificacion_id: int,
    justificacion_data: JustificacionUpdate,
    current_user: "User" = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    🔒 PROTECTED - Actualiza una justificación existente.
    Solo se pueden actualizar justificaciones en estado PENDIENTE.
    
    - **justificacion_id**: ID de la justificación a actualizar
    
    Campos actualizables (todos opcionales):
    - **fecha_inicio**: Nueva fecha de inicio
    - **fecha_fin**: Nueva fecha de fin
    - **tipo**: Nuevo tipo de justificación
    - **motivo**: Nuevo motivo
    - **documento_url**: Nueva URL del documento
    """
    justificacion = justificacion_service.update_justificacion(db, justificacion_id, justificacion_data)
    
    # Agregar datos adicionales
    response_data = JustificacionResponse.model_validate(justificacion)
    if justificacion.user:
        response_data.usuario_nombre = justificacion.user.name
        response_data.usuario_email = justificacion.user.email
    
    return create_single_response(
        data=response_data,
        message="Justificación actualizada exitosamente"
    )


# ============================================================================
# ENDPOINTS PARA APROBAR/RECHAZAR (PERMITE APROBAR)
# Requerimiento: Usuarios que pueden aprobar (ADMIN, SUPERVISOR, RRHH)
@router.post(
    "/{justificacion_id}/aprobar",
    response_model=dict,
    summary="Aprobar una justificación",
    description="Aprueba una justificación pendiente (ADMIN, SUPERVISOR, RRHH)"
)
def aprobar_justificacion(
    justificacion_id: int,
    revisor_id: int = Query(..., description="ID del revisor que aprueba"),
    comentario: Optional[str] = Query(None, description="Comentario opcional del revisor"),
    current_user: "User" = Depends(require_can_approve),
    db: Session = Depends(get_db)
):
    """
    🔐 PUEDE APROBAR - Aprueba una justificación.
    
    Permitido para: ADMIN, SUPERVISOR, RRHH
    
    - **justificacion_id**: ID de la justificación a aprobar
    - **revisor_id**: ID del usuario que aprueba (administrador/supervisor)
    - **comentario**: Comentario opcional del revisor
    
    Solo se pueden aprobar justificaciones en estado PENDIENTE.
    """
    justificacion = justificacion_service.aprobar_justificacion(db, 
        justificacion_id,
        revisor_id,
        comentario
    )
    
    # Agregar datos adicionales
    response_data = JustificacionResponse.model_validate(justificacion)
    if justificacion.user:
        response_data.usuario_nombre = justificacion.user.name
        response_data.usuario_email = justificacion.user.email
    if justificacion.aprobador:
        response_data.revisor_nombre = justificacion.aprobador.name
    
    return create_single_response(
        data=response_data,
        message="Justificación aprobada exitosamente"
    )


@router.post(
    "/{justificacion_id}/rechazar",
    response_model=dict,
    summary="Rechazar una justificación",
    description="Rechaza una justificación pendiente (ADMIN, SUPERVISOR, RRHH)"
)
def rechazar_justificacion(
    justificacion_id: int,
    revisor_id: int = Query(..., description="ID del revisor que rechaza"),
    comentario: str = Query(..., description="Comentario del revisor (obligatorio)"),
    current_user: "User" = Depends(require_can_approve),
    db: Session = Depends(get_db)
):
    """
    🔐 PUEDE APROBAR - Rechaza una justificación.
    
    Permitido para: ADMIN, SUPERVISOR, RRHH
    
    - **justificacion_id**: ID de la justificación a rechazar
    - **revisor_id**: ID del usuario que rechaza (administrador/supervisor)
    - **comentario**: Comentario del revisor explicando el rechazo (OBLIGATORIO)
    
    Solo se pueden rechazar justificaciones en estado PENDIENTE.
    El comentario es obligatorio para dar feedback al usuario.
    """
    justificacion = justificacion_service.rechazar_justificacion(db, 
        justificacion_id,
        revisor_id,
        comentario
    )
    
    # Agregar datos adicionales
    response_data = JustificacionResponse.model_validate(justificacion)
    if justificacion.user:
        response_data.usuario_nombre = justificacion.user.name
        response_data.usuario_email = justificacion.user.email
    if justificacion.aprobador:
        response_data.revisor_nombre = justificacion.aprobador.name
    
    return create_single_response(
        data=response_data,
        message="Justificación rechazada"
    )


# ============================================================================
# ENDPOINT PARA ELIMINAR JUSTIFICACIONES (ADMIN ONLY)
# Requerimiento: Solo administradores pueden eliminar justificaciones
@router.delete(
    "/{justificacion_id}",
    response_model=dict,
    summary="Eliminar una justificación",
    description="Elimina una justificación pendiente"
)
def delete_justificacion(
    justificacion_id: int,
    current_user: "User" = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    🔐 ADMIN ONLY - Elimina una justificación.
    Solo se pueden eliminar justificaciones en estado PENDIENTE.
    
    - **justificacion_id**: ID de la justificación a eliminar
    """
    justificacion_service.delete_justificacion(db, justificacion_id)
    return create_single_response(
        data={"id": justificacion_id},
        message="Justificación eliminada exitosamente"
    )


# ============================================================================
# ENDPOINT PARA ESTADÍSTICAS (PUEDE VER REPORTES)
# Requerimiento: Usuarios que pueden ver reportes (ADMIN, RRHH)
@router.get(
    "/estadisticas/general",
    response_model=dict,
    summary="Obtener estadísticas de justificaciones",
    description="Obtiene estadísticas generales de justificaciones con filtros opcionales"
)
def get_estadisticas(
    user_id: Optional[int] = Query(None, description="Filtrar por usuario"),
    fecha_desde: Optional[date] = Query(None, description="Filtrar desde fecha"),
    fecha_hasta: Optional[date] = Query(None, description="Filtrar hasta fecha"),
    current_user: "User" = Depends(require_can_view_reports),
    db: Session = Depends(get_db)
):
    """
    🔐 PUEDE VER REPORTES - Obtiene estadísticas de justificaciones.
    
    Permitido para: ADMIN, RRHH
    
    Filtros opcionales:
    - **user_id**: Estadísticas de un usuario específico
    - **fecha_desde**: Desde fecha
    - **fecha_hasta**: Hasta fecha
    
    Retorna:
    - Total de justificaciones
    - Cantidad por estado (pendientes, aprobadas, rechazadas)
    - Cantidad por tipo
    - Total de días justificados (solo aprobadas)
    """
    estadisticas = justificacion_service.get_estadisticas(db, 
        user_id=user_id,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta
    )
    
    return create_single_response(
        data=estadisticas,
        message="Estadísticas obtenidas exitosamente"
    )
