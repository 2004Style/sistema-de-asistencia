"""
Controlador de endpoints para horarios.

Define los endpoints REST para:
- CRUD de horarios
- Soporte para múltiples turnos por día
- Detección de turno activo
- Creación masiva de horarios

AUTENTICACIÓN:
- 🔓 PUBLIC: POST / (crear horario)
- 🔒 PROTECTED: GET / (listar), GET/{id}, GET/usuario/{user_id}
- 🔒 ADMIN: PUT /{id}, DELETE /{id}, DELETE /usuario/{user_id}, POST /bulk
"""

from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional, TYPE_CHECKING
from datetime import datetime, time

from src.config.database import get_db
from src.auth import get_current_user, require_admin
from .model import DiaSemana
from .schemas import HorarioCreate, HorarioUpdate, HorarioResponse
from .service import horario_service
from src.common_schemas import create_paginated_response, create_single_response

if TYPE_CHECKING:
    from src.users.model import User


router = APIRouter(prefix="/horarios", tags=["Horarios"])


# ============================================================================
# ENDPOINT PARA CREAR HORARIO (PUBLIC)
# Requerimiento: Creación de nuevo horario
@router.post("", status_code=status.HTTP_201_CREATED)
def create_horario(
    horario_data: HorarioCreate,
    db: Session = Depends(get_db)
):
    """
    🔓 PUBLIC - Crea un nuevo horario.
    
    - **user_id**: ID del usuario al que pertenece el horario
    - **dia_semana**: Día de la semana (LUNES, MARTES, etc.)
    - **turno_id**: ID del turno asignado
    - **hora_entrada**: Hora de entrada (formato HH:MM:SS)
    - **hora_salida**: Hora de salida (formato HH:MM:SS)
    - **horas_requeridas**: Horas requeridas en minutos
    - **tolerancia_entrada**: Tolerancia de entrada en minutos (default: 15)
    - **tolerancia_salida**: Tolerancia de salida en minutos (default: 15)
    - **activo**: Si el horario está activo (default: True)
    """
    horario = horario_service.create_horario(db, horario_data)
    return create_single_response(
        data=HorarioResponse.model_validate(horario),
        message="Horario creado exitosamente"
    )


