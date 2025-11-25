"""
Scheduled task definitions
Jobs para cumplir con los requerimientos del sistema
"""
from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from src.config.database import SessionLocal
from src.asistencias.model import Asistencia, EstadoAsistencia
from src.users.model import User
from src.horarios.model import Horario, DiaSemana
from src.roles.model import Role
from src.notificaciones.service import notificacion_service
from src.reportes.service import reportes_service
from src.config.settings import get_settings
from src.email.service import email_service
import logging

logger = logging.getLogger(__name__)
settings = get_settings()


def get_db():
    """Get database session"""
    db = SessionLocal()
    try:
        return db
    finally:
        pass


# ========================
# JOB 1: Verificar ausencias del día anterior
# Requerimiento #5, #21
# ========================
async def verificar_ausencias_diarias():
    """
    Job que se ejecuta cada día a las 00:30 para verificar ausencias del día anterior
    Envía notificaciones a colaboradores que no registraron asistencia
    """
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] ⏰ JOB: Verificando ausencias del día anterior")
    
    db = get_db()
    
    try:
        # Fecha del día actual
        fecha_hoy = date.today()
        dia_semana = fecha_hoy.strftime("%A").lower()
        
        # Mapeo de días en inglés a español
        dias_map = {
            "monday": DiaSemana.LUNES,
            "tuesday": DiaSemana.MARTES,
            "wednesday": DiaSemana.MIERCOLES,
            "thursday": DiaSemana.JUEVES,
            "friday": DiaSemana.VIERNES,
            "saturday": DiaSemana.SABADO,
            "sunday": DiaSemana.DOMINGO
        }
        
        dia_enum = dias_map.get(dia_semana)
        if not dia_enum:
            print(f"  ℹ️ No se pudo mapear el día {dia_semana}")
            return

        # Obtener usuarios que deberían haber trabajado ese día
        usuarios_con_horario = db.query(User).join(Horario).filter(
            Horario.dia_semana == dia_enum,
            Horario.activo == True,
            User.is_active == True
        ).all()

        ausencias_detectadas = 0

        for usuario in usuarios_con_horario:
            # Verificar si registró asistencia
            asistencia = db.query(Asistencia).filter(
                Asistencia.user_id == usuario.id,
                Asistencia.fecha == fecha_hoy
            ).first()

            # Si no hay registro o está marcado como ausente sin justificación
            if not asistencia or (asistencia.estado == EstadoAsistencia.AUSENTE and not asistencia.justificacion_id):
                # Enviar notificación
                await notificacion_service.notificar_ausencia(
                    db=db,
                    user_id=usuario.id,
                    user_email=usuario.email,
                    user_name=usuario.name,
                    fecha=fecha_hoy,
                    supervisor_email=None  # TODO: Obtener email del supervisor
                )
                ausencias_detectadas += 1

        db.commit()
        print(f"  ✅ Ausencias detectadas y notificadas: {ausencias_detectadas}")
        
    except Exception as e:
        logger.error(f"Error en job de verificación de ausencias: {str(e)}")
        db.rollback()
    finally:
        db.close()


# ========================
# JOB 2: Calcular horas trabajadas del día anterior
# Requerimiento #6, #7, #8
# ========================
async def calcular_horas_diarias():
    """
    Job que se ejecuta cada día a las 01:00 para calcular las horas trabajadas del día anterior
    Detecta excesos o incumplimientos de jornada laboral
    """
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] ⏰ JOB: Calculando horas trabajadas del día anterior")
    
    db = get_db()
    
    try:
        fecha_hoy = date.today()

        # Obtener todas las asistencias del día actual con entrada y salida
        asistencias = db.query(Asistencia).filter(
            Asistencia.fecha == fecha_hoy,
            Asistencia.hora_entrada.isnot(None),
            Asistencia.hora_salida.isnot(None)
        ).all()

        alertas_enviadas = 0

        for asistencia in asistencias:
            # Calcular horas trabajadas
            entrada = datetime.combine(fecha_hoy, asistencia.hora_entrada)
            salida = datetime.combine(fecha_hoy, asistencia.hora_salida)

            # Manejar caso de salida al día siguiente (después de medianoche)
            if salida < entrada:
                salida += timedelta(days=1)

            diferencia = salida - entrada
            horas_trabajadas = diferencia.total_seconds() / 3600

            # Obtener horario del usuario
            dia_semana_nombre = fecha_hoy.strftime("%A").lower()
            dias_map = {
                "monday": DiaSemana.LUNES,
                "tuesday": DiaSemana.MARTES,
                "wednesday": DiaSemana.MIERCOLES,
                "thursday": DiaSemana.JUEVES,
                "friday": DiaSemana.VIERNES,
                "saturday": DiaSemana.SABADO,
                "sunday": DiaSemana.DOMINGO
            }
            dia_enum = dias_map.get(dia_semana_nombre)

            horario = db.query(Horario).filter(
                Horario.user_id == asistencia.user_id,
                Horario.dia_semana == dia_enum,
                Horario.activo == True
            ).first()

            if horario:
                horas_requeridas = horario.horas_requeridas / 60  # Convertir minutos a horas
                diferencia_horas = abs(horas_trabajadas - horas_requeridas)

                # Si la diferencia es significativa (más de 30 minutos)
                if diferencia_horas > 0.5:
                    if horas_trabajadas > horas_requeridas:
                        # Exceso de jornada
                        await notificacion_service.notificar_exceso_jornada(
                            db=db,
                            user_id=asistencia.user_id,
                            fecha=fecha_hoy,
                            horas_trabajadas=horas_trabajadas,
                            horas_requeridas=horas_requeridas
                        )
                        alertas_enviadas += 1
                    else:
                        # Incumplimiento de jornada
                        await notificacion_service.notificar_incumplimiento_jornada(
                            db=db,
                            user_id=asistencia.user_id,
                            fecha=fecha_hoy,
                            horas_trabajadas=horas_trabajadas,
                            horas_requeridas=horas_requeridas
                        )
                        alertas_enviadas += 1

        db.commit()
        print(f"  ✅ Alertas de jornada enviadas: {alertas_enviadas}")
        
    except Exception as e:
        logger.error(f"Error en job de cálculo de horas: {str(e)}")
        db.rollback()
    finally:
        db.close()


