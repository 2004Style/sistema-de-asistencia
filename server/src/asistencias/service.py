"""
Servicio de gestión de asistencias.

Contiene toda la lógica de negocio para:
- Registro de entrada y salida
- Validación de horarios
- Cálculo de horas trabajadas
- Soporte para múltiples turnos
"""

from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from fastapi import HTTPException, status, UploadFile
from typing import Optional, List, Dict
from datetime import datetime, date, time, timedelta

from .model import Asistencia, TipoRegistro, EstadoAsistencia, MetodoRegistro
from src.horarios.model import DiaSemana, Horario
from src.horarios.service import horario_service
from src.users.service import user_service
from src.recognize.reconocimiento import get_recognizer
from src.utils.base_service import BaseService
import numpy as np
from src.utils.file_handler import save_user_images, delete_user_folder
import cv2


class AsistenciaService(BaseService):
    """
    Servicio para gestionar asistencias.
    
    Maneja:
    - Registro automático y manual
    - Validación de horarios y turnos
    - Cálculo de horas trabajadas
    - Soporte para múltiples turnos por día
    """
    
    model_class = Asistencia

    def __init__(self):
        super().__init__()
        # Referencias a otros servicios (singletons)
        self.horario_service = horario_service
        self.user_service = user_service

    def _get_dia_semana(self, fecha: datetime) -> DiaSemana:
        """Convierte weekday de datetime a enum DiaSemana."""
        dias = {
            0: DiaSemana.LUNES,
            1: DiaSemana.MARTES,
            2: DiaSemana.MIERCOLES,
            3: DiaSemana.JUEVES,
            4: DiaSemana.VIERNES,
            5: DiaSemana.SABADO,
            6: DiaSemana.DOMINGO
        }
        return dias[fecha.weekday()]
    
    def _validar_y_obtener_usuario(self, db: Session, codigo_user: str) -> object:
        """
        Valida y obtiene el usuario por código.
        
        Raises:
            HTTPException: Si el usuario no existe o está inactivo
        """
        user = self.user_service.get_by_codigo(db, codigo_user)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Usuario con código {codigo_user} no encontrado"
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Usuario inactivo"
            )
        
        return user
    
    def _obtener_horario_activo(self, db: Session, user_id: int) -> Horario:
        """
        Obtiene el turno activo para el usuario en el momento actual.
        
        Raises:
            HTTPException: Si no hay turno activo
        """
        ahora = datetime.now()
        dia_actual = self._get_dia_semana(ahora)
        
        horario = self.horario_service.detectar_turno_activo(
            db, user_id, dia_actual, ahora.time()
        )
        
        if not horario:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No hay turno activo para {dia_actual.value} a esta hora"
            )
        
        return horario
    
    def _determinar_tipo_registro(
        self, 
        db: Session, 
        user_id: int, 
        fecha: date, 
        horario_id: int
    ) -> str:
        """
        Determina si el siguiente registro debe ser entrada o salida.
        
        Returns:
            "entrada" si no hay registro o es una salida completa
            "salida" si hay entrada sin salida
        """
        registro_existente = self.get_by_user_date_turno(db, user_id, fecha, horario_id)
        
        if registro_existente and registro_existente.hora_entrada and not registro_existente.hora_salida:
            return "salida"
        
        return "entrada"
    
    def _calcular_estado(
        self, 
        hora_registro: time, 
        hora_programada: time, 
        tolerancia: int,
        tipo: str
    ) -> EstadoAsistencia:
        """Calcula el estado de asistencia basado en el horario."""
        # Convertir a minutos
        minutos_registro = hora_registro.hour * 60 + hora_registro.minute
        minutos_programada = hora_programada.hour * 60 + hora_programada.minute
        diferencia = minutos_registro - minutos_programada
        
        if tipo == "entrada":
            if diferencia <= tolerancia:
                return EstadoAsistencia.PRESENTE
            else:
                return EstadoAsistencia.TARDE
        else:  # salida
            # Para salida, validar que no salga muy temprano
            if abs(diferencia) <= tolerancia:
                return EstadoAsistencia.PRESENTE
            elif diferencia < 0:  # Salió antes
                return EstadoAsistencia.TARDE
            else:  # Salió después (horas extras)
                return EstadoAsistencia.PRESENTE
    
    def get_by_user_and_date(self, db: Session, user_id: int, fecha: date) -> List[Asistencia]:
        """Obtiene TODAS las asistencias de un usuario en una fecha específica."""
        return db.query(Asistencia).filter(
            and_(
                Asistencia.user_id == user_id,
                Asistencia.fecha == fecha
            )
        ).order_by(Asistencia.created_at).all()
    
    def get_by_user_date_turno(
        self,
        db: Session,
        user_id: int,
        fecha: date,
        horario_id: int
    ) -> Optional[Asistencia]:
        """Obtiene asistencia para un usuario, fecha y turno específico."""
        return db.query(Asistencia).filter(
            and_(
                Asistencia.user_id == user_id,
                Asistencia.fecha == fecha,
                Asistencia.horario_id == horario_id
            )
        ).first()
    
    def tiene_entrada_sin_salida(
        self,
        db: Session,
        user_id: int,
        fecha: date,
        horario_id: Optional[int]
    ) -> bool:
        """Verifica si hay entrada sin salida para un turno específico."""
        asistencia = self.get_by_user_date_turno(db, user_id, fecha, horario_id)
        
        if not asistencia:
            return False
        
        return asistencia.hora_entrada is not None and asistencia.hora_salida is None
    
    def registrar_asistencia(
        self,
        db: Session,
        codigo_user: str,
        tipo_registro: str,
        metodo: MetodoRegistro = MetodoRegistro.HUELLA
    ) -> Dict:
        """
        Registra asistencia (entrada o salida).
        Valida horarios y calcula estado.
        """
        # Validar y obtener usuario
        user = self._validar_y_obtener_usuario(db, codigo_user)
        
        # Obtener turno activo
        horario = self._obtener_horario_activo(db, user.id)

        # Delegar en la lógica común
        ahora = datetime.now()
        return self._registrar_common(
            db=db,
            user=user,
            horario=horario,
            ahora=ahora,
            tipo_registro=tipo_registro,
            metodo=metodo,
            observaciones=None
        )

    def _registrar_common(
        self,
        db: Session,
        user,
        horario: Optional[Horario],
        ahora: datetime,
        tipo_registro: str,
        metodo: MetodoRegistro,
        observaciones: Optional[str] = None
    ) -> Dict:
        """
        Lógica común para registrar entrada/salida.

        - `horario` puede ser None (por ejemplo, en registros faciales que permiten crear sin turno)
        - `metodo` indica el MétodoRegistro correspondiente
        - `observaciones` solo aplica para registros manuales
        """
        fecha_actual = ahora.date()
        hora_actual = ahora.time()

        horario_id = horario.id if horario else None
        registro_existente = self.get_by_user_date_turno(db, user.id, fecha_actual, horario_id)

        # Entrada
        if tipo_registro == "entrada":
            # Verificar que no haya entrada sin salida
            if self.tiene_entrada_sin_salida(db, user.id, fecha_actual, horario_id):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Ya existe un registro de entrada sin salida para este turno"
                )

            # Calcular estado
            hora_programada = horario.hora_entrada if horario else hora_actual
            tolerancia = horario.tolerancia_entrada if horario else 0
            estado = self._calcular_estado(hora_actual, hora_programada, tolerancia, "entrada")

            # Calcular tardanza
            minutos_entrada = hora_actual.hour * 60 + hora_actual.minute
            minutos_programada = hora_programada.hour * 60 + hora_programada.minute
            minutos_tardanza = max(0, minutos_entrada - minutos_programada)

            if registro_existente:
                registro_existente.hora_entrada = hora_actual
                registro_existente.metodo_entrada = metodo
                registro_existente.estado = estado
                registro_existente.tardanza = minutos_tardanza > tolerancia
                registro_existente.minutos_tardanza = minutos_tardanza if registro_existente.tardanza else None
                asistencia = registro_existente
            else:
                asistencia = Asistencia(
                    user_id=user.id,
                    horario_id=horario_id,
                    fecha=fecha_actual,
                    hora_entrada=hora_actual,
                    metodo_entrada=metodo,
                    estado=estado,
                    tardanza=minutos_tardanza > tolerancia,
                    minutos_tardanza=minutos_tardanza if minutos_tardanza > tolerancia else None,
                    observaciones=observaciones
                )
                db.add(asistencia)

        # Salida
        elif tipo_registro == "salida":
            if not self.tiene_entrada_sin_salida(db, user.id, fecha_actual, horario_id):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No hay registro de entrada para registrar salida"
                )

            asistencia = registro_existente
            asistencia.hora_salida = hora_actual
            asistencia.metodo_salida = metodo
            if observaciones:
                asistencia.observaciones = (asistencia.observaciones or "") + ("\n" + observaciones)
            asistencia.calcular_horas_trabajadas()

        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tipo de registro inválido")

        try:
            db.commit()
            db.refresh(asistencia)

            return {
                "success": True,
                "message": f"Registro de {tipo_registro} exitoso",
                "asistencia": {
                    "id": asistencia.id,
                    "usuario": user.name,
                    "codigo": user.codigo_user,
                    "tipo": tipo_registro,
                    "fecha": asistencia.fecha.isoformat(),
                    "hora_entrada": asistencia.hora_entrada.isoformat() if asistencia.hora_entrada else None,
                    "hora_salida": asistencia.hora_salida.isoformat() if asistencia.hora_salida else None,
                    "estado": asistencia.estado.value if asistencia.estado else None,
                    "horas_trabajadas": asistencia.horas_trabajadas_formato if asistencia.horas_trabajadas else None
                }
            }
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al registrar asistencia: {str(e)}"
            )
    
    def validar_usuario_existe(self, db: Session, codigo_user: str) -> Dict:
        """Valida si un usuario existe por código."""
        user = self.user_service.get_by_codigo(db, codigo_user)
        
        if not user:
            return {
                "existe": False,
                "message": f"Usuario con código {codigo_user} no encontrado"
            }
        
        return {
            "existe": True,
            "message": "Usuario encontrado",
            "usuario": {
                "id": user.id,
                "nombre": user.name,
                "codigo": user.codigo_user,
                "email": user.email,
                "activo": user.is_active,
                "tiene_huella": bool(user.huella) if hasattr(user, 'huella') else False
            }
        }
    
    def get_asistencias_usuario(
        self,
        db: Session,
        user_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[Asistencia]:
        """Obtiene registros de asistencia de un usuario."""
        return db.query(Asistencia).filter(
            Asistencia.user_id == user_id
        ).order_by(Asistencia.fecha.desc(), Asistencia.created_at.desc()).offset(skip).limit(limit).all()
    
    def get_asistencias_fecha(self, db: Session, fecha: date) -> List[Asistencia]:
        """Obtiene todos los registros de asistencia de una fecha."""
        return db.query(Asistencia).filter(
            Asistencia.fecha == fecha
        ).order_by(Asistencia.created_at).all()
    
    def get_asistencias_rango(
        self,
        db: Session,
        fecha_inicio: date,
        fecha_fin: date
    ) -> List[Asistencia]:
        """Obtiene asistencias en un rango de fechas."""
        return db.query(Asistencia).filter(
            and_(
                Asistencia.fecha >= fecha_inicio,
                Asistencia.fecha <= fecha_fin
            )
        ).order_by(Asistencia.fecha.desc()).all()
    
    def get_reporte_mes(self, db: Session, user_id: int, year: int, month: int) -> Dict:
        """Obtiene reporte mensual de asistencia de un usuario."""
        result = db.query(func.sum(Asistencia.horas_trabajadas)).filter(
            and_(
                Asistencia.user_id == user_id,
                func.extract('year', Asistencia.fecha) == year,
                func.extract('month', Asistencia.fecha) == month
            )
        ).scalar()
        
        total_minutos = result if result else 0
        horas = total_minutos // 60
        minutos = total_minutos % 60
        
        return {
            "user_id": user_id,
            "year": year,
            "month": month,
            "total_minutos": total_minutos,
            "total_horas_formato": f"{horas}:{minutos:02d}"
        }
    
    def get_asistencia(self, db: Session, asistencia_id: int) -> Asistencia:
        """
        Obtiene una asistencia por ID.
        
        Raises:
            HTTPException: Si la asistencia no existe
        """
        return self.get_by_id(
            db, 
            asistencia_id, 
            f"Asistencia con ID {asistencia_id} no encontrada"
        )

    def registrar_asistencia_manual(
        self,
        db: Session,
        user_id: int,
        tipo_registro: Optional[str] = None,
        observaciones: Optional[str] = None
    ) -> Dict:
        """
        Registra asistencia manualmente (por administrador).

        - usa la hora/fecha del servidor
        - marca metodo_* = MetodoRegistro.MANUAL
        - marca es_manual = True
        - detecta turno activo y evita duplicados
        """
        # Verificar usuario
        user = self.user_service.get_user(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Usuario con ID {user_id} no encontrado"
            )

        # Obtener turno activo
        ahora = datetime.now()
        dia_actual = self._get_dia_semana(ahora)
        horario = self.horario_service.detectar_turno_activo(db, user_id, dia_actual, ahora.time())
        
        if not horario:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"El usuario {user.name} no tiene ningún turno activo en este momento para {dia_actual.value}"
            )

        # Si tipo_registro no viene, decidirlo automáticamente
        if tipo_registro is None:
            tipo_registro = self._determinar_tipo_registro(
                db, user_id, ahora.date(), horario.id
            )
            
            # Validar que no exista un registro completo
            registro_existente = self.get_by_user_date_turno(db, user_id, ahora.date(), horario.id)
            if registro_existente and registro_existente.hora_entrada and registro_existente.hora_salida:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Ya existe un registro completo para este turno"
                )
        
        # Delegar en la lógica común pasando MetodoRegistro.MANUAL y observaciones
        return self._registrar_common(
            db=db,
            user=user,
            horario=horario,
            ahora=ahora,
            tipo_registro=tipo_registro,
            metodo=MetodoRegistro.MANUAL,
            observaciones=observaciones
        )
    
    def update_asistencia(self, db: Session, asistencia_id: int, update_data: dict) -> Asistencia:
        """Actualiza una asistencia."""
        asistencia = self.get_asistencia(db, asistencia_id)
        
        for key, value in update_data.items():
            if hasattr(asistencia, key):
                setattr(asistencia, key, value)
        
        # Recalcular horas trabajadas si se actualizaron las horas
        if 'hora_entrada' in update_data or 'hora_salida' in update_data:
            asistencia.calcular_horas_trabajadas()
        
        try:
            db.commit()
            db.refresh(asistencia)
            return asistencia
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al actualizar asistencia: {str(e)}"
            )
    
    def delete_asistencia(self, db: Session, asistencia_id: int) -> bool:
        """Elimina una asistencia."""
        asistencia = self.get_asistencia(db, asistencia_id)
        
        try:
            db.delete(asistencia)
            db.commit()
            return True
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al eliminar asistencia: {str(e)}"
            )

    def registrar_asistencia_facial(
        self,
        db: Session,
        codigo_user: str,
        image: UploadFile,
    ) -> Dict:
        """
        Registra asistencia mediante reconocimiento facial.

        - Guarda temporalmente la imagen en disco
        - Ejecuta el reconocedor pasándole la ruta (no bytes)
        - Valida que la persona reconocida coincida con el usuario
        - Determina tipo_registro (entrada/salida)
        - Elimina la imagen temporal después del reconocimiento
        """
        from datetime import datetime
        
        # Validar y obtener usuario
        user = self._validar_y_obtener_usuario(db, codigo_user)

        try:
            image_paths = save_user_images(codigo_user, [image])
            image_save = image_paths[0]  # Obtener la primera (única) imagen guardada
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al procesar imagen: {str(e)}"
            )

        ahora = datetime.now()

        try:
            # Reconocer usando la ruta de la imagen (no bytes)
            recognizer = get_recognizer()
            result = recognizer.recognize(image_path=image_save, return_details=True)

            if not result.get('recognized'):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Rostro no reconocido en la imagen"
                )

            person_name = result.get('person')
            if person_name is None or person_name.strip().lower() != (user.name or "").strip().lower():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Persona reconocida ('{person_name}') no coincide con el usuario del código {codigo_user}"
                )

            # Obtener turno activo
            dia_actual = self._get_dia_semana(ahora)
            horario = self.horario_service.detectar_turno_activo(
                db, user.id, dia_actual, ahora.time()
            )
            
            # IMPORTANTE: Validar que exista turno activo
            if not horario:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"El usuario {user.name} no tiene ningún turno activo en este momento para {dia_actual.value}"
                )

            # Determinar tipo de registro
            tipo_registro = self._determinar_tipo_registro(
                db, user.id, ahora.date(), horario.id
            )

            # Delegar en la lógica común usando MetodoRegistro.FACIAL
            asistencia_result = self._registrar_common(
                db=db,
                user=user,
                horario=horario,
                ahora=ahora,
                tipo_registro=tipo_registro,
                metodo=MetodoRegistro.FACIAL,
                observaciones=None
            )
            
            return asistencia_result

        finally:
            try:
               delete_user_folder(codigo_user)
            except Exception as e:
                print(f"⚠️ Advertencia: No se pudo eliminar imagen temporal: {str(e)}")

    def registrar_asistencia_huella(
        self,
        db: Session,
        codigo_user: str
    ) -> Dict:
        """
        Registra asistencia mediante huella digital.
        
        Este método solo valida el usuario y turno, y registra la asistencia.
        La validación de la huella debe hacerse previamente en el sensor/websocket.
        
        Args:
            codigo_user: Código único del usuario
            
        Returns:
            Dict con información del registro de asistencia
            
        Raises:
            HTTPException: Si el usuario no existe, está inactivo o no tiene turno activo
        """
        # Validar y obtener usuario
        user = self._validar_y_obtener_usuario(db, codigo_user)
        
        # Obtener turno activo
        horario = self._obtener_horario_activo(db, user.id)

        # Determinar tipo de registro (entrada/salida)
        ahora = datetime.now()
        tipo_registro = self._determinar_tipo_registro(
            db, user.id, ahora.date(), horario.id
        )

        # Delegar en la lógica común
        return self._registrar_common(
            db=db,
            user=user,
            horario=horario,
            ahora=ahora,
            tipo_registro=tipo_registro,
            metodo=MetodoRegistro.HUELLA,
            observaciones=None
        )


# Singleton del servicio
asistencia_service = AsistenciaService()