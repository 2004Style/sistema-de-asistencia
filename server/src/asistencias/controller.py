"""
Controlador de asistencias.

Maneja endpoints HTTP para:
- Registro manual de asistencia (entrada/salida)
- Consulta de registros
- Actualización de registros

RUTAS PÚBLICAS (sin autenticación):
- POST /asistencia/registrar-manual - Registro manual (solo ADMIN)
- POST /asistencia/registro-facial - Registro por reconocimiento facial

RUTAS PROTEGIDAS (requieren autenticación):
- GET /asistencia/ - Listar asistencias
- GET /asistencia/{asistencia_id} - Obtener asistencia
- GET /asistencia/usuario/{user_id} - Asistencias de un usuario
- PUT /asistencia/actualizar-manual/{asistencia_id} - Actualizar asistencia
- DELETE /asistencia/{asistencia_id} - Eliminar asistencia

NOTA: Las rutas de registro facial y manual son públicas pero se validan
internamente por rol (ADMIN) en el servicio.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from datetime import date, time, datetime
from typing import Optional, TYPE_CHECKING

from src.config.database import get_db
from src.auth import get_current_user, require_admin

from src.horarios.model import DiaSemana
from .schemas import (
    AsistenciaManualCreate,
    AsistenciaUpdate,
    AsistenciaResponse,
)
from src.common_schemas import create_paginated_response, create_single_response
from .service import asistencia_service
from .model import EstadoAsistencia, MetodoRegistro
from src.auth import get_current_user, require_admin

if TYPE_CHECKING:
    from src.users.model import User

# Reconocimiento facial: la decodificación y el reconocimiento se realizan
# en el servicio (`asistencia_service`). Aquí solo hacemos validaciones
# ligeras del archivo (por ejemplo: no vacío, límite de tamaño).


router = APIRouter(prefix="/asistencia", tags=["Asistencia"])


def enriquecer_asistencia_con_usuario(asistencia, db: Session) -> dict:
    """
    Enriquece un objeto de asistencia con información del usuario
    
    Args:
        asistencia: Objeto Asistencia del modelo
        db: Sesión de base de datos
    
    Returns:
        dict con todos los campos de asistencia más información del usuario
    """
    from src.users.model import User
    
    # Obtener usuario
    usuario = db.query(User).filter(User.id == asistencia.user_id).first()
    
    # Convertir asistencia a dict
    asistencia_dict = {
        "id": asistencia.id,
        "user_id": asistencia.user_id,
        "horario_id": asistencia.horario_id,
        "fecha": asistencia.fecha,
        "hora_entrada": asistencia.hora_entrada,
        "hora_salida": asistencia.hora_salida,
        "metodo_entrada": asistencia.metodo_entrada.value if asistencia.metodo_entrada else None,
        "metodo_salida": asistencia.metodo_salida.value if asistencia.metodo_salida else None,
        "estado": asistencia.estado.value if asistencia.estado else None,
        "tardanza": asistencia.tardanza,
        "minutos_tardanza": asistencia.minutos_tardanza,
        "minutos_trabajados": asistencia.horas_trabajadas,  # Son minutos, no horas
        "horas_trabajadas_formato": asistencia.horas_trabajadas_formato,
        "justificacion_id": asistencia.justificacion_id,
        "observaciones": asistencia.observaciones,
        "created_at": asistencia.created_at,
        "updated_at": asistencia.updated_at,
        # Información del usuario
        "nombre_usuario": usuario.name if usuario else None,
        "codigo_usuario": usuario.codigo_user if usuario else None,
        "email_usuario": usuario.email if usuario else None,
    }
    
    return asistencia_dict


# ============================================================================
# ENDPOINTS PARA REGISTRO MANUAL (HTTP)
# Requerimiento #4: Registro manual autorizado
# ============================================================================

@router.post("/registrar-manual")
async def registrar_asistencia_manual(
    data: AsistenciaManualCreate,
    db: Session = Depends(get_db),
):
    """
    Registra asistencia manualmente (solo administradores).
    
    🔓 RUTA PÚBLICA (sin autenticación requerida en este endpoint)
    ⚠️  pero se valida rol ADMIN internamente en el servicio
    
    Requerimiento #4: Registro manual en casos excepcionales
    
    SEGURIDAD: El servidor controla automáticamente:
    - fecha: Fecha actual del servidor
    - hora_entrada/salida: Hora actual del servidor
    - estado: Calculado según horario del usuario
    - tipo_registro: Si no se envía, detecta automáticamente si es entrada o salida
    - validación: Solo permite registro dentro del horario configurado
    
    El cliente solo envía:
    - **user_id**: ID del usuario a registrar
    - **tipo_registro**: OPCIONAL "entrada" o "salida" (se detecta automáticamente)
    - **observaciones**: Motivo del registro manual
    
    Returns:
        {
            "data": AsistenciaResponse,
            "message": string
        }
    """
    try:
        # Delegar toda la lógica al servicio
        resp = asistencia_service.registrar_asistencia_manual(db, data.user_id, data.tipo_registro, data.observaciones)

        # Convertir la asistencia devuelta a AsistenciaResponse si es posible
        asistencia_data = resp.get("asistencia")
        return create_single_response(data=asistencia_data, message=resp.get("message", "Registro manual realizado"))
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al registrar asistencia manual: {str(e)}"
        )


@router.post("/registro-facial")
async def registrar_asistencia_facial(
    codigo: str = Query(..., description="Código único del usuario"),
    image: UploadFile = File(..., description="Imagen que contiene el rostro"),
    db: Session = Depends(get_db),
):
    """
    Endpoint para registro de asistencia mediante reconocimiento facial.
    
    🔓 RUTA PÚBLICA (sin autenticación requerida)
    
    Flujo:
    - Se recibe `codigo` y una `image` (multipart/form-data).
    - Se ejecuta el reconocedor facial sobre la imagen.
    - Si el reconocedor identifica una persona y el nombre coincide con el `User.name`
      asociado al `codigo`, se registra la asistencia (entrada/salida) usando el
      servicio `asistencia_service.registrar_asistencia`.
    - Si no coincide, se devuelve error.
    """
    try:
        from src.users.model import User
        
        # Validar usuario por código
        usuario = db.query(User).filter(User.codigo_user == codigo).first()
        if not usuario:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Usuario con código {codigo} no encontrado")

        # Leer imagen en memoria y hacer validaciones ligeras
        content = await image.read()
        if not content:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Imagen vacía")

        # Limitar tamaño máximo (ej. 5 MB) para evitar cargas excesivas desde el controller
        max_size_bytes = 5 * 1024 * 1024
        if len(content) > max_size_bytes:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Imagen demasiado grande (máx 5MB)")

        # Delegar toda la decodificación y reconocimiento facial al servicio
        asistencia_resp = asistencia_service.registrar_asistencia_facial(db, codigo, content)

        return create_single_response(data=asistencia_resp, message="Asistencia registrada por reconocimiento facial")

    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error en registro facial: {str(e)}")


@router.put("/actualizar-manual/{asistencia_id}")
async def actualizar_asistencia_manual(
    asistencia_id: int,
    data: AsistenciaUpdate,
    current_user: "User" = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Actualiza un registro de asistencia (solo administradores)
    
    � RUTA ADMIN ONLY (requiere rol administrador)
    
    - **asistencia_id**: ID del registro a actualizar
    - **data**: Datos a actualizar (hora_entrada, hora_salida, estado, motivo)
    
    Returns:
        {
            "data": AsistenciaResponse,
            "message": string
        }
    """
    try:
        # Validar que sea admin
        if not current_user.es_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo administradores pueden actualizar asistencias"
            )
        
        asistencia = asistencia_service.get_asistencia(db, asistencia_id)
        
        # Preparar datos de actualización
        update_data = {}
        if data.hora_entrada is not None:
            update_data['hora_entrada'] = data.hora_entrada
        if data.hora_salida is not None:
            update_data['hora_salida'] = data.hora_salida
        if data.estado is not None:
            update_data['estado'] = data.estado
        if data.observaciones is not None:
            update_data['observaciones'] = data.observaciones
        
    # Nota: ya no se mantiene campo `es_manual` en el modelo
        
        # Actualizar
        asistencia_actualizada = asistencia_service.update_asistencia(db, asistencia_id, update_data)
        
        # Enriquecer con información del usuario
        asistencia_enriquecida = enriquecer_asistencia_con_usuario(asistencia_actualizada, db)
        
        return create_single_response(
            data=AsistenciaResponse.model_validate(asistencia_enriquecida),
            message="Asistencia actualizada exitosamente"
        )
        
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al actualizar asistencia: {str(e)}"
        )