# ========================
# JOB 3: Verificar acumulación de tardanzas y faltas
# Requerimiento #22
# ========================
async def verificar_alertas_acumuladas():
    """
    Job que se ejecuta cada día a las 02:00 para verificar acumulación de tardanzas y faltas
    Envía alertas cuando se alcanza el umbral configurado
    """
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] ⏰ JOB: Verificando alertas acumuladas")
    
    db = get_db()
    
    try:
        # Período de análisis: últimos 30 días hasta hoy
        fecha_fin = date.today()
        fecha_inicio = fecha_fin - timedelta(days=30)
        
        # Obtener todos los usuarios activos
        usuarios = db.query(User).filter(User.is_active == True).all()
        
        alertas_enviadas = 0
        
        for usuario in usuarios:
            # Contar tardanzas en el período
            tardanzas = db.query(func.count(Asistencia.id)).filter(
                Asistencia.user_id == usuario.id,
                Asistencia.fecha >= fecha_inicio,
                Asistencia.fecha <= fecha_fin,
                Asistencia.tardanza == True
            ).scalar()
            
            # Contar faltas (ausencias no justificadas)
            faltas = db.query(func.count(Asistencia.id)).filter(
                Asistencia.user_id == usuario.id,
                Asistencia.fecha >= fecha_inicio,
                Asistencia.fecha <= fecha_fin,
                Asistencia.estado == EstadoAsistencia.AUSENTE,
                Asistencia.justificacion_id.is_(None)
            ).scalar()
            
            # Verificar si alcanza umbrales
            if tardanzas >= settings.TARDANZAS_MAX_ALERTA:
                await notificacion_service.notificar_alerta_acumulada(
                    db=db,
                    user_id=usuario.id,
                    user_email=usuario.email,
                    user_name=usuario.name,
                    tipo_alerta="tardanzas",
                    cantidad=tardanzas,
                    supervisor_email=None  # TODO: Obtener email del supervisor
                )
                alertas_enviadas += 1
            
            if faltas >= settings.FALTAS_MAX_ALERTA:
                await notificacion_service.notificar_alerta_acumulada(
                    db=db,
                    user_id=usuario.id,
                    user_email=usuario.email,
                    user_name=usuario.name,
                    tipo_alerta="faltas",
                    cantidad=faltas,
                    supervisor_email=None  # TODO: Obtener email del supervisor
                )
                alertas_enviadas += 1
        
        db.commit()
        print(f"  ✅ Alertas acumuladas enviadas: {alertas_enviadas}")
        
    except Exception as e:
        logger.error(f"Error en job de alertas acumuladas: {str(e)}")
        db.rollback()
    finally:
        db.close()


