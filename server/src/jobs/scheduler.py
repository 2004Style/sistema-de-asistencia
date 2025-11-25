"""
Job scheduler configuration and management
Configura todos los jobs para cumplir con los requerimientos del sistema
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime
import pytz

from src.jobs.tasks import (
    verificar_ausencias_diarias,
    calcular_horas_diarias,
    verificar_alertas_acumuladas,
    generar_reporte_diario,
    generar_reporte_semanal,
    generar_reporte_mensual,
    limpiar_archivos_temporales,
    cerrar_asistencias_y_marcar_faltas
)
from src.config.settings import get_settings

settings = get_settings()

# Create scheduler instance with configured timezone
timezone = pytz.timezone(settings.TIMEZONE)
scheduler = AsyncIOScheduler(timezone=timezone)


def start_scheduler():
    """
    Initialize and start the job scheduler.
    Defines all scheduled tasks for attendance system.
    """
    
    # JOB 1: Verificar ausencias del día actual
    # Se ejecuta todos los días a las 23:00
    # Requerimiento #5, #21
    scheduler.add_job(
        verificar_ausencias_diarias,
        trigger=CronTrigger(hour=23, minute=0, timezone=timezone),
        id="verificar_ausencias",
        name="Verificar Ausencias Diarias",
        replace_existing=True
    )

    # JOB 2: Calcular horas trabajadas del día actual
    # Se ejecuta todos los días a las 23:40
    # Requerimiento #6, #7, #8
    scheduler.add_job(
        calcular_horas_diarias,
        trigger=CronTrigger(hour=23, minute=40, timezone=timezone),
        id="calcular_horas",
        name="Calcular Horas Trabajadas",
        replace_existing=True
    )

    # JOB 3: Verificar alertas acumuladas (tardanzas y faltas)
    # Se ejecuta todos los días a las 23:10
    # Requerimiento #22
    scheduler.add_job(
        verificar_alertas_acumuladas,
        trigger=CronTrigger(hour=23, minute=10, timezone=timezone),
        id="alertas_acumuladas",
        name="Verificar Alertas Acumuladas",
        replace_existing=True
    )

    # JOB 4: Limpiar archivos temporales
    # Se ejecuta todos los días a las 03:00 (sin cambios)
    scheduler.add_job(
        limpiar_archivos_temporales,
        trigger=CronTrigger(hour=3, minute=0, timezone=timezone),
        id="limpiar_archivos",
        name="Limpiar Archivos Temporales",
        replace_existing=True
    )

    # JOB X: Generar reporte diario
    # Se ejecuta todos los días a las 23:45
    # Requerimiento #11
    scheduler.add_job(
        generar_reporte_diario,
        trigger=CronTrigger(hour=23, minute=45, timezone=timezone),
        id="reporte_diario",
        name="Generar Reporte Diario",
        replace_existing=True
    )
    
    # JOB 5: Generar reporte semanal
    # Se ejecuta cada lunes a las 08:00
    # Requerimiento #11, #14
    scheduler.add_job(
        generar_reporte_semanal,
        trigger=CronTrigger(day_of_week='mon', hour=8, minute=0, timezone=timezone),
        id="reporte_semanal",
        name="Generar Reporte Semanal",
        replace_existing=True
    )
    
    # JOB 6: Generar reporte mensual
    # Se ejecuta el primer día de cada mes a las 09:00
    # Requerimiento #11, #14
    scheduler.add_job(
        generar_reporte_mensual,
        trigger=CronTrigger(day=1, hour=9, minute=0, timezone=timezone),
        id="reporte_mensual",
        name="Generar Reporte Mensual",
        replace_existing=True
    )
    
    # JOB: Cerrar asistencias abiertas y marcar faltas
    # Se ejecuta todos los días a las 22:00
    scheduler.add_job(
        cerrar_asistencias_y_marcar_faltas,
        trigger=CronTrigger(hour=22, minute=0, timezone=timezone),
        id="cerrar_asistencias_y_marcar_faltas",
        name="Cerrar Asistencias Abiertas y Marcar Faltas",
        replace_existing=True
    )
    
    scheduler.start()
    print("=" * 70)
    print("✓ SCHEDULER STARTED SUCCESSFULLY")
    print("=" * 70)
    print(f"  Timezone: {settings.TIMEZONE}")
    print(f"  Jobs programados:")
    print(f"    → 23:00 - Verificar ausencias del día actual")
    print(f"    → 23:10 - Verificar alertas acumuladas (tardanzas/faltas)")
    print(f"    → 23:40 - Calcular horas trabajadas")
    print(f"    → 23:45 - Generar reporte diario")
    print(f"    → 03:00 - Limpiar archivos temporales")
    print(f"    → 08:00 Lunes - Generar reporte semanal")
    print(f"    → 09:00 Día 1 - Generar reporte mensual")
    print("=" * 70)


def shutdown_scheduler():
    """Shutdown the scheduler gracefully"""
    if scheduler.running:
        scheduler.shutdown()
        print("✓ Scheduler shutdown successfully")
