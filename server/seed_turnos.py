"""
Script to seed basic turnos (work shifts) in the database
Run this after database initialization to populate basic shifts
"""
from datetime import time
from sqlalchemy.orm import Session
from src.config.database import SessionLocal, init_db
from src.turnos.model import Turno


def seed_turnos():
    """Create basic turnos if they don't exist"""
    db: Session = SessionLocal()
    
    try:
        # Check if turnos already exist
        existing_turnos = db.query(Turno).count()
        if existing_turnos > 0:
            print(f"ℹ️  Ya existen {existing_turnos} turnos en la base de datos")
            return
        
        # Define basic turnos
        turnos_basicos = [
            {
                "nombre": "Turno Mañana",
                "descripcion": "Turno de trabajo en horario de mañana",
                "hora_inicio": time(8, 0),  # 08:00
                "hora_fin": time(16, 0),    # 16:00
                "activo": True
            },
            {
                "nombre": "Turno Tarde",
                "descripcion": "Turno de trabajo en horario de tarde",
                "hora_inicio": time(14, 0),  # 14:00
                "hora_fin": time(22, 0),     # 22:00
                "activo": True
            },
            {
                "nombre": "Turno Noche",
                "descripcion": "Turno de trabajo en horario nocturno",
                "hora_inicio": time(22, 0),  # 22:00
                "hora_fin": time(6, 0),      # 06:00 (siguiente día)
                "activo": True
            },
            {
                "nombre": "Jornada Completa",
                "descripcion": "Jornada laboral completa de 8 horas",
                "hora_inicio": time(9, 0),   # 09:00
                "hora_fin": time(17, 0),     # 17:00
                "activo": True
            },
            {
                "nombre": "Media Jornada Mañana",
                "descripcion": "Media jornada en horario de mañana",
                "hora_inicio": time(8, 0),   # 08:00
                "hora_fin": time(12, 0),     # 12:00
                "activo": True
            },
            {
                "nombre": "Media Jornada Tarde",
                "descripcion": "Media jornada en horario de tarde",
                "hora_inicio": time(14, 0),  # 14:00
                "hora_fin": time(18, 0),     # 18:00
                "activo": True
            }
        ]
        
        print("🔄 Creando turnos básicos...")
        
        # Create turnos
        for turno_data in turnos_basicos:
            turno = Turno(**turno_data)
            db.add(turno)
            print(f"  ✓ {turno.nombre}: {turno.hora_inicio.strftime('%H:%M')} - {turno.hora_fin.strftime('%H:%M')}")
        
        db.commit()
        print(f"\n✅ Se han creado {len(turnos_basicos)} turnos exitosamente")
        
    except Exception as e:
        print(f"❌ Error al crear turnos: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("=" * 50)
    print("🌱 Seeding Turnos (Work Shifts)")
    print("=" * 50)
    
    # Initialize database first
    init_db()
    print("✓ Database initialized")
    
    # Seed turnos
    seed_turnos()
    
    print("=" * 50)
    print("✅ Seed completed")
    print("=" * 50)