# ============================================================================
# ENDPOINTS PARA LISTAR HORARIOS (PROTECTED)
# Requerimiento: Consulta de horarios con autenticación
@router.get("")
def list_horarios(
    page: int = Query(1, ge=1, description="Número de página"),
    page_size: int = Query(10, ge=1, le=100, description="Tamaño de página"),
    dia_semana: Optional[DiaSemana] = Query(None, description="Filtrar por día de la semana"),
    activo: Optional[bool] = Query(None, description="Filtrar por estado activo"),
    current_user: "User" = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    🔒 PROTECTED - Obtiene una lista paginada de horarios del usuario actual.
    
    Solo muestra horarios del usuario logueado.
    
    Filtros disponibles:
    - **dia_semana**: Día de la semana
    - **activo**: Estado activo del horario
    """
    skip = (page - 1) * page_size
    horarios, total = horario_service.get_horarios(db, 
        skip=skip,
        limit=page_size,
        user_id=current_user.id,  # Solo del usuario logueado
        dia_semana=dia_semana,
        activo=activo
    )
    
    horarios_response = [HorarioResponse.model_validate(h) for h in horarios]
    
    return create_paginated_response(
        records=horarios_response,
        total_records=total,
        page=page,
        page_size=page_size,
        message="Horarios obtenidos exitosamente"
    )


@router.get(
    "/admin/todos",
    summary="Listar todos los horarios (ADMIN)"
)
def list_todos_horarios(
    page: int = Query(1, ge=1, description="Número de página"),
    page_size: int = Query(10, ge=1, le=100, description="Tamaño de página"),
    user_id: Optional[int] = Query(None, description="Filtrar por ID de usuario"),
    dia_semana: Optional[DiaSemana] = Query(None, description="Filtrar por día de la semana"),
    activo: Optional[bool] = Query(None, description="Filtrar por estado activo"),
    current_user: "User" = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    🔐 ADMIN ONLY - Obtiene una lista paginada de TODOS los horarios del sistema.
    
    Filtros disponibles:
    - **user_id**: Filtrar por ID de usuario
    - **dia_semana**: Día de la semana
    - **activo**: Estado activo del horario
    """
    skip = (page - 1) * page_size
    horarios, total = horario_service.get_horarios(db, 
        skip=skip,
        limit=page_size,
        user_id=user_id,
        dia_semana=dia_semana,
        activo=activo
    )
    
    horarios_response = [HorarioResponse.model_validate(h) for h in horarios]
    
    return create_paginated_response(
        records=horarios_response,
        total_records=total,
        page=page,
        page_size=page_size,
        message="Todos los horarios obtenidos exitosamente"
    )


@router.get("/{horario_id}")
def get_horario(
    horario_id: int,
    current_user: "User" = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """🔒 PROTECTED - Obtiene un horario por su ID."""
    horario = horario_service.get_horario(db, horario_id)
    return create_single_response(
        data=HorarioResponse.model_validate(horario),
        message="Horario obtenido exitosamente"
    )


@router.get("/usuario/{user_id}")
def get_horarios_by_user(
    user_id: int,
    dia_semana: Optional[DiaSemana] = Query(None, description="Filtrar por día específico"),
    current_user: "User" = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    🔒 PROTECTED - Obtiene todos los horarios de un usuario.
    
    - **user_id**: ID del usuario
    - **dia_semana**: Opcional - Filtrar por día específico
    """
    horarios = horario_service.get_horarios_by_user(db, user_id)
    
    # Filtrar por día si se especificó
    if dia_semana:
        horarios = [h for h in horarios if h.dia_semana == dia_semana]
    
    horarios_response = [HorarioResponse.model_validate(h) for h in horarios]
    
    mensaje = f"Horarios del usuario {user_id} obtenidos exitosamente"
    if dia_semana:
        mensaje += f" para {dia_semana.value}"
    
    return create_paginated_response(
        records=horarios_response,
        total_records=len(horarios_response),
        page=1,
        page_size=len(horarios_response),
        message=mensaje
    )


# ============================================================================
# ENDPOINTS PARA ACTUALIZAR/ELIMINAR HORARIOS (ADMIN ONLY)
# Requerimiento: Solo administradores pueden modificar horarios
@router.put("/{horario_id}")
def update_horario(
    horario_id: int,
    horario_data: HorarioUpdate,
    current_user: "User" = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    🔐 ADMIN ONLY - Actualiza un horario existente.
    
    Campos actualizables (todos opcionales):
    - **hora_entrada**: Nueva hora de entrada
    - **hora_salida**: Nueva hora de salida
    - **horas_requeridas**: Nuevas horas requeridas en minutos
    - **tolerancia_entrada**: Nueva tolerancia de entrada
    - **tolerancia_salida**: Nueva tolerancia de salida
    - **activo**: Nuevo estado activo
    """
    horario = horario_service.update_horario(db, horario_id, horario_data)
    return create_single_response(
        data=HorarioResponse.model_validate(horario),
        message="Horario actualizado exitosamente"
    )


@router.delete("/{horario_id}")
def delete_horario(
    horario_id: int,
    current_user: "User" = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """🔐 ADMIN ONLY - Elimina un horario."""
    horario_service.delete_horario(db, horario_id)
    return create_single_response(
        data={"id": horario_id},
        message="Horario eliminado exitosamente"
    )


@router.delete("/usuario/{user_id}")
def delete_horarios_by_user(
    user_id: int,
    current_user: "User" = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """🔐 ADMIN ONLY - Elimina todos los horarios de un usuario."""
    horario_service.delete_horarios_by_user(db, user_id)
    return create_single_response(
        data={"user_id": user_id},
        message=f"Todos los horarios del usuario {user_id} fueron eliminados exitosamente"
    )


@router.get("/usuario/{user_id}/turno-activo")
def detectar_turno_activo(
    user_id: int,
    dia_semana: Optional[DiaSemana] = Query(None, description="Día a consultar (default: hoy)"),
    hora: Optional[str] = Query(None, description="Hora a consultar en formato HH:MM (default: ahora)"),
    current_user: "User" = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    🔒 PROTECTED - Detecta qué turno está activo para un usuario en un momento específico.
    
    - **user_id**: ID del usuario
    - **dia_semana**: Día de la semana (opcional, por defecto hoy)
    - **hora**: Hora en formato HH:MM (opcional, por defecto hora actual)
    
    Retorna el turno activo o error si no hay turno activo.
    Considera ventana de 1 hora antes/después del horario.
    """
    # Determinar día
    if dia_semana is None:
        dias_semana = {
            0: DiaSemana.LUNES,
            1: DiaSemana.MARTES,
            2: DiaSemana.MIERCOLES,
            3: DiaSemana.JUEVES,
            4: DiaSemana.VIERNES,
            5: DiaSemana.SABADO,
            6: DiaSemana.DOMINGO
        }
        dia_semana = dias_semana[datetime.now().weekday()]
    
    # Determinar hora
    if hora is None:
        hora_actual = datetime.now().time()
    else:
        try:
            hora_parts = hora.split(':')
            hora_actual = time(int(hora_parts[0]), int(hora_parts[1]))
        except:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Formato de hora inválido. Use HH:MM"
            )
    
    # Detectar turno activo
    turno = horario_service.detectar_turno_activo(db, user_id, dia_semana, hora_actual)
    
    if not turno:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No hay turno activo para este usuario en este momento"
        )
    
    return create_single_response(
        data=HorarioResponse.model_validate(turno),
        message=f"Turno activo: {turno.hora_entrada.strftime('%H:%M')} - {turno.hora_salida.strftime('%H:%M')}"
    )


# ============================================================================
# ENDPOINT PARA CREAR MÚLTIPLES HORARIOS (ADMIN ONLY)
# Requerimiento: Creación masiva de horarios
@router.post("/bulk", status_code=status.HTTP_201_CREATED)
def create_bulk_horarios(
    horarios_data: List[HorarioCreate],
    current_user: "User" = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    🔐 ADMIN ONLY - Crea múltiples horarios para un usuario de una vez.
    
    - **horarios_data**: Lista de horarios a crear
    
    Todos los horarios deben pertenecer al mismo usuario.
    El sistema valida que no se solapen los horarios.
    """
    # Validar que todos los horarios sean del mismo usuario
    if not horarios_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debe proporcionar al menos un horario"
        )
    
    user_id = horarios_data[0].user_id
    if not all(h.user_id == user_id for h in horarios_data):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Todos los horarios deben pertenecer al mismo usuario"
        )
    
    horarios = horario_service.create_bulk_horarios(db, user_id, horarios_data)
    horarios_response = [HorarioResponse.model_validate(h) for h in horarios]
    
    return create_paginated_response(
        records=horarios_response,
        total_records=len(horarios_response),
        page=1,
        page_size=len(horarios_response),
        message=f"Se crearon {len(horarios_response)} horarios exitosamente"
    )
