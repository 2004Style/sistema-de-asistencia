"""
Servicio para la gestión de justificaciones.

Contiene la lógica de negocio para CRUD y aprobación de justificaciones.
"""

from typing import Optional, List
from datetime import date, datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from fastapi import HTTPException, status

from .model import Justificacion, EstadoJustificacion, TipoJustificacion
from src.users.service import user_service
from .schemas import JustificacionCreate, JustificacionUpdate, JustificacionEstadisticas
from src.utils.base_service import BaseService


class JustificacionService(BaseService):
    """Servicio para gestión de justificaciones."""
    
    model_class = Justificacion

    def create_justificacion(self, db: Session, justificacion_data: JustificacionCreate) -> Justificacion:
        """
        Crea una nueva justificación.
        
        Args:
            justificacion_data: Datos de la justificación a crear
            
        Returns:
            Justificación creada
            
        Raises:
            HTTPException: Si el usuario no existe o las fechas son inválidas
        """
        # Validar que el usuario existe
        user_service.get_user(db, justificacion_data.user_id)
        
        # Validar que las fechas no sean futuras lejanas (más de 30 días)
        dias_anticipacion = (justificacion_data.fecha_inicio - date.today()).days
        if dias_anticipacion > 30:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se pueden crear justificaciones con más de 30 días de anticipación"
            )
        
        # Crear la justificación
        justificacion = Justificacion(**justificacion_data.model_dump())
        
        return self.save_with_transaction(db, justificacion)
    
    def get_justificacion(self, db: Session, justificacion_id: int) -> Justificacion:
        """
        Obtiene una justificación por su ID.
        
        Args:
            justificacion_id: ID de la justificación
            
        Returns:
            Justificación encontrada
            
        Raises:
            HTTPException: Si la justificación no existe
        """
        return self.get_by_id(db, justificacion_id)
    
    def get_justificaciones(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        user_id: Optional[int] = None,
        estado: Optional[EstadoJustificacion] = None,
        tipo: Optional[TipoJustificacion] = None,
        fecha_desde: Optional[date] = None,
        fecha_hasta: Optional[date] = None
    ) -> tuple[List[Justificacion], int]:
        """
        Obtiene una lista paginada de justificaciones con filtros opcionales.
        
        Args:
            skip: Número de registros a saltar
            limit: Número máximo de registros a retornar
            user_id: Filtrar por ID de usuario
            estado: Filtrar por estado
            tipo: Filtrar por tipo
            fecha_desde: Filtrar desde fecha
            fecha_hasta: Filtrar hasta fecha
            
        Returns:
            Tupla con (lista de justificaciones, total de registros)
        """
        query = db.query(Justificacion)
        
        # Aplicar filtros
        if user_id is not None:
            query = query.filter(Justificacion.user_id == user_id)
        if estado is not None:
            query = query.filter(Justificacion.estado == estado)
        if tipo is not None:
            query = query.filter(Justificacion.tipo == tipo)
        if fecha_desde is not None:
            query = query.filter(Justificacion.fecha_inicio >= fecha_desde)
        if fecha_hasta is not None:
            query = query.filter(Justificacion.fecha_fin <= fecha_hasta)
        
        # Contar total
        total = query.count()
        
        # Ordenar por fecha de creación descendente y paginar
        justificaciones = query.order_by(Justificacion.created_at.desc()).offset(skip).limit(limit).all()
        
        return justificaciones, total
    
    def get_justificaciones_by_user(self, db: Session, user_id: int) -> List[Justificacion]:
        """
        Obtiene todas las justificaciones de un usuario.
        
        Args:
            user_id: ID del usuario
            
        Returns:
            Lista de justificaciones del usuario
            
        Raises:
            HTTPException: Si el usuario no existe
        """
        # Validar que el usuario existe
        user = user_service.get_user(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Usuario con ID {user_id} no encontrado"
            )
        
        return db.query(Justificacion).filter(
            Justificacion.user_id == user_id
        ).order_by(Justificacion.fecha_inicio.desc()).all()
    
    def get_justificaciones_pendientes(self, db: Session) -> List[Justificacion]:
        """
        Obtiene todas las justificaciones pendientes de revisión.
        
        Returns:
            Lista de justificaciones pendientes
        """
        return db.query(Justificacion).filter(
            Justificacion.estado == EstadoJustificacion.PENDIENTE
        ).order_by(Justificacion.fecha_inicio.desc()).all()
    
    def get_justificaciones_pendientes_by_user(self, db: Session, user_id: int) -> List[Justificacion]:
        """
        Obtiene las justificaciones pendientes de un usuario.
        
        Args:
            user_id: ID del usuario
            
        Returns:
            Lista de justificaciones pendientes del usuario
        """
        return db.query(Justificacion).filter(
            and_(
                Justificacion.user_id == user_id,
                Justificacion.estado == EstadoJustificacion.PENDIENTE
            )
        ).order_by(Justificacion.fecha_inicio.desc()).all()
    
    def update_justificacion(
        self,
        db: Session,
        justificacion_id: int, 
        justificacion_data: JustificacionUpdate
    ) -> Justificacion:
        """
        Actualiza una justificación existente.
        Solo se pueden actualizar justificaciones en estado PENDIENTE.
        
        Args:
            justificacion_id: ID de la justificación a actualizar
            justificacion_data: Datos actualizados
            
        Returns:
            Justificación actualizada
            
        Raises:
            HTTPException: Si la justificación no existe o no está pendiente
        """
        # Obtener la justificación existente
        justificacion = self.get_justificacion(db, justificacion_id)
        
        # Validar que está pendiente
        if justificacion.estado != EstadoJustificacion.PENDIENTE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Solo se pueden actualizar justificaciones en estado PENDIENTE"
            )
        
        # Actualizar solo los campos proporcionados
        update_data = justificacion_data.model_dump(exclude_unset=True)
        
        for key, value in update_data.items():
            setattr(justificacion, key, value)
        
        return self.update_with_transaction(db, justificacion)
    
    def aprobar_justificacion(
        self,
        db: Session,
        justificacion_id: int,
        revisor_id: int,
        comentario: Optional[str] = None
    ) -> Justificacion:
        """
        Aprueba una justificación pendiente.
        
        Args:
            justificacion_id: ID de la justificación a aprobar
            revisor_id: ID del usuario que aprueba
            comentario: Comentario opcional del revisor
            
        Returns:
            Justificación aprobada
            
        Raises:
            HTTPException: Si la justificación no existe o no está pendiente
        """
        # Validar que el revisor existe
        user_service.get_user(db, revisor_id)
        
        # Obtener la justificación
        justificacion = self.get_justificacion(db, justificacion_id)
        
        # Validar que está pendiente
        if justificacion.estado != EstadoJustificacion.PENDIENTE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"La justificación ya fue {justificacion.estado.value.lower()}"
            )
        
        # Aprobar usando el método del modelo
        justificacion.aprobar(revisor_id, comentario)
        
        return self.update_with_transaction(db, justificacion)
    
    def rechazar_justificacion(
        self, 
        db: Session,
        justificacion_id: int, 
        revisor_id: int,
        comentario: str
    ) -> Justificacion:
        """
        Rechaza una justificación.
        
        Args:
            justificacion_id: ID de la justificación
            revisor_id: ID del revisor que rechaza
            comentario: Comentario del revisor (obligatorio para rechazo)
            
        Returns:
            Justificación rechazada
            
        Raises:
            HTTPException: Si la justificación no existe, no está pendiente o el revisor no existe
        """
        # Validar que el comentario no esté vacío
        if not comentario or comentario.strip() == "":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El comentario es obligatorio para rechazar una justificación"
            )
        
        # Validar que el revisor existe
        user_service.get_user(db, revisor_id)
        
        # Obtener la justificación
        justificacion = self.get_justificacion(db, justificacion_id)
        
        # Validar que está pendiente
        if justificacion.estado != EstadoJustificacion.PENDIENTE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"La justificación ya fue {justificacion.estado.value.lower()}"
            )
        
        # Rechazar usando el método del modelo
        justificacion.rechazar(revisor_id, comentario)
        
        return self.update_with_transaction(db, justificacion)
    
    def delete_justificacion(self, db: Session, justificacion_id: int) -> bool:
        """
        Elimina una justificación.
        Solo se pueden eliminar justificaciones en estado PENDIENTE.
        
        Args:
            justificacion_id: ID de la justificación a eliminar
            
        Returns:
            True si se eliminó correctamente
            
        Raises:
            HTTPException: Si la justificación no existe o ya fue procesada
        """
        # Obtener la justificación
        justificacion = self.get_justificacion(db, justificacion_id)
        
        # Validar que está pendiente
        if justificacion.estado != EstadoJustificacion.PENDIENTE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Solo se pueden eliminar justificaciones en estado PENDIENTE"
            )
        
        return self.delete_with_transaction(db, justificacion_id)
    
    def get_estadisticas(
        self,
        db: Session,
        user_id: Optional[int] = None,
        fecha_desde: Optional[date] = None,
        fecha_hasta: Optional[date] = None
    ) -> JustificacionEstadisticas:
        """
        Obtiene estadísticas de justificaciones.
        
        Args:
            user_id: Filtrar por usuario específico
            fecha_desde: Filtrar desde fecha
            fecha_hasta: Filtrar hasta fecha
            
        Returns:
            Estadísticas de justificaciones
        """
        query = db.query(Justificacion)
        
        # Aplicar filtros
        if user_id is not None:
            query = query.filter(Justificacion.user_id == user_id)
        if fecha_desde is not None:
            query = query.filter(Justificacion.fecha_inicio >= fecha_desde)
        if fecha_hasta is not None:
            query = query.filter(Justificacion.fecha_fin <= fecha_hasta)
        
        justificaciones = query.all()
        
        # Calcular estadísticas
        total = len(justificaciones)
        pendientes = sum(1 for j in justificaciones if j.estado == EstadoJustificacion.PENDIENTE)
        aprobadas = sum(1 for j in justificaciones if j.estado == EstadoJustificacion.APROBADA)
        rechazadas = sum(1 for j in justificaciones if j.estado == EstadoJustificacion.RECHAZADA)
        
        # Contar por tipo
        por_tipo = {}
        for tipo in TipoJustificacion:
            por_tipo[tipo.value] = sum(1 for j in justificaciones if j.tipo == tipo)
        
        # Total de días justificados (solo aprobadas)
        dias_totales = sum(
            j.dias_justificados 
            for j in justificaciones 
            if j.estado == EstadoJustificacion.APROBADA
        )
        
        return JustificacionEstadisticas(
            total=total,
            pendientes=pendientes,
            aprobadas=aprobadas,
            rechazadas=rechazadas,
            por_tipo=por_tipo,
            dias_totales_justificados=dias_totales
        )


# Singleton del servicio
justificacion_service = JustificacionService()