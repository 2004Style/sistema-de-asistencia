"""
Service de Turnos - Lógica de negocio para gestión de turnos

Hereda de BaseService para obtener:
- get_by_id() - Obtener por ID
- field_exists() - Validar unicidad
- get_by_field() - Búsqueda por campo
- paginate_with_search() - Paginación genérica
- save_with_transaction() - Guardar seguro
- delete_with_transaction() - Eliminar seguro
"""
from typing import Optional, List, Tuple, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from datetime import time

from .model import Turno
from .schemas import TurnoCreate, TurnoUpdate
from src.utils.base_service import BaseService


class TurnoService(BaseService):
    """
    Servicio de Turnos - Gestión de turnos de trabajo
    
    Hereda de BaseService para métodos CRUD genéricos.
    """
    
    model_class = Turno
    
    def __init__(self):
        """Inicializa el servicio."""
        super().__init__()
    def crear_turno(self, db: Session, turno_data: TurnoCreate) -> Turno:
        """
        Crea un nuevo turno con validaciones.
        
        Usa assert_field_unique del BaseService para validar nombre único.
        
        Args:
            db: Sesión de base de datos
            turno_data: Datos del turno a crear
            
        Returns:
            Turno creado
            
        Raises:
            HTTPException: Si el nombre existe o validación falla
        """
        # Validar nombre único usando BaseService
        self.assert_field_unique(
            db, "nombre", turno_data.nombre,
            f"Ya existe un turno con el nombre '{turno_data.nombre}'"
        )
        
        # Validar que hora_fin sea diferente de hora_inicio
        if turno_data.hora_inicio == turno_data.hora_fin:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La hora de inicio y fin no pueden ser iguales"
            )
        
        # Crear turno usando transacción segura del BaseService
        nuevo_turno = Turno(**turno_data.model_dump())
        return self.save_with_transaction(db, nuevo_turno, "Error al crear turno")
    
    def obtener_turno(self, db: Session, turno_id: int) -> Turno:
        """Obtiene un turno por su ID (usa get_by_id del BaseService)."""
        return self.get_by_id(db, turno_id, f"Turno con ID {turno_id} no encontrado")
    
    def listar_turnos(
        self,
        db: Session,
        page: int = 1,
        page_size: int = 10,
        search: Optional[str] = None,
        sort_by: Optional[str] = None,
        sort_order: str = "asc",
        activos_solo: bool = False
    ) -> Dict[str, Any]:
        """
        Lista turnos con paginación y filtros.
        
        Usa paginate_with_search del BaseService.
        
        Args:
            page: Número de página
            page_size: Tamaño de página
            search: Término de búsqueda
            sort_by: Campo para ordenar
            sort_order: Orden (asc/desc)
            activos_solo: Solo turnos activos
            
        Returns:
            Dict con records, totalRecords, totalPages, currentPage
        """
        filters = {"activo": True} if activos_solo else None
        result = self.paginate_with_search(
            db,
            page=page,
            page_size=page_size,
            search=search,
            search_fields=["nombre", "descripcion"],
            filters=filters,
            sort_by=sort_by or "nombre",
            sort_order=sort_order
        )
        
        # Convertir registros a formato de respuesta
        from .schemas import TurnoResponse
        result["records"] = [TurnoResponse.model_validate(turno) for turno in result["records"]]
        
        return result
    
    def listar_turnos_activos(
        self,
        db: Session,
        page: int = 1,
        page_size: int = 10,
        search: Optional[str] = None,
        sort_by: Optional[str] = None,
        sort_order: str = "asc"
    ) -> Dict[str, Any]:
        """
        Lista solo los turnos activos con paginación.
        
        Args:
            db: Sesión de base de datos
            page: Número de página
            page_size: Tamaño de página
            search: Término de búsqueda
            sort_by: Campo para ordenar
            sort_order: Orden (asc/desc)
            
        Returns:
            Dict con records, totalRecords, totalPages, currentPage
        """
        filters = {"activo": True}
        result = self.paginate_with_search(
            db,
            page=page,
            page_size=page_size,
            search=search,
            search_fields=["nombre", "descripcion"],
            filters=filters,
            sort_by=sort_by or "nombre",
            sort_order=sort_order
        )
        
        # Convertir registros a formato de respuesta
        from .schemas import TurnoResponse
        result["records"] = [TurnoResponse.model_validate(turno) for turno in result["records"]]
        
        return result
    
    def actualizar_turno(
        self,
        db: Session,
        turno_id: int,
        turno_data: TurnoUpdate
    ) -> Turno:
        """
        Actualiza un turno existente con validaciones.
        
        Usa assert_field_unique del BaseService y update_with_transaction.
        
        Args:
            db: Sesión de base de datos
            turno_id: ID del turno a actualizar
            turno_data: Datos a actualizar
            
        Returns:
            Turno actualizado
            
        Raises:
            HTTPException: Si validación falla
        """
        # Obtener turno existente
        turno = self.obtener_turno(db, turno_id)
        
        # Preparar datos de actualización
        update_data = turno_data.model_dump(exclude_unset=True)
        
        # Validar nombre único si se actualiza
        if 'nombre' in update_data:
            self.assert_field_unique(
                db, "nombre", update_data['nombre'],
                f"Ya existe un turno con el nombre '{update_data['nombre']}'",
                exclude_id=turno_id
            )
        
        # Validar horas si se actualizan
        hora_inicio = update_data.get('hora_inicio', turno.hora_inicio)
        hora_fin = update_data.get('hora_fin', turno.hora_fin)
        if ('hora_inicio' in update_data or 'hora_fin' in update_data) and hora_inicio == hora_fin:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La hora de inicio y fin no pueden ser iguales"
            )
        
        # Actualizar campos
        for field, value in update_data.items():
            setattr(turno, field, value)
        
        # Usar transacción segura del BaseService
        return self.update_with_transaction(db, turno, "Error al actualizar turno")
    def desactivar_turno(self, db: Session, turno_id: int) -> Turno:
        """
        Desactiva un turno (soft delete).
        
        Args:
            db: Sesión de base de datos
            turno_id: ID del turno a desactivar
            
        Returns:
            Turno desactivado
            
        Raises:
            HTTPException: Si turno no existe o tiene horarios activos
        """
        # Obtener turno
        turno = self.obtener_turno(db, turno_id)
        
        # Verificar si tiene horarios activos
        if turno.horarios:
            horarios_activos = [h for h in turno.horarios if h.activo]
            if horarios_activos:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"No se puede desactivar: tiene {len(horarios_activos)} horarios activos"
                )
        
        # Desactivar turno
        turno.activo = False
        return self.update_with_transaction(db, turno, "Error al desactivar turno")
    
    def eliminar_turno(self, db: Session, turno_id: int) -> bool:
        """
        Elimina físicamente un turno de la base de datos.
        
        Args:
            db: Sesión de base de datos
            turno_id: ID del turno a eliminar
            
        Returns:
            True si se eliminó correctamente
            
        Raises:
            HTTPException: Si turno no existe o tiene horarios asociados
        """
        # Obtener turno
        turno = self.obtener_turno(db, turno_id)
        
        # Verificar si tiene horarios asociados (activos o inactivos)
        if turno.horarios:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No se puede eliminar: tiene {len(turno.horarios)} horarios asociados"
            )
        
        # Eliminar turno físicamente
        self.delete_with_transaction(db, turno, "Error al eliminar turno")
        return True
    
    def activar_turno(self, db: Session, turno_id: int) -> Turno:
        """Activa un turno previamente desactivado."""
        turno = self.obtener_turno(db, turno_id)
        
        if turno.activo:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El turno ya está activo"
            )
        
        turno.activo = True
        return self.update_with_transaction(db, turno, "Error al activar turno")
    
    def obtener_turno_por_nombre(self, db: Session, nombre: str) -> Optional[Turno]:
        """Obtiene turno por nombre (usa get_by_field del BaseService)."""
        return self.get_by_field(db, "nombre", nombre)
    
    def validar_horario_turno(
        self,
        db: Session,
        hora_entrada: time,
        hora_salida: time,
        turno_id: int
    ) -> bool:
        """
        Valida que un horario esté dentro del rango del turno
        
        Args:
            db: Sesión de base de datos
            hora_entrada: Hora de entrada del horario
            hora_salida: Hora de salida del horario
            turno_id: ID del turno
            
        Returns:
            True si es válido, False en caso contrario
        """
        turno = self.obtener_turno(db, turno_id)
        
        # Convertir a minutos
        entrada_mins = hora_entrada.hour * 60 + hora_entrada.minute
        salida_mins = hora_salida.hour * 60 + hora_salida.minute
        turno_inicio_mins = turno.hora_inicio.hour * 60 + turno.hora_inicio.minute
        turno_fin_mins = turno.hora_fin.hour * 60 + turno.hora_fin.minute
        
        # Manejar turnos nocturnos
        if turno.es_turno_nocturno:
            if entrada_mins >= turno_inicio_mins or entrada_mins <= turno_fin_mins:
                if salida_mins >= turno_inicio_mins or salida_mins <= turno_fin_mins:
                    return True
            return False
        else:
            return (entrada_mins >= turno_inicio_mins and 
                    salida_mins <= turno_fin_mins)

# Instancia singleton del servicio
turno_service = TurnoService()
