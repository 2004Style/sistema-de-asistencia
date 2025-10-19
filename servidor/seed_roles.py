"""
Seed script para crear roles iniciales del sistema
Ejecutar una sola vez después de crear las tablas
"""
from sqlalchemy.orm import Session
from src.config.database import SessionLocal
from src.roles.model import Role
# Importar el modelo User para asegurarnos de que su mapper esté
# registrado en SQLAlchemy antes de inicializar relaciones en Role.
from src.users.model import User  # noqa: F401
# Importar otros modelos relacionados para que sus mappers queden registrados
# y SQLAlchemy pueda resolver relaciones cuando se configuren los mapeadores.
from src.horarios import model as horarios_model  # noqa: F401
from src.asistencias import model as asistencias_model  # noqa: F401
from src.justificaciones import model as justificaciones_model  # noqa: F401
from src.notificaciones import model as notificaciones_model  # noqa: F401


def seed_roles():
    """Crear roles iniciales del sistema"""
    db: Session = SessionLocal()
    
    try:
        # Verificar si ya existen roles
        existing_roles = db.query(Role).count()
        if existing_roles > 0:
            print(f"✓ Ya existen {existing_roles} roles en la base de datos.")
            print("  Si deseas recrearlos, elimina los roles existentes primero.")
            return
        
        # Roles del sistema
        roles = [
            {
                "nombre": "COLABORADOR",
                "descripcion": "Usuario estándar del sistema. Puede registrar asistencia y ver su propia información.",
                "es_admin": False,
                "puede_aprobar": False,
                "puede_ver_reportes": False,
                "puede_gestionar_usuarios": False,
                "activo": True
            },
            {
                "nombre": "SUPERVISOR",
                "descripcion": "Supervisor de área. Puede aprobar justificaciones y ver reportes de su equipo.",
                "es_admin": False,
                "puede_aprobar": True,
                "puede_ver_reportes": True,
                "puede_gestionar_usuarios": False,
                "activo": True
            },
            {
                "nombre": "ADMINISTRADOR",
                "descripcion": "Administrador del sistema. Acceso completo a todas las funcionalidades.",
                "es_admin": True,
                "puede_aprobar": True,
                "puede_ver_reportes": True,
                "puede_gestionar_usuarios": True,
                "activo": True
            }
        ]
        
        # Crear roles
        print("\n🔧 Creando roles del sistema...")
        for role_data in roles:
            role = Role(**role_data)
            db.add(role)
            print(f"  ✓ Rol creado: {role_data['nombre']}")
        
        db.commit()
        
        print("\n✅ Roles creados exitosamente!")
        print("\n📋 Resumen de roles:")
        for role in db.query(Role).all():
            print(f"\n  • {role.nombre}")
            print(f"    ID: {role.id}")
            print(f"    Descripción: {role.descripcion}")
            print(f"    Admin: {'Sí' if role.es_admin else 'No'}")
            print(f"    Puede aprobar: {'Sí' if role.puede_aprobar else 'No'}")
            print(f"    Puede ver reportes: {'Sí' if role.puede_ver_reportes else 'No'}")
            print(f"    Puede gestionar usuarios: {'Sí' if role.puede_gestionar_usuarios else 'No'}")
        
        print("\n💡 Nota: El rol por defecto para nuevos usuarios es 'COLABORADOR'")
        
    except Exception as e:
        print(f"\n❌ Error al crear roles: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("=" * 60)
    print("SEED DE ROLES DEL SISTEMA")
    print("=" * 60)
    seed_roles()
    print("\n" + "=" * 60)
