"""
Reportes Controller - HTTP endpoints for report generation
Endpoints para generar y descargar reportes de asistencia
Requerimientos: #11, #12, #13, #14, #15
"""
from fastapi import APIRouter, Depends, Query, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional, TYPE_CHECKING
from datetime import date, datetime, timedelta
from pathlib import Path
import hashlib

from src.config.database import get_db
from .service import reportes_service
from src.auth import require_admin, require_can_view_reports

if TYPE_CHECKING:
    from src.users.model import User

router = APIRouter(prefix="/reportes", tags=["Reportes"])


# ========================
# ENDPOINTS: Generación de Reportes
# ========================

@router.get("/diario", summary="Generar reporte diario")
async def generar_reporte_diario(
    fecha: date = Query(..., description="Fecha del reporte (YYYY-MM-DD)"),
    user_id: Optional[int] = Query(None, description="ID del usuario (opcional, si no se envía genera para todos)"),
    formato: str = Query("both", pattern="^(pdf|excel|both)$", description="Formato: pdf, excel o both"),
    enviar_email: bool = Query(False, description="Enviar reporte por email"),
    db: Session = Depends(get_db),
    current_user: "User" = Depends(require_admin)
):
    """
    Generar reporte diario de asistencia
    
    **Requerimiento #11:** Reporte diario de asistencia
    
    - **fecha**: Fecha del reporte (YYYY-MM-DD)
    - **user_id**: ID del usuario específico (opcional)
    - **formato**: pdf, excel o both (predeterminado: both)
    - **enviar_email**: Si es True, envía el reporte por email
    
    **Retorna:** URLs de descarga de los archivos generados
    """
    try:
        # Validar que la fecha no sea futura
        if fecha > date.today():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se pueden generar reportes de fechas futuras"
            )
        
        # Generar reporte con opción de envío de email
        resultado = await reportes_service.generar_reporte_diario(
            db=db,
            fecha=fecha,
            user_id=user_id,
            formato=formato,
            enviar_email=enviar_email
        )
        
        return {
            "success": True,
            "message": "Reporte generado exitosamente",
            "fecha": fecha.isoformat(),
            "archivos": resultado,
            "generado_por": current_user.name,
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al generar reporte: {str(e)}"
        )


@router.get("/semanal", summary="Generar reporte semanal")
async def generar_reporte_semanal(
    fecha_inicio: date = Query(..., description="Fecha de inicio de la semana (preferiblemente lunes)"),
    user_id: Optional[int] = Query(None, description="ID del usuario (opcional)"),
    formato: str = Query("both", pattern="^(pdf|excel|both)$", description="Formato: pdf, excel o both"),
    enviar_email: bool = Query(False, description="Enviar reporte por email"),
    db: Session = Depends(get_db),
    current_user: "User" = Depends(require_admin)
):
    """
    Generar reporte semanal de asistencia (lunes a domingo)
    
    **Requerimiento #12:** Reporte semanal de asistencia
    
    - **fecha_inicio**: Fecha de inicio de la semana
    - **user_id**: ID del usuario específico (opcional)
    - **formato**: pdf, excel o both
    - **enviar_email**: Si es True, envía el reporte por email
    """
    try:
        # Calcular fecha fin (6 días después)
        fecha_fin = fecha_inicio + timedelta(days=6)
        
        # Validar que no incluya fechas futuras
        if fecha_fin > date.today():
            fecha_fin = date.today()
        
        # Generar reporte con opción de envío de email
        resultado = await reportes_service.generar_reporte_semanal(
            db=db,
            fecha_inicio=fecha_inicio,
            user_id=user_id,
            formato=formato,
            enviar_email=enviar_email
        )
        
        return {
            "success": True,
            "message": "Reporte semanal generado exitosamente",
            "fecha_inicio": fecha_inicio.isoformat(),
            "fecha_fin": fecha_fin.isoformat(),
            "archivos": resultado,
            "generado_por": current_user.name,
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al generar reporte semanal: {str(e)}"
        )