# ========================
# JOB X: Generar reporte diario
# Requerimiento #11
# ========================
async def generar_reporte_diario():
    """
    Job que se ejecuta diariamente para generar el reporte del día anterior
    y enviarlo por correo a los administradores.
    """
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] ⏰ JOB: Generando reporte diario")
    db = get_db()

    try:
        fecha_hoy = date.today()

        # Generar reporte para el día actual
        resultado = await reportes_service.generar_reporte_diario(
            db=db,
            fecha=fecha_hoy,
            user_id=None,
            formato="both",
            enviar_email=True  # enviar desde el service automáticamente; lo haremos aquí
        )

        if resultado.get("success"):
            # Obtener administradores y sus emails
            admins = db.query(User).join(Role).filter(Role.es_admin == True).all()
            destinatarios = [admin.email for admin in admins if admin.email]

            if destinatarios:
                enviado = await reportes_service.enviar_reporte_por_correo(resultado, destinatarios)
                if enviado:
                    print(f"  ✅ Reporte diario enviado a {len(destinatarios)} administradores")
                else:
                    print("  ❌ Falló el envío del reporte diario por correo")
            else:
                print("  ℹ️ No se encontraron administradores con email para enviar el reporte")

            print(f"  ✅ Reporte diario generado: {resultado.get('total_registros', 0)} registros")
            print(f"     Archivos: {list(resultado.get('archivos', {}).keys())}")
        else:
            print(f"  ❌ Error generando reporte diario: {resultado.get('error')}")

    except Exception as e:
        logger.error(f"Error en job de reporte diario: {str(e)}")
    finally:
        db.close()

# ========================
# JOB 4: Generar reporte semanal
# Requerimiento #11, #14
# ========================
async def generar_reporte_semanal():
    """
    Job que se ejecuta cada lunes a las 08:00 para generar el reporte semanal de la semana anterior
    Envía el reporte por correo a los administradores
    """
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] ⏰ JOB: Generando reporte semanal")
    
    db = get_db()
    
    try:
        # Semana anterior (lunes a domingo)
        hoy = date.today()
        dias_desde_lunes = hoy.weekday()  # 0 = lunes
        lunes_actual = hoy - timedelta(days=dias_desde_lunes)
        lunes_anterior = lunes_actual - timedelta(days=7)
        
        # Generar reporte
        resultado = await reportes_service.generar_reporte_semanal(
            db=db,
            fecha_inicio=lunes_anterior,
            user_id=None,  # Todos los usuarios
            formato="both",  # PDF y Excel
            enviar_email=True  # enviar desde el service automáticamente; lo haremos aquí
        )
        
        if resultado["success"]:
            # TODO: Enviar por correo a administradores
            # destinatarios = ["admin@empresa.com"]
            # await reportes_service.enviar_reporte_por_correo(resultado, destinatarios)
            
            print(f"  ✅ Reporte semanal generado: {resultado['total_registros']} registros")
            print(f"     Archivos: {list(resultado['archivos'].keys())}")
        else:
            print(f"  ❌ Error generando reporte semanal: {resultado.get('error')}")
        
    except Exception as e:
        logger.error(f"Error en job de reporte semanal: {str(e)}")
    finally:
        db.close()


# ========================
# JOB 5: Generar reporte mensual
# Requerimiento #11, #14
# ========================
async def generar_reporte_mensual():
    """
    Job que se ejecuta el primer día de cada mes a las 09:00 para generar el reporte del mes anterior
    Envía el reporte por correo a los administradores
    """
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] ⏰ JOB: Generando reporte mensual")
    
    db = get_db()
    
    try:
        # Mes anterior
        hoy = date.today()
        if hoy.month == 1:
            mes_anterior = 12
            anio_anterior = hoy.year - 1
        else:
            mes_anterior = hoy.month - 1
            anio_anterior = hoy.year
        
        # Generar reporte
        resultado = await reportes_service.generar_reporte_mensual(
            db=db,
            anio=anio_anterior,
            mes=mes_anterior,
            user_id=None,  # Todos los usuarios
            formato="both",  # PDF y Excel
            enviar_email=True  # enviar desde el service automáticamente; lo haremos aquí
        )
        
        if resultado["success"]:
            # TODO: Enviar por correo a administradores
            # destinatarios = ["admin@empresa.com", "rrhh@empresa.com"]
            # await reportes_service.enviar_reporte_por_correo(resultado, destinatarios)
            
            print(f"  ✅ Reporte mensual generado: {resultado['total_registros']} registros")
            print(f"     Período: {resultado['periodo']}")
            print(f"     Archivos: {list(resultado['archivos'].keys())}")
        else:
            print(f"  ❌ Error generando reporte mensual: {resultado.get('error')}")
        
    except Exception as e:
        logger.error(f"Error en job de reporte mensual: {str(e)}")
    finally:
        db.close()