# ============================================================================
# ENDPOINTS DE CONSULTA
# ============================================================================

@router.get("/")
async def listar_todas_asistencias(
    page: int = Query(1, ge=1, description="Número de página"),
    page_size: int = Query(10, ge=1, le=100, description="Tamaño de página"),
    fecha_inicio: Optional[date] = Query(None, description="Fecha de inicio del filtro"),
    fecha_fin: Optional[date] = Query(None, description="Fecha de fin del filtro"),
    estado: Optional[EstadoAsistencia] = Query(None, description="Filtrar por estado"),
    current_user: "User" = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtiene las asistencias del usuario actual con filtros opcionales y paginación
    
    🔒 RUTA PROTEGIDA (requiere autenticación)
    
    Solo muestra asistencias del usuario logueado.
    
    Filtros disponibles:
    - **user_id**: Filtrar por usuario específico
    - **fecha_inicio**: Fecha de inicio del rango
    - **fecha_fin**: Fecha de fin del rango
    - **estado**: Filtrar por estado (PRESENTE, AUSENTE, TARDE, JUSTIFICADO)
    - **page**: Número de página (starting from 1)
    - **page_size**: Tamaño de página (max 100)
    
    Returns:
        {
            "data": {
                "records": AsistenciaResponse[],
                "totalRecords": number,
                "totalPages": number,
                "currentPage": number
            },
            "message": string
        }
    """
    try:
        from src.users.model import User
        # Construir query base
        from .model import Asistencia
        query = db.query(Asistencia)
        
        # Solo asistencias del usuario logueado
        query = query.filter(Asistencia.user_id == current_user.id)
        
        if fecha_inicio is not None:
            query = query.filter(Asistencia.fecha >= fecha_inicio)
        
        if fecha_fin is not None:
            query = query.filter(Asistencia.fecha <= fecha_fin)
        
        if estado is not None:
            query = query.filter(Asistencia.estado == estado)
        
        # Contar total de registros
        total_records = query.count()
        
        # Aplicar paginación
        offset = (page - 1) * page_size
        asistencias = query.order_by(Asistencia.fecha.desc(), Asistencia.created_at.desc()).offset(offset).limit(page_size).all()
        
        # Convertir a response con información del usuario
        asistencias_response = [
            AsistenciaResponse.model_validate(enriquecer_asistencia_con_usuario(a, db))
            for a in asistencias
        ]
        
        return create_paginated_response(
            records=asistencias_response,
            total_records=total_records,
            page=page,
            page_size=page_size,
            message="Asistencias obtenidas exitosamente"
        )
        
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener asistencias: {str(e)}"
        )


@router.get("/admin/todas")
async def listar_todas_asistencias_admin(
    page: int = Query(1, ge=1, description="Número de página"),
    page_size: int = Query(10, ge=1, le=100, description="Tamaño de página"),
    user_id: Optional[int] = Query(None, description="Filtrar por ID de usuario"),
    fecha_inicio: Optional[date] = Query(None, description="Fecha de inicio del filtro"),
    fecha_fin: Optional[date] = Query(None, description="Fecha de fin del filtro"),
    estado: Optional[EstadoAsistencia] = Query(None, description="Filtrar por estado"),
    current_user: "User" = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Obtiene TODAS las asistencias del sistema (solo admin) con filtros opcionales y paginación
    
    🔐 ADMIN ONLY (requiere ser administrador)
    
    Filtros disponibles:
    - **user_id**: Filtrar por usuario específico
    - **fecha_inicio**: Fecha de inicio del rango
    - **fecha_fin**: Fecha de fin del rango
    - **estado**: Filtrar por estado (PRESENTE, AUSENTE, TARDE, JUSTIFICADO)
    """
    try:
        from src.users.model import User
        from .model import Asistencia
        query = db.query(Asistencia)
        
        # Aplicar filtros
        if user_id is not None:
            # Verificar que el usuario existe
            usuario = db.query(User).filter(User.id == user_id).first()
            if not usuario:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Usuario con ID {user_id} no encontrado"
                )
            query = query.filter(Asistencia.user_id == user_id)
        
        if fecha_inicio is not None:
            query = query.filter(Asistencia.fecha >= fecha_inicio)
        
        if fecha_fin is not None:
            query = query.filter(Asistencia.fecha <= fecha_fin)
        
        if estado is not None:
            query = query.filter(Asistencia.estado == estado)
        
        # Contar total de registros
        total_records = query.count()
        
        # Aplicar paginación
        offset = (page - 1) * page_size
        asistencias = query.order_by(Asistencia.fecha.desc(), Asistencia.created_at.desc()).offset(offset).limit(page_size).all()
        
        # Convertir a response con información del usuario
        asistencias_response = [
            AsistenciaResponse.model_validate(enriquecer_asistencia_con_usuario(a, db))
            for a in asistencias
        ]
        
        return create_paginated_response(
            records=asistencias_response,
            total_records=total_records,
            page=page,
            page_size=page_size,
            message="Todas las asistencias obtenidas exitosamente"
        )
        
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener asistencias: {str(e)}"
        )


