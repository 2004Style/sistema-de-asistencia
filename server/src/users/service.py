"""
Servicio de gestión de usuarios.

Contiene toda la lógica de negocio para:
- Creación de usuarios con registro facial
- Validación de datos únicos
- Gestión de imágenes de reconocimiento
- Paginación y búsqueda
- Integración con sistema de reconocimiento facial

Hereda de BaseService para CRUD genérico:
- get_by_id() - Obtener usuario por ID
- field_exists() - Verificar unicidad
- get_by_field() - Buscar por campo
- paginate_with_search() - Paginación avanzada
- save_with_transaction() - Guardar seguro
"""

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, asc, desc
from fastapi import HTTPException, status, UploadFile
from typing import Optional, List
import os

from .model import User
from .schemas import UserCreate, UserUpdate, UserResponse
from src.roles.service import role_service
from src.utils.security import hash_password
from src.utils.file_handler import save_user_images, delete_user_folder
from src.recognize.registro import quick_register, quick_remove
from src.utils.base_service import BaseService


class UserService(BaseService):
    """
    Servicio para gestionar usuarios.
    
    Hereda de BaseService para obtener:
    - get_by_id() - Obtener por ID
    - field_exists() - Validar unicidad
    - get_by_field() - Búsqueda por campo
    - paginate_with_search() - Paginación genérica
    - save_with_transaction() - Guardar seguro
    
    Métodos adicionales específicos de usuario:
    - create_user() - Crear con validaciones y registro facial
    - actualizar_huella() - Actualizar huella digital
    """
    
    model_class = User
    
    def __init__(self):
        """Inicializa el servicio."""
        super().__init__()
    
    # ========== BÚSQUEDAS ESPECÍFICAS ==========
    
    def get_by_email(self, db: Session, email: str) -> Optional[User]:
        """Busca usuario por email (usa get_by_field del BaseService)."""
        return self.get_by_field(db, "email", email)
    
    def get_by_codigo(self, db: Session, codigo: str) -> Optional[User]:
        """Busca usuario por código (usa get_by_field del BaseService)."""
        return self.get_by_field(db, "codigo_user", codigo)
    
    # ========== VALIDACIONES DE UNICIDAD ==========
    
    def email_exists(self, db: Session, email: str, exclude_id: Optional[int] = None) -> bool:
        """Verifica si un email ya está registrado (usa field_exists del BaseService)."""
        return self.field_exists(db, "email", email, exclude_id)
    
    def codigo_exists(self, db: Session, codigo: str, exclude_id: Optional[int] = None) -> bool:
        """Verifica si un código ya está registrado (usa field_exists del BaseService)."""
        return self.field_exists(db, "codigo_user", codigo, exclude_id)
    
    # ========== CRUD ESPECÍFICO DE USUARIO ==========
    
    def create_user(
        self,
        db: Session,
        user_data: UserCreate,
        images: List[UploadFile]
    ) -> User:
        """
        Crea un nuevo usuario con registro facial.
        
        Validaciones:
        - Exactamente 10 imágenes
        - Email único
        - Código único
        - Rol existente
        
        Args:
            user_data: Datos del usuario
            images: Lista de 10 imágenes
            
        Returns:
            Usuario creado
            
        Raises:
            HTTPException: Si faltan imágenes, email/código duplicado, rol no existe,
                          o falla el registro facial
        """
        # Validar que se proporcionen exactamente 10 imágenes
        if len(images) != 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Se requieren exactamente 10 imágenes para el registro facial"
            )
        
        # Validar unicidad usando BaseService
        self.assert_field_unique(db, "email", user_data.email, "El email ya está registrado")
        self.assert_field_unique(db, "codigo_user", user_data.codigo_user, "El código de usuario ya está registrado")
        
        # Validar que el rol existe
        role = role_service.obtener_rol(db, user_data.role_id)
        if not role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="El rol especificado no existe"
            )
        
        # Guardar imágenes en el sistema de archivos
        try:
            images_saved = save_user_images(user_data.name, images)
            if not images_saved:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Error al guardar las imágenes del usuario"
                )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al procesar las imágenes: {str(e)}"
            )
        
        # Encriptar contraseña
        hashed_password = hash_password(user_data.password)
        
        # Crear usuario
        user = User(
            name=user_data.name,
            email=user_data.email,
            codigo_user=user_data.codigo_user,
            password=hashed_password,
            role_id=user_data.role_id,
            is_active=True,
            huella=user_data.huella  # Asignar huella si se proporciona (opcional)
        )
        
        try:
            # Guardar en BD usando transacción segura
            user = self.save_with_transaction(db, user, "Error al crear el usuario")
            
            # Registrar en el sistema de reconocimiento facial
            try:
                quick_register(user.name)
            except Exception as e:
                # Si falla el registro facial, eliminar usuario
                db.delete(user)
                db.commit()
                delete_user_folder(user.name)
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Error al registrar en el sistema de reconocimiento: {str(e)}"
                )
            
            return user
            
        except HTTPException:
            raise
        except Exception as e:
            # Limpiar imágenes guardadas en caso de error
            delete_user_folder(user_data.name)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al crear el usuario: {str(e)}"
            )
    
    def get_user(self, db: Session, user_id: int) -> User:
        """
        Obtiene un usuario por ID con su rol cargado (usa get_by_id del BaseService).
        
        Raises:
            HTTPException: Si el usuario no existe
        """
        user = db.query(User).options(
            joinedload(User.role)
        ).filter(User.id == user_id).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado"
            )
        
        return user
    
    def get_users_paginated(
        self,
        db: Session,
        page: int = 1,
        page_size: int = 10,
        search: Optional[str] = None,
        sort_by: Optional[str] = None,
        sort_order: str = "asc"
    ) -> dict:
        """
        Obtiene usuarios con paginación, búsqueda y ordenamiento.
        
        Usa paginate_with_search() del BaseService para paginación genérica.
        
        Args:
            page: Número de página (inicia en 1)
            page_size: Cantidad de registros por página
            search: Término de búsqueda (busca en nombre, email, código)
            sort_by: Campo para ordenar (name, email, codigo_user, created_at)
            sort_order: Orden de clasificación (asc o desc)
            
        Returns:
            Dict con records, totalRecords, totalPages, currentPage
        """
        # Usar el método genérico de paginación del BaseService
        result = self.paginate_with_search(
            db,
            page=page,
            page_size=page_size,
            search=search,
            search_fields=["name", "email", "codigo_user"],
            sort_by=sort_by,
            sort_order=sort_order
        )
        result["records"] = [UserResponse.model_validate(user) for user in result["records"]]
        return result
    
    def update_user(self, db: Session, user_id: int, user_data: UserUpdate) -> User:
        """
        Actualiza información de un usuario.
        
        Valida unicidad de email y código si se actualizan.
        Si se proporciona nueva contraseña, la encripta.
        Usa update_with_transaction del BaseService.
        
        Raises:
            HTTPException: Si el usuario no existe, email o código duplicados
        """
        # Obtener usuario existente
        user = self.get_user(db, user_id)
        
        # Validar unicidad de email si se está actualizando
        if user_data.email and user_data.email != user.email:
            self.assert_field_unique(db, "email", user_data.email, 
                                    "El email ya está registrado", exclude_id=user_id)
        
        # Validar unicidad de código si se está actualizando
        if user_data.codigo_user and user_data.codigo_user != user.codigo_user:
            self.assert_field_unique(db, "codigo_user", user_data.codigo_user,
                                    "El código de usuario ya está registrado", exclude_id=user_id)
        
        # Actualizar campos
        update_dict = user_data.model_dump(exclude_unset=True)
        
        # Encriptar contraseña si se proporciona
        if "password" in update_dict and update_dict["password"]:
            update_dict["password"] = hash_password(update_dict["password"])
        
        for key, value in update_dict.items():
            setattr(user, key, value)
        
        # Usar transacción segura del BaseService
        return self.update_with_transaction(db, user, "Error al actualizar el usuario")
    
    def delete_user(self, db: Session, user_id: int) -> dict:
        """
        Elimina un usuario y sus datos asociados.
        
        Elimina:
        - Usuario de la base de datos (usando delete_with_transaction del BaseService)
        - Carpeta de imágenes
        - Registro del sistema de reconocimiento
        
        Raises:
            HTTPException: Si el usuario no existe o falla la eliminación
        """
        # Obtener usuario
        user = self.get_user(db, user_id)
        user_name = user.name
        
        try:
            # Eliminar de base de datos usando transacción segura del BaseService
            self.delete_with_transaction(db, user, "Error al eliminar usuario")
            
            # Eliminar del sistema de reconocimiento
            quick_remove(user_name)
            
            # Eliminar carpeta de imágenes
            try:
                delete_user_folder(user_name)
            except Exception as e:
                # Usuario ya eliminado de BD, solo registrar advertencia
                print(f"Advertencia: No se pudo eliminar carpeta de usuario {user_name}: {str(e)}")
            
            return {"message": f"Usuario {user_name} y datos asociados eliminados exitosamente"}
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al eliminar el usuario: {str(e)}"
            )
    
    def actualizar_huella(self, db: Session, codigo_user: str, huella: str) -> dict:
        """
        Actualiza la huella digital de un usuario.
        
        Args:
            codigo_user: Código único del usuario
            huella: Datos de la huella digital en formato "<slot>|<datos_encriptados>"
            
        Returns:
            Dict con información del resultado
            
        Raises:
            HTTPException: Si el usuario no existe o hay error al actualizar
        """
        # Buscar usuario por código
        user = self.get_by_codigo(db, codigo_user)
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
        
        try:
            # Actualizar campo de huella (contiene: "<slot>|<datos_encriptados>")
            user.huella = huella
            db.commit()
            db.refresh(user)
            
            return {
                "success": True,
                "message": "Huella registrada exitosamente",
                "usuario": {
                    "id": user.id,
                    "nombre": user.name,
                    "codigo": user.codigo_user,
                    "email": user.email,
                    "tiene_huella": True
                }
            }
            
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al actualizar la huella: {str(e)}"
            )
    
    # ========== AUTENTICACIÓN ==========
    
    def authenticate_user(self, db: Session, email: str, password: str) -> Optional[User]:
        """
        Autentica un usuario verificando email y contraseña.
        
        Args:
            db: Sesión de base de datos
            email: Email del usuario
            password: Contraseña en texto plano
            
        Returns:
            Usuario si la autenticación es exitosa, None en caso contrario
        """
        from src.utils.security import verify_password
        
        user = self.get_by_email(db, email)
        if not user:
            return None
        
        # Verificar contraseña
        if not verify_password(password, user.password):
            return None
        
        return user

    def change_password(self, db: Session, user_id: int, current_password: str, new_password: str) -> bool:
        """
        Cambia la contraseña de un usuario.
        
        Args:
            db: Sesión de base de datos
            user_id: ID del usuario
            current_password: Contraseña actual (debe ser correcta)
            new_password: Nueva contraseña
            
        Returns:
            True si se cambió exitosamente
            
        Raises:
            HTTPException: Si la contraseña actual es incorrecta
        """
        from src.utils.security import verify_password
        
        user = self.get_by_id(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado"
            )
        
        # Verificar que la contraseña actual es correcta
        if not verify_password(current_password, user.password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Contraseña actual incorrecta"
            )
        
        # Actualizar contraseña
        user.password = hash_password(new_password)
        db.commit()
        db.refresh(user)
        
        return True


# Singleton del servicio
user_service = UserService()

