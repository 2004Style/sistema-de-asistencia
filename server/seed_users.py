"""
Seed script para crear usuarios iniciales del sistema (uno por cada rol)
Ejecutar después de haber ejecutado seed_roles.py
"""
from sqlalchemy.orm import Session
from src.config.database import SessionLocal, init_db
from src.roles.model import Role
from src.users.model import User
from src.utils.security import hash_password


def seed_users():
    """Crear usuarios iniciales del sistema (uno por rol)"""
    # Inicializar base de datos primero
    init_db()
    
    db: Session = SessionLocal()
    
    try:
        # Verificar si ya existen usuarios
        existing_users = db.query(User).count()
        if existing_users > 0:
            print(f"✓ Ya existen {existing_users} usuarios en la base de datos")
            print("  Si deseas recrearlos, elimina los usuarios existentes primero.")
            return
        
        # Obtener roles disponibles
        roles = db.query(Role).all()
        if len(roles) == 0:
            print("❌ No hay roles disponibles. Ejecuta seed_roles.py primero.")
            return
        
        # Crear usuarios iniciales (uno por rol)
        usuarios_iniciales = []
        
        # Usuario ADMINISTRADOR
        admin_role = next((r for r in roles if r.nombre == "ADMINISTRADOR"), None)
        if admin_role:
            usuarios_iniciales.append({
                "name": "Administrador Sistema",
                "email": "rubencithochavez036@gmail.com",
                "codigo_user": "ADM001",
                "password": "Admini@123",
                "role_id": admin_role.id,
                "is_active": True,
                "rol_nombre": "ADMINISTRADOR"
            })
        
        # Usuario SUPERVISOR
        supervisor_role = next((r for r in roles if r.nombre == "SUPERVISOR"), None)
        if supervisor_role:
            usuarios_iniciales.append({
                "name": "Supervisor Equipo",
                "email": "supervisor@sistema-asistencia.com",
                "codigo_user": "SUP001",
                "password": "Supervisor@2024",
                "role_id": supervisor_role.id,
                "is_active": True,
                "rol_nombre": "SUPERVISOR"
            })
        
        # Usuario COLABORADOR
        colaborador_role = next((r for r in roles if r.nombre == "COLABORADOR"), None)
        if colaborador_role:
            usuarios_iniciales.append({
                "name": "Colaborador Empresa",
                "email": "colaborador@sistema-asistencia.com",
                "codigo_user": "COL001",
                "password": "Colaborador@2024",
                "role_id": colaborador_role.id,
                "is_active": True,
                "rol_nombre": "COLABORADOR"
            })
        
        if not usuarios_iniciales:
            print("❌ No se encontraron roles para crear usuarios.")
            return
        
        print("\n👥 Creando usuarios iniciales del sistema...")
        
        # Crear usuarios
        for usuario_data in usuarios_iniciales:
            # Encriptar contraseña
            hashed_password = hash_password(usuario_data["password"])
            
            # Crear usuario
            usuario = User(
                name=usuario_data["name"],
                email=usuario_data["email"],
                codigo_user=usuario_data["codigo_user"],
                password=hashed_password,
                role_id=usuario_data["role_id"],
                is_active=usuario_data["is_active"]
            )
            
            db.add(usuario)
            print(f"  ✓ Usuario creado: {usuario_data['name']} ({usuario_data['rol_nombre']})")
        
        db.commit()
        
        print("\n✅ Usuarios creados exitosamente!")
        print("\n📋 Resumen de usuarios iniciales:")
        
        for usuario in db.query(User).all():
            rol_nombre = usuario.role.nombre if usuario.role else "SIN ROL"
            print(f"\n  • {usuario.name}")
            print(f"    Email: {usuario.email}")
            print(f"    Código: {usuario.codigo_user}")
            print(f"    Rol: {rol_nombre}")
            print(f"    Activo: {'Sí' if usuario.is_active else 'No'}")
        
        print("\n🔐 Credenciales de acceso:")
        print("  ADMINISTRADOR:")
        print(f"    Email: rubencithochavez036@gmail.com")
        print(f"    Contraseña: Admini@123")
        print("    Código: ADM001")
        print("\n  SUPERVISOR:")
        print(f"    Email: supervisor@sistema-asistencia.com")
        print(f"    Contraseña: Supervisor@2024")
        print(f"    Código: SUP001")
        print("\n  COLABORADOR:")
        print(f"    Email: colaborador@sistema-asistencia.com")
        print(f"    Contraseña: Colaborador@2024")
        print(f"    Código: COL001")
        
        print("\n💡 Nota: Estos usuarios son para pruebas iniciales. Se recomienda cambiar las contraseñas en producción.")
        
    except Exception as e:
        print(f"\n❌ Error al crear usuarios: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("=" * 70)
    print("👥 SEED DE USUARIOS INICIALES DEL SISTEMA")
    print("=" * 70)
    
    # Initialize database first
    init_db()
    print("✓ Database initialized")
    
    # Seed users
    seed_users()
    
    print("\n" + "=" * 70)
    print("✅ Seed completed")
    print("=" * 70)
