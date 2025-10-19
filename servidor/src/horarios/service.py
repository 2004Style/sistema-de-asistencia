"""
Servicio de gestión de horarios.

Contiene toda la lógica de negocio para:
- CRUD de horarios laborales
- Validación de solapamiento
- Soporte para múltiples turnos por día
- Detección de turno activo
"""

from sqlalchemy.orm import Session
from sqlalchemy import and_
from fastapi import HTTPException, status
from typing import Optional, List
from datetime import datetime, time, timedelta

from .model import Horario, DiaSemana
from .schemas import HorarioCreate, HorarioUpdate
from src.users.service import user_service
from src.turnos.service import turno_service
from src.utils.base_service import BaseService


class HorarioService(BaseService):
    """
    Servicio para gestionar horarios.
    
    Maneja:
    - CRUD de horarios
    - Validaciones de solapamiento
    - Múltiples turnos por día
    - Detección de turno activo
    """
    
    model_class = Horario
    
    def create_horario(self, db: Session, horario_data: HorarioCreate) -> Horario:
        """
        Crea un nuevo horario para un usuario.
        
        Args:
            horario_data: Datos del horario a crear
            
        Returns:
            Horario creado
            
        Raises:
            HTTPException: Si el usuario no existe, turno no existe,
                          o ya existe horario para ese día/turno
        """
        # Validar que el usuario existe
        user_service.get_user(db, horario_data.user_id)
        
        # Validar que el turno existe
        turno = turno_service.obtener_turno(db, horario_data.turno_id)
        
        # Validar que no existe un horario para este usuario, día y turno
        existing = db.query(Horario).filter(
            and_(
                Horario.user_id == horario_data.user_id,
                Horario.dia_semana == horario_data.dia_semana,
                Horario.turno_id == horario_data.turno_id
            )
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe un horario para el día {horario_data.dia_semana.value} con el turno {turno.nombre}"
            )
        
        # Obtener horarios del mismo día para validar solapamiento
        horarios_dia = db.query(Horario).filter(
            and_(
                Horario.user_id == horario_data.user_id,
                Horario.dia_semana == horario_data.dia_semana,
                Horario.activo == True
            )
        ).all()
        
        # Validar solapamiento
        self._validar_solapamiento(db, horarios_dia, horario_data)
        
        # Crear el horario
        horario = Horario(
            user_id=horario_data.user_id,
            turno_id=horario_data.turno_id,
            dia_semana=horario_data.dia_semana,
            hora_entrada=horario_data.hora_entrada,
            hora_salida=horario_data.hora_salida,
            horas_requeridas=horario_data.horas_requeridas,
            tolerancia_entrada=horario_data.tolerancia_entrada,
            tolerancia_salida=horario_data.tolerancia_salida,
            activo=horario_data.activo,
            descripcion=horario_data.descripcion
        )
        
        return self.save_with_transaction(db, horario)
    
    def _validar_solapamiento(self, db: Session, horarios_existentes: List[Horario], nuevo_horario: HorarioCreate):
        """
        Valida que el nuevo horario no se solape con horarios existentes del mismo día.
        
        Args:
            horarios_existentes: Lista de horarios existentes para el día
            nuevo_horario: Nuevo horario a crear
            
        Raises:
            HTTPException: Si hay solapamiento de horarios
        """
        nueva_entrada = datetime.combine(datetime.today(), nuevo_horario.hora_entrada)
        nueva_salida = datetime.combine(datetime.today(), nuevo_horario.hora_salida)
        
        # Manejar turno nocturno del nuevo horario
        if nuevo_horario.hora_salida < nuevo_horario.hora_entrada:
            nueva_salida += timedelta(days=1)
        
        for horario in horarios_existentes:
            horario_entrada = datetime.combine(datetime.today(), horario.hora_entrada)
            horario_salida = datetime.combine(datetime.today(), horario.hora_salida)
            
            # Manejar turno nocturno del horario existente
            if horario.hora_salida < horario.hora_entrada:
                horario_salida += timedelta(days=1)
            
            # Verificar solapamiento
            if (nueva_entrada < horario_salida and nueva_salida > horario_entrada):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"El horario se solapa con otro turno ({horario.hora_entrada.strftime('%H:%M')} - {horario.hora_salida.strftime('%H:%M')})"
                )
    
    def get_horario(self, db: Session, horario_id: int) -> Horario:
        """
        Obtiene un horario por su ID.
        
        Raises:
            HTTPException: Si el horario no existe
        """
        return self.get_by_id(db, horario_id)
    
    def get_horarios(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        user_id: Optional[int] = None,
        dia_semana: Optional[DiaSemana] = None,
        activo: Optional[bool] = None
    ) -> tuple[List[Horario], int]:
        """
        Obtiene una lista paginada de horarios con filtros opcionales.
        
        Args:
            skip: Número de registros a saltar
            limit: Número máximo de registros a retornar
            user_id: Filtrar por ID de usuario
            dia_semana: Filtrar por día de la semana
            activo: Filtrar por estado activo
            
        Returns:
            Tupla con (lista de horarios, total de registros)
        """
        query = db.query(Horario)
        
        # Aplicar filtros
        if user_id is not None:
            query = query.filter(Horario.user_id == user_id)
        if dia_semana is not None:
            query = query.filter(Horario.dia_semana == dia_semana)
        if activo is not None:
            query = query.filter(Horario.activo == activo)
        
        # Contar total
        total = query.count()
        
        # Ordenar y paginar
        horarios = query.order_by(Horario.user_id, Horario.dia_semana).offset(skip).limit(limit).all()
        
        return horarios, total
    
    def get_horarios_by_user(self, db: Session, user_id: int) -> List[Horario]:
        """
        Obtiene todos los horarios de un usuario.
        
        Args:
            user_id: ID del usuario
            
        Returns:
            Lista de horarios del usuario
            
        Raises:
            HTTPException: Si el usuario no existe
        """
        # Validar que el usuario existe
        user = user_service.get_user(db, user_id)
        
        return db.query(Horario).filter(
            Horario.user_id == user_id,
            Horario.activo == True
        ).order_by(Horario.dia_semana).all()
    
    def get_by_user_and_dia(self, db: Session, user_id: int, dia: DiaSemana) -> Optional[Horario]:
        """
        Obtiene el PRIMER horario para un usuario y día específico.
        Para compatibilidad con código existente.
        """
        return db.query(Horario).filter(
            Horario.user_id == user_id,
            Horario.dia_semana == dia,
            Horario.activo == True
        ).first()
    
    def get_by_user_and_dia_all(self, db: Session, user_id: int, dia: DiaSemana) -> List[Horario]:
        """
        Obtiene TODOS los horarios para un usuario y día específico (múltiples turnos).
        """
        return db.query(Horario).filter(
            Horario.user_id == user_id,
            Horario.dia_semana == dia,
            Horario.activo == True
        ).all()
    
    def detectar_turno_activo(
        self,
        db: Session,
        user_id: int, 
        dia: DiaSemana, 
        hora_actual: time
    ) -> Optional[Horario]:
        """
        Detecta qué turno está activo en este momento para un usuario.
        Considera ventana de tolerancia (1 hora antes/después).
        
        Args:
            db: Sesión de base de datos
            user_id: ID del usuario
            dia: Día de la semana
            hora_actual: Hora actual a verificar
        
        Returns:
            Horario activo o None si no hay turno activo
        """
        horarios = self.get_by_user_and_dia_all(db, user_id, dia)
        
        if not horarios:
            return None
        
        hora_actual_dt = datetime.combine(datetime.today(), hora_actual)
        
        for horario in horarios:
            hora_entrada_dt = datetime.combine(datetime.today(), horario.hora_entrada)
            hora_salida_dt = datetime.combine(datetime.today(), horario.hora_salida)
            
            # Manejar turnos nocturnos
            if horario.hora_salida < horario.hora_entrada:
                if hora_actual < horario.hora_salida:
                    hora_entrada_dt = hora_entrada_dt - timedelta(days=1)
                else:
                    hora_salida_dt = hora_salida_dt + timedelta(days=1)
            
            # Calcular ventana de tiempo permitida
            tolerancia_antes = timedelta(hours=1)
            tolerancia_despues = timedelta(hours=1)
            
            ventana_inicio = hora_entrada_dt - tolerancia_antes
            ventana_fin = hora_salida_dt + tolerancia_despues
            
            # Verificar si la hora actual está en la ventana
            if ventana_inicio <= hora_actual_dt <= ventana_fin:
                return horario
        
        return None
    
    def update_horario(self, db: Session, horario_id: int, horario_data: HorarioUpdate) -> Horario:
        """
        Actualiza un horario existente.
        
        Args:
            horario_id: ID del horario a actualizar
            horario_data: Datos actualizados del horario
            
        Returns:
            Horario actualizado
            
        Raises:
            HTTPException: Si el horario no existe
        """
        horario = self.get_horario(db, horario_id)
        
        # Actualizar solo los campos proporcionados
        update_data = horario_data.model_dump(exclude_unset=True)
        
        for key, value in update_data.items():
            setattr(horario, key, value)
        
        return self.update_with_transaction(db, horario)
    
    def delete_horario(self, db: Session, horario_id: int) -> bool:
        """
        Elimina un horario.
        
        Args:
            horario_id: ID del horario a eliminar
            
        Returns:
            True si se eliminó correctamente
            
        Raises:
            HTTPException: Si el horario no existe
        """
        return self.delete_with_transaction(db, horario_id)
    
    def delete_horarios_by_user(self, db: Session, user_id: int) -> bool:
        """
        Elimina todos los horarios de un usuario.
        
        Args:
            user_id: ID del usuario
            
        Returns:
            True si se eliminaron correctamente
            
        Raises:
            HTTPException: Si el usuario no existe
        """
        # Validar que el usuario existe
        user_service.get_user(db, user_id)
        
        horarios = db.query(Horario).filter(Horario.user_id == user_id).all()
        
        try:
            for horario in horarios:
                db.delete(horario)
            db.commit()
            return True
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al eliminar los horarios: {str(e)}"
            )
    
    def create_bulk_horarios(self, db: Session, user_id: int, horarios_data: List[HorarioCreate]) -> List[Horario]:
        """
        Crea múltiples horarios para un usuario de una vez.
        
        Args:
            user_id: ID del usuario
            horarios_data: Lista de horarios a crear
            
        Returns:
            Lista de horarios creados
            
        Raises:
            HTTPException: Si el usuario no existe o hay conflictos
        """
        # Validar que el usuario existe
        user_service.get_user(db, user_id)
        
        # Validar que no hay duplicados (mismo día y turno) en la lista
        combinaciones = [(h.dia_semana, h.turno_id) for h in horarios_data]
        if len(combinaciones) != len(set(combinaciones)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se pueden crear múltiples horarios con el mismo día y turno"
            )
        
        # Obtener todos los horarios existentes del usuario
        horarios_existentes = db.query(Horario).filter(Horario.user_id == user_id).all()
        
        # Validar cada horario nuevo
        for horario_data in horarios_data:
            # Validar turno existe
            turno = turno_service.obtener_turno(db, horario_data.turno_id)
            
            # Verificar que no existe el mismo día/turno
            for horario_exist in horarios_existentes:
                if (horario_exist.dia_semana == horario_data.dia_semana and 
                    horario_exist.turno_id == horario_data.turno_id):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Ya existe un horario para {horario_data.dia_semana.value} con el turno {turno.nombre}"
                    )
            
            # Validar solapamiento con horarios existentes del mismo día
            horarios_mismo_dia = [h for h in horarios_existentes if h.dia_semana == horario_data.dia_semana]
            self._validar_solapamiento(db, horarios_mismo_dia, horario_data)
            
            # Validar solapamiento con otros horarios nuevos del mismo día
            otros_nuevos_mismo_dia = [
                h for h in horarios_data 
                if h.dia_semana == horario_data.dia_semana and h != horario_data
            ]
            if otros_nuevos_mismo_dia:
                # Convertir a objetos Horario temporales para validación
                horarios_temp = []
                for h in otros_nuevos_mismo_dia:
                    horario_temp = Horario(
                        user_id=user_id,
                        dia_semana=h.dia_semana,
                        turno_id=h.turno_id,
                        hora_entrada=h.hora_entrada,
                        hora_salida=h.hora_salida
                    )
                    horarios_temp.append(horario_temp)
                self._validar_solapamiento(db, horarios_temp, horario_data)
        
        # Crear todos los horarios
        horarios_creados = []
        try:
            for horario_data in horarios_data:
                horario = Horario(
                    user_id=user_id,
                    turno_id=horario_data.turno_id,
                    dia_semana=horario_data.dia_semana,
                    hora_entrada=horario_data.hora_entrada,
                    hora_salida=horario_data.hora_salida,
                    horas_requeridas=horario_data.horas_requeridas,
                    tolerancia_entrada=horario_data.tolerancia_entrada,
                    tolerancia_salida=horario_data.tolerancia_salida,
                    activo=horario_data.activo,
                    descripcion=horario_data.descripcion
                )
                db.add(horario)
                horarios_creados.append(horario)
            
            db.commit()
            
            for horario in horarios_creados:
                db.refresh(horario)
            
            return horarios_creados
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al crear los horarios: {str(e)}"
            )


# Singleton del servicio
horario_service = HorarioService()