@router.get("/mensual", summary="Generar reporte mensual")
async def generar_reporte_mensual(
    anio: int = Query(..., ge=2000, le=2100, description="Año del reporte"),
    mes: int = Query(..., ge=1, le=12, description="Mes del reporte (1-12)"),
    user_id: Optional[int] = Query(None, description="ID del usuario (opcional)"),
    formato: str = Query("both", pattern="^(pdf|excel|both)$", description="Formato: pdf, excel o both"),
    enviar_email: bool = Query(False, description="Enviar reporte por email"),
    db: Session = Depends(get_db),
    current_user: "User" = Depends(require_admin)
):
    """
    Generar reporte mensual de asistencia
    
    **Requerimiento #13:** Reporte mensual de asistencia
    
    - **anio**: Año del reporte (2000-2100)
    - **mes**: Mes del reporte (1-12)
    - **user_id**: ID del usuario específico (opcional)
    - **formato**: pdf, excel o both
    - **enviar_email**: Si es True, envía el reporte por email
    """
    try:
        # Validar que no sea un mes futuro
        fecha_actual = date.today()
        if anio > fecha_actual.year or (anio == fecha_actual.year and mes > fecha_actual.month):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se pueden generar reportes de meses futuros"
            )
        
        # Generar reporte con opción de envío de email
        resultado = await reportes_service.generar_reporte_mensual(
            db=db,
            anio=anio,
            mes=mes,
            user_id=user_id,
            formato=formato,
            enviar_email=enviar_email
        )
        
        # Nombres de meses en español
        meses_nombres = [
            "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ]
        
        return {
            "success": True,
            "message": f"Reporte mensual de {meses_nombres[mes-1]} {anio} generado exitosamente",
            "anio": anio,
            "mes": mes,
            "mes_nombre": meses_nombres[mes-1],
            "archivos": resultado,
            "generado_por": current_user.name,
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al generar reporte mensual: {str(e)}"
        )


@router.get("/tardanzas", summary="Reporte consolidado de tardanzas")
async def generar_reporte_tardanzas(
    fecha_inicio: date = Query(..., description="Fecha de inicio del período"),
    fecha_fin: date = Query(..., description="Fecha de fin del período"),
    user_id: Optional[int] = Query(None, description="ID del usuario (opcional)"),
    formato: str = Query("both", pattern="^(pdf|excel|both)$", description="Formato: pdf, excel o both"),
    enviar_email: bool = Query(False, description="Enviar reporte por email"),
    db: Session = Depends(get_db),
    current_user: "User" = Depends(require_admin)
):
    """
    Generar reporte consolidado de tardanzas
    
    **Requerimiento #14:** Reporte de tardanzas acumuladas
    
    - **fecha_inicio**: Fecha de inicio del período
    - **fecha_fin**: Fecha de fin del período
    - **user_id**: ID del usuario específico (opcional)
    - **formato**: pdf, excel o both
    - **enviar_email**: Si es True, envía el reporte por email
    """
    try:
        # Validar fechas
        if fecha_inicio > fecha_fin:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La fecha de inicio no puede ser posterior a la fecha de fin"
            )
        
        if fecha_fin > date.today():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La fecha de fin no puede ser futura"
            )
        
        # Generar reporte con opción de envío de email
        resultado = await reportes_service.generar_reporte_tardanzas(
            db=db,
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
            user_id=user_id,
            formato=formato,
            enviar_email=enviar_email
        )
        
        return {
            "success": True,
            "message": "Reporte de tardanzas generado exitosamente",
            "fecha_inicio": fecha_inicio.isoformat(),
            "fecha_fin": fecha_fin.isoformat(),
            "archivos": resultado,
            "generado_por": current_user.name,
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al generar reporte de tardanzas: {str(e)}"
        )


@router.get("/inasistencias", summary="Reporte consolidado de inasistencias")
async def generar_reporte_inasistencias(
    fecha_inicio: date = Query(..., description="Fecha de inicio del período"),
    fecha_fin: date = Query(..., description="Fecha de fin del período"),
    user_id: Optional[int] = Query(None, description="ID del usuario (opcional)"),
    formato: str = Query("both", pattern="^(pdf|excel|both)$", description="Formato: pdf, excel o both"),
    enviar_email: bool = Query(False, description="Enviar reporte por email"),
    db: Session = Depends(get_db),
    current_user: "User" = Depends(require_admin)
):
    """
    Generar reporte consolidado de inasistencias
    
    **Requerimiento #15:** Reporte de inasistencias
    
    - **fecha_inicio**: Fecha de inicio del período
    - **fecha_fin**: Fecha de fin del período
    - **user_id**: ID del usuario específico (opcional)
    - **formato**: pdf, excel o both
    - **enviar_email**: Si es True, envía el reporte por email
    """
    try:
        # Validar fechas
        if fecha_inicio > fecha_fin:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La fecha de inicio no puede ser posterior a la fecha de fin"
            )
        
        if fecha_fin > date.today():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La fecha de fin no puede ser futura"
            )
        
        # Generar reporte con opción de envío de email
        resultado = await reportes_service.generar_reporte_inasistencias(
            db=db,
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
            user_id=user_id,
            formato=formato,
            enviar_email=enviar_email
        )
        
        return {
            "success": True,
            "message": "Reporte de inasistencias generado exitosamente",
            "fecha_inicio": fecha_inicio.isoformat(),
            "fecha_fin": fecha_fin.isoformat(),
            "archivos": resultado,
            "generado_por": current_user.name,
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al generar reporte de inasistencias: {str(e)}"
        )


# ========================
# ENDPOINTS: Gestión de Reportes
# ========================