# ========================
# JOB 6: Limpieza de archivos temporales
# ========================
async def limpiar_archivos_temporales():
    """
    Job que se ejecuta cada día a las 03:00 para limpiar archivos temporales antiguos
    """
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] ⏰ JOB: Limpiando archivos temporales")
    
    try:
        from pathlib import Path
        import os
        
        temp_dir = Path(settings.TEMP_DIR)
        reports_dir = Path(settings.REPORTS_DIR)
        
        # Eliminar archivos temporales más antiguos de 7 días
        dias_antiguedad = 7
        fecha_limite = datetime.now() - timedelta(days=dias_antiguedad)
        
        archivos_eliminados = 0
        
        for directorio in [temp_dir, reports_dir]:
            if directorio.exists():
                for archivo in directorio.iterdir():
                    if archivo.is_file():
                        fecha_modificacion = datetime.fromtimestamp(archivo.stat().st_mtime)
                        if fecha_modificacion < fecha_limite:
                            archivo.unlink()
                            archivos_eliminados += 1
        
        print(f"  ✅ Archivos temporales eliminados: {archivos_eliminados}")
        
    except Exception as e:
        logger.error(f"Error en job de limpieza: {str(e)}")


# ========================
# JOB: Cerrar asistencias abiertas y marcar faltas
# ========================
async def cerrar_asistencias_y_marcar_faltas():
    """
    Job que se ejecuta diariamente a las 22:00 para:
    - Cerrar asistencias abiertas (entrada sin salida).
    - Marcar faltas para horarios sin registros.
    - Enviar notificaciones al administrador.
    """
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] ⏰ JOB: Cerrando asistencias abiertas y marcando faltas")

    db = get_db()

    try:
        fecha_hoy = date.today()
        dia_semana = fecha_hoy.strftime("%A").lower()

        # Mapeo de días en inglés a español
        dias_map = {
            "monday": DiaSemana.LUNES,
            "tuesday": DiaSemana.MARTES,
            "wednesday": DiaSemana.MIERCOLES,
            "thursday": DiaSemana.JUEVES,
            "friday": DiaSemana.VIERNES,
            "saturday": DiaSemana.SABADO,
            "sunday": DiaSemana.DOMINGO
        }

        dia_enum = dias_map.get(dia_semana)
        if not dia_enum:
            print(f"  ℹ️ No se pudo mapear el día {dia_semana}")
            return

        # Obtener usuarios con horarios activos para el día
        usuarios_con_horario = db.query(User).join(Horario).filter(
            Horario.dia_semana == dia_enum,
            Horario.activo == True,
            User.is_active == True
        ).all()

        asistencias_cerradas = 0
        faltas_marcadas = 0

        for usuario in usuarios_con_horario:
            horarios = db.query(Horario).filter(
                Horario.user_id == usuario.id,
                Horario.dia_semana == dia_enum,
                Horario.activo == True
            ).all()

            for horario in horarios:
                asistencia = db.query(Asistencia).filter(
                    Asistencia.user_id == usuario.id,
                    Asistencia.fecha == fecha_hoy,
                    Asistencia.horario_id == horario.id
                ).first()

                if asistencia:
                    # Cerrar asistencias abiertas (entrada sin salida)
                    if asistencia.hora_entrada and not asistencia.hora_salida:
                        asistencia.hora_salida = datetime.now().time()
                        asistencia.estado = EstadoAsistencia.PRESENTE
                        asistencias_cerradas += 1

                        # Notificar al administrador
                        await notificacion_service.notificar_cierre_asistencia(
                            db=db,
                            user_id=usuario.id,
                            user_email=usuario.email,
                            user_name=usuario.name,
                            fecha=fecha_hoy,
                            horario=horario
                        )
                else:
                    # Marcar falta si no hay asistencia
                    nueva_asistencia = Asistencia(
                        user_id=usuario.id,
                        horario_id=horario.id,
                        fecha=fecha_hoy,
                        estado=EstadoAsistencia.AUSENTE
                    )
                    db.add(nueva_asistencia)
                    faltas_marcadas += 1

        db.commit()
        print(f"  ✅ Asistencias cerradas: {asistencias_cerradas}")
        print(f"  ✅ Faltas marcadas: {faltas_marcadas}")

        # Obtener correos de administradores
        admins = db.query(User).join(Role).filter(Role.es_admin == True).all()
        destinatarios = [admin.email for admin in admins if admin.email]

        if destinatarios:
            try:
                # Enviar resumen por correo
                asunto = "Resumen de cierre de asistencias y faltas marcadas"
                mensaje = (
                    f"Se cerraron {asistencias_cerradas} asistencias abiertas y se marcaron {faltas_marcadas} faltas el día {fecha_hoy.strftime('%d/%m/%Y')}.")
                await email_service.send_email(
                    to_email=destinatarios,
                    subject=asunto,
                    body=mensaje
                )
                print(f"  ✅ Notificación enviada a administradores: {len(destinatarios)} correos")
            except Exception as e:
                logger.error(f"Error enviando notificación a administradores: {str(e)}")

    except Exception as e:
        logger.error(f"Error en job de cierre de asistencias y marcación de faltas: {str(e)}")
        db.rollback()
    finally:
        db.close()
