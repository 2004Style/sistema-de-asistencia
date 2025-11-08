"""
Service de Notificaciones - Lógica de negocio
Maneja notificaciones in-app y emails
"""
from typing import Optional, List
from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
import logging

from .model import Notificacion, TipoNotificacion, PrioridadNotificacion
from src.users.service import UserService
from .schemas import NotificacionCreate, NotificacionUpdate
from src.email.service import email_service
from src.config.settings import get_settings
from src.utils.base_service import BaseService

logger = logging.getLogger(__name__)
settings = get_settings()


class NotificacionService(BaseService):
    """
    Servicio de Notificaciones
    Maneja toda la lógica de negocio y acceso a datos
    """
    
    model_class = Notificacion
    
    def __init__(self):
        super().__init__()
    
    async def crear_notificacion(
        self,
        db: Session,
        user_id: int,
        tipo: TipoNotificacion,
        titulo: str,
        mensaje: str,
        datos_adicionales: Optional[dict] = None,
        prioridad: PrioridadNotificacion = PrioridadNotificacion.MEDIA
    ) -> Notificacion:
        """
        Crear una nueva notificación
        
        Args:
            db: Sesión de base de datos
            user_id: ID del usuario
            tipo: Tipo de notificación
            titulo: Título de la notificación
            mensaje: Mensaje de la notificación
            datos_adicionales: Datos adicionales en JSON
            prioridad: Prioridad de la notificación
            
        Returns:
            Notificación creada
        """
        notificacion = Notificacion(
            user_id=user_id,
            tipo=tipo,
            titulo=titulo,
            mensaje=mensaje,
            datos_adicionales=datos_adicionales,
            prioridad=prioridad,
            leida=False
        )
        
        return self.save_with_transaction(db, notificacion)
    
    async def notificar_tardanza(
        self,
        db: Session,
        user_id: int,
        user_email: str,
        user_name: str,
        fecha: date,
        hora_entrada: str,
        minutos_tarde: int,
        supervisor_email: Optional[str] = None
    ) -> bool:
        """
        Notificar tardanza al empleado y supervisor
        Requerimiento #20
        """
        try:
            # Crear notificación in-app
            await self.crear_notificacion(
                db=db,
                user_id=user_id,
                tipo=TipoNotificacion.TARDANZA,
                titulo="Tardanza registrada",
                mensaje=f"Has llegado {minutos_tarde} minutos tarde el {fecha}",
                datos_adicionales={
                    "fecha": str(fecha),
                    "hora_entrada": hora_entrada,
                    "minutos_tarde": minutos_tarde
                },
                prioridad=PrioridadNotificacion.MEDIA
            )
            
            # Enviar email
            fecha_str = fecha.strftime("%d/%m/%Y")
            await email_service.send_tardanza_notification(
                user_email=user_email,
                user_name=user_name,
                fecha=fecha_str,
                hora_entrada=hora_entrada,
                minutos_tarde=minutos_tarde,
                supervisor_email=supervisor_email
            )
            
            logger.info(f"Late arrival notification sent to user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error notifying late arrival: {str(e)}")
            return False
    
    async def notificar_ausencia(
        self,
        db: Session,
        user_id: int,
        user_email: str,
        user_name: str,
        fecha: date,
        supervisor_email: Optional[str] = None
    ) -> bool:
        """
        Notificar ausencia no justificada
        Requerimiento #21
        """
        try:
            # Crear notificación in-app
            await self.crear_notificacion(
                db=db,
                user_id=user_id,
                tipo=TipoNotificacion.AUSENCIA,
                titulo="Ausencia no justificada",
                mensaje=f"No se registró asistencia el {fecha}",
                datos_adicionales={"fecha": str(fecha)},
                prioridad=PrioridadNotificacion.ALTA
            )
            
            # Enviar email
            fecha_str = fecha.strftime("%d/%m/%Y")
            await email_service.send_ausencia_notification(
                user_email=user_email,
                user_name=user_name,
                fecha=fecha_str,
                supervisor_email=supervisor_email
            )
            
            logger.info(f"Absence notification sent to user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error notifying absence: {str(e)}")
            return False
    
    async def notificar_alerta_acumulada(
        self,
        db: Session,
        user_id: int,
        user_email: str,
        user_name: str,
        tipo_alerta: str,
        cantidad: int,
        supervisor_email: Optional[str] = None
    ) -> bool:
        """
        Notificar acumulación de tardanzas o faltas
        Requerimiento #22
        """
        try:
            tipo_notif = TipoNotificacion.ALERTA if tipo_alerta == "tardanzas" else TipoNotificacion.AUSENCIA
            tipo_texto = "tardanzas" if tipo_alerta == "tardanzas" else "faltas"
            
            # Crear notificación in-app
            await self.crear_notificacion(
                db=db,
                user_id=user_id,
                tipo=tipo_notif,
                titulo=f"Alerta: {cantidad} {tipo_texto} acumuladas",
                mensaje=f"Has acumulado {cantidad} {tipo_texto} en el período actual",
                datos_adicionales={
                    "tipo": tipo_alerta,
                    "cantidad": cantidad
                },
                prioridad=PrioridadNotificacion.ALTA
            )
            
            # Enviar email
            await email_service.send_alerta_acumulada(
                user_email=user_email,
                user_name=user_name,
                tipo_alerta=tipo_alerta,
                cantidad=cantidad,
                supervisor_email=supervisor_email
            )
            
            logger.info(f"Accumulated alert sent to user {user_id}: {cantidad} {tipo_texto}")
            return True
            
        except Exception as e:
            logger.error(f"Error notifying accumulated alert: {str(e)}")
            return False
    
    async def notificar_exceso_jornada(
        self,
        db: Session,
        user_id: int,
        fecha: date,
        horas_trabajadas: float,
        horas_requeridas: float
    ) -> bool:
        """
        Notificar exceso de horas laborales
        Requerimiento #8
        """
        try:
            diferencia = horas_trabajadas - horas_requeridas
            
            await self.crear_notificacion(
                db=db,
                user_id=user_id,
                tipo=TipoNotificacion.EXCESO_JORNADA,
                titulo="Exceso de jornada laboral",
                mensaje=f"Has trabajado {diferencia:.1f} horas extras el {fecha}",
                datos_adicionales={
                    "fecha": str(fecha),
                    "horas_trabajadas": horas_trabajadas,
                    "horas_requeridas": horas_requeridas,
                    "diferencia": diferencia
                },
                prioridad=PrioridadNotificacion.BAJA
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Error notifying overtime: {str(e)}")
            return False
    
    async def notificar_incumplimiento_jornada(
        self,
        db: Session,
        user_id: int,
        fecha: date,
        horas_trabajadas: float,
        horas_requeridas: float
    ) -> bool:
        """
        Notificar incumplimiento de horas laborales
        Requerimiento #8
        """
        try:
            diferencia = horas_requeridas - horas_trabajadas
            
            await self.crear_notificacion(
                db=db,
                user_id=user_id,
                tipo=TipoNotificacion.INCUMPLIMIENTO_JORNADA,
                titulo="Incumplimiento de jornada laboral",
                mensaje=f"Faltaron {diferencia:.1f} horas para completar tu jornada el {fecha}",
                datos_adicionales={
                    "fecha": str(fecha),
                    "horas_trabajadas": horas_trabajadas,
                    "horas_requeridas": horas_requeridas,
                    "diferencia": diferencia
                },
                prioridad=PrioridadNotificacion.MEDIA
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Error notifying incomplete workday: {str(e)}")
            return False
    
    def obtener_notificaciones_usuario(
        self,
        db: Session,
        user_id: int,
        solo_no_leidas: bool = False,
        skip: int = 0,
        limit: int = 50
    ) -> List[Notificacion]:
        """
        Obtener notificaciones de un usuario
        
        Args:
            db: Sesión de base de datos
            user_id: ID del usuario
            solo_no_leidas: Solo no leídas
            skip: Registros a omitir
            limit: Límite de registros
            
        Returns:
            Lista de notificaciones
        """
        query = db.query(Notificacion).filter(Notificacion.user_id == user_id)
        
        if solo_no_leidas:
            query = query.filter(Notificacion.leida == False)
        
        return query.order_by(Notificacion.created_at.desc()).offset(skip).limit(limit).all()
    
    def obtener_notificacion(self, db: Session, notificacion_id: int, user_id: int) -> Notificacion:
        """
        Obtener una notificación específica
        
        Args:
            db: Sesión de base de datos
            notificacion_id: ID de la notificación
            user_id: ID del usuario (para validar pertenencia)
            
        Returns:
            Notificación encontrada
            
        Raises:
            HTTPException: Si no se encuentra o no pertenece al usuario
        """
        notificacion = self.get_by_id(db, notificacion_id, "Notificación no encontrada")
        
        if notificacion.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notificación no encontrada"
            )
        
        return notificacion
    
    def obtener_todas_notificaciones(self, db: Session, skip: int = 0, limit: int = 50) -> list:
        """
        Obtener TODAS las notificaciones del sistema (solo admin)
        
        Args:
            db: Sesión de base de datos
            skip: Registros a omitir
            limit: Límite de registros
            
        Returns:
            Lista de notificaciones
        """
        return db.query(Notificacion).order_by(Notificacion.created_at.desc()).offset(skip).limit(limit).all()
    
    def marcar_como_leida(self, db: Session, notificacion_id: int, user_id: int) -> Notificacion:
        """
        Marcar notificación como leída
        
        Args:
            db: Sesión de base de datos
            notificacion_id: ID de la notificación
            user_id: ID del usuario
            
        Returns:
            Notificación actualizada
        """
        notificacion = self.obtener_notificacion(db, notificacion_id, user_id)
        
        notificacion.leida = True
        notificacion.fecha_lectura = datetime.utcnow()
        
        return self.update_with_transaction(db, notificacion)
    
    def marcar_todas_como_leidas(self, db: Session, user_id: int) -> int:
        """
        Marcar todas las notificaciones como leídas
        
        Args:
            db: Sesión de base de datos
            user_id: ID del usuario
            
        Returns:
            Cantidad de notificaciones actualizadas
        """
        count = db.query(Notificacion).filter(
            Notificacion.user_id == user_id,
            Notificacion.leida == False
        ).update({
            "leida": True,
            "fecha_lectura": datetime.utcnow()
        })
        
        db.commit()
        return count
    
    def contar_no_leidas(self, db: Session, user_id: int) -> int:
        """
        Contar notificaciones no leídas
        
        Args:
            db: Sesión de base de datos
            user_id: ID del usuario
            
        Returns:
            Cantidad de notificaciones no leídas
        """
        return db.query(Notificacion).filter(
            Notificacion.user_id == user_id,
            Notificacion.leida == False
        ).count()
    
    def eliminar_antiguas(self, db: Session, dias: int = 30) -> int:
        """
        Eliminar notificaciones leídas antiguas
        
        Args:
            db: Sesión de base de datos
            dias: Días de antigüedad
            
        Returns:
            Cantidad de notificaciones eliminadas
        """
        cutoff_date = datetime.utcnow() - timedelta(days=dias)
        
        count = db.query(Notificacion).filter(
            Notificacion.created_at < cutoff_date,
            Notificacion.leida == True
        ).delete()
        
        db.commit()
        return count


# Instancia singleton del servicio
notificacion_service = NotificacionService()