@router.get("/listar", summary="Listar reportes generados")
async def listar_reportes(
    tipo: Optional[str] = Query(None, pattern="^(diario|semanal|mensual|tardanzas|inasistencias)$", 
                                description="Tipo de reporte"),
    limite: int = Query(50, ge=1, le=200, description="Número máximo de reportes a retornar"),
    current_user: "User" = Depends(require_admin)
):
    """
    Listar reportes generados previamente
    
    Retorna una lista de todos los reportes generados, ordenados por fecha de creación
    
    - **tipo**: Filtrar por tipo de reporte (opcional)
    - **limite**: Número máximo de reportes (predeterminado: 50, máximo: 200)
    """
    try:
        from src.config.settings import get_settings
        settings = get_settings()
        reports_dir = Path(settings.REPORTS_DIR)
        
        reportes = []
        
        # Función auxiliar para detectar tipo de reporte desde nombre
        def detectar_tipo_reporte(nombre_archivo: str) -> str:
            """Detecta el tipo de reporte basado en el nombre del archivo"""
            nombre_lower = nombre_archivo.lower()
            if "tardanza" in nombre_lower:
                return "tardanzas"
            elif "inasistencia" in nombre_lower:
                return "inasistencias"
            elif "mensual" in nombre_lower:
                return "mensual"
            elif "semanal" in nombre_lower:
                return "semanal"
            elif "diario" in nombre_lower:
                return "diario"
            return "otro"
        
        # Recopilar archivos del directorio raíz de reportes
        if reports_dir.exists():
            for archivo in reports_dir.glob("*"):
                # Solo archivos, no directorios
                if archivo.is_file() and archivo.suffix in [".pdf", ".xlsx"]:
                    stat = archivo.stat()
                    tipo_detectado = detectar_tipo_reporte(archivo.name)
                    
                    # Filtrar por tipo si se especifica
                    if tipo and tipo_detectado != tipo:
                        continue
                    
                    # Generar ID único basado en el nombre del archivo
                    reporte_id = hashlib.md5(archivo.name.encode()).hexdigest()[:12]
                    
                    reportes.append({
                        "id": reporte_id,
                        "nombre": archivo.name,
                        "ruta": str(archivo.relative_to(reports_dir)),
                        "tipo": tipo_detectado,
                        "formato": archivo.suffix[1:],  # Sin el punto
                        "tamano": stat.st_size,
                        "fecha_creacion": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                        "url_descarga": f"/api/reportes/descargar/{archivo.relative_to(reports_dir)}"
                    })
        
        # Ordenar por fecha de creación (más recientes primero)
        reportes.sort(key=lambda x: x["fecha_creacion"], reverse=True)
        
        # Limitar resultados
        reportes = reportes[:limite]
        
        return {
            "success": True,
            "total": len(reportes),
            "records": reportes
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al listar reportes: {str(e)}"
        )


@router.get("/descargar/{ruta:path}", summary="Descargar reporte")
async def descargar_reporte(
    ruta: str,
    current_user: "User" = Depends(require_admin)
):
    """
    Descargar un reporte generado previamente
    
    - **ruta**: Ruta relativa del archivo dentro del directorio de reportes
    
    **Ejemplo:** `/api/reportes/descargar/diarios/reporte_2025-10-12.pdf`
    """
    try:
        from src.config.settings import get_settings
        settings = get_settings()
        reports_dir = Path(settings.REPORTS_DIR)
        
        # Construir ruta completa
        archivo_path = reports_dir / ruta
        
        # Validar que el archivo existe
        if not archivo_path.exists() or not archivo_path.is_file():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Reporte no encontrado"
            )
        
        # Validar que está dentro del directorio de reportes (seguridad)
        if not str(archivo_path.resolve()).startswith(str(reports_dir.resolve())):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acceso denegado"
            )
        
        # Determinar content type
        content_type = "application/pdf" if archivo_path.suffix == ".pdf" else \
                      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        
        # Retornar archivo
        return FileResponse(
            path=str(archivo_path),
            media_type=content_type,
            filename=archivo_path.name
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al descargar reporte: {str(e)}"
        )


@router.delete("/eliminar/{ruta:path}", summary="Eliminar reporte")
async def eliminar_reporte(
    ruta: str,
    current_user: "User" = Depends(require_admin)
):
    """
    Eliminar un reporte generado previamente
    
    - **ruta**: Ruta relativa del archivo dentro del directorio de reportes
    
    **Nota:** Esta acción es irreversible
    """
    try:
        from src.config.settings import get_settings
        settings = get_settings()
        reports_dir = Path(settings.REPORTS_DIR)
        
        # Construir ruta completa
        archivo_path = reports_dir / ruta
        
        # Validar que el archivo existe
        if not archivo_path.exists() or not archivo_path.is_file():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Reporte no encontrado"
            )
        
        # Validar que está dentro del directorio de reportes (seguridad)
        if not str(archivo_path.resolve()).startswith(str(reports_dir.resolve())):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acceso denegado"
            )
        
        # Eliminar archivo
        archivo_path.unlink()
        
        return {
            "success": True,
            "message": f"Reporte '{archivo_path.name}' eliminado exitosamente",
            "eliminado_por": current_user.name,
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al eliminar reporte: {str(e)}"
        )