@router.get("/usuario/{user_id}")
async def obtener_asistencias_usuario(
    user_id: int,
    page: int = Query(1, ge=1, description="Número de página"),
    pageSize: int = Query(10, ge=1, le=100, description="Tamaño de página"),
    fecha_inicio: Optional[date] = Query(None, description="Fecha de inicio del filtro"),
    fecha_fin: Optional[date] = Query(None, description="Fecha de fin del filtro"),
    current_user: "User" = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Obtiene las asistencias de un usuario con paginación
    
    🔒 RUTA PROTEGIDA (requiere autenticación)
    
    - **user_id**: ID del usuario
    - **page**: Número de página (starting from 1)
    - **pageSize**: Tamaño de página (max 100)
    - **fecha_inicio**: Fecha de inicio del filtro (opcional)
    - **fecha_fin**: Fecha de fin del filtro (opcional)
    
    Returns:
        {
            "data": {
                "records": AsistenciaResponse[],
                "totalRecords": number,
                "totalPages": number,
                "currentPage": number
            },
            "message": string
        }
    """
    try:
        from src.users.model import User
        
        # Verificar que el usuario existe
        usuario = db.query(User).filter(User.id == user_id).first()
        if not usuario:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Usuario con ID {user_id} no encontrado"
            )
        
        # Construir query base
        from .model import Asistencia
        query = db.query(Asistencia).filter(Asistencia.user_id == user_id)
        
        # Aplicar filtros de fechas
        if fecha_inicio is not None:
            query = query.filter(Asistencia.fecha >= fecha_inicio)
        
        if fecha_fin is not None:
            query = query.filter(Asistencia.fecha <= fecha_fin)
        
        # Contar total de registros
        total_records = query.count()
        
        # Aplicar paginación
        offset = (page - 1) * pageSize
        asistencias = query.order_by(Asistencia.fecha.desc(), Asistencia.created_at.desc()).offset(offset).limit(pageSize).all()
        
        # Convertir a response con información del usuario
        asistencias_response = [
            AsistenciaResponse.model_validate(enriquecer_asistencia_con_usuario(a, db))
            for a in asistencias
        ]
        
        return create_paginated_response(
            records=asistencias_response,
            total_records=total_records,
            page=page,
            page_size=pageSize,
            message=f"Asistencias del usuario {usuario.name} obtenidas exitosamente"
        )
        
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener asistencias: {str(e)}"
        )


@router.get("/{asistencia_id}")
async def obtener_asistencia(
    asistencia_id: int,
    current_user: "User" = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Obtiene una asistencia específica por ID
    
    🔒 RUTA PROTEGIDA (requiere autenticación)
    
    - **asistencia_id**: ID del registro de asistencia
    
    Returns:
        {
            "data": AsistenciaResponse,
            "message": string
        }
    """
    try:
        asistencia = asistencia_service.get_asistencia(db, asistencia_id)
        
        # Enriquecer con información del usuario
        asistencia_enriquecida = enriquecer_asistencia_con_usuario(asistencia, db)
        
        return create_single_response(
            data=AsistenciaResponse.model_validate(asistencia_enriquecida),
            message="Asistencia obtenida exitosamente"
        )
        
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener asistencia: {str(e)}"
        )


@router.delete("/{asistencia_id}")
async def eliminar_asistencia(
    asistencia_id: int,
    current_user: "User" = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Elimina un registro de asistencia (solo administradores)
    
    � RUTA ADMIN ONLY (requiere rol administrador)
    
    - **asistencia_id**: ID del registro a eliminar
    
    Returns:
        {
            "message": string
        }
    """
    try:
        # Validar que sea admin
        if not current_user.es_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo administradores pueden eliminar asistencias"
            )
        
        asistencia_service.delete_asistencia(db, asistencia_id)
        
        return {
            "message": "Asistencia eliminada exitosamente"
        }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al eliminar asistencia: {str(e)}"
        )
