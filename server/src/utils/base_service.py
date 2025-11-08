"""
Base Service - Clase genérica para reutilizar patrones comunes CRUD

Proporciona métodos genéricos para:
- Validación por ID
- Validación de unicidad
- Búsqueda y paginación
- Transacciones seguras con error handling

Uso:
    class UserService(BaseService):
        model_class = User
        
        def get_user(self, db, user_id):
            return self.get_by_id(db, user_id, "Usuario no encontrado")
"""

from typing import Generic, TypeVar, Optional, List, Dict, Any, Type
from sqlalchemy.orm import Session
from sqlalchemy import or_, asc, desc
from fastapi import HTTPException, status

T = TypeVar('T')


class BaseService(Generic[T]):
    """
    Servicio base genérico con métodos CRUD reutilizables.
    
    Atributos:
        model_class: Clase del modelo SQLAlchemy (override en subclases)
    
    Métodos:
        - get_by_id: Obtener por ID con validación
        - field_exists: Verificar existencia de campo
        - assert_field_unique: Validar unicidad o lanzar excepción
        - get_by_field: Buscar por campo específico
        - paginate_with_search: Paginación + búsqueda + filtros
        - save_with_transaction: Guardar con try-except
        - update_with_transaction: Actualizar con try-except
        - delete_with_transaction: Eliminar con try-except
    """
    
    model_class: Optional[Type[T]] = None
    
    def __init__(self):
        """Inicializa el servicio base."""
        if self.model_class is None:
            raise NotImplementedError(
                f"{self.__class__.__name__} debe definir 'model_class'"
            )
    
    # ============================================================================
    # VALIDACIÓN POR ID - Reutilizable en todos los servicios
    # ============================================================================
    
    def get_by_id(
        self,
        db: Session,
        id: int,
        error_msg: Optional[str] = None
    ) -> T:
        """
        Obtiene un registro por ID con validación automática.
        
        Args:
            db: Sesión de base de datos
            id: ID del registro
            error_msg: Mensaje de error personalizado (opcional)
        
        Returns:
            Registro encontrado
        
        Raises:
            HTTPException: Si el registro no existe (404)
        
        Ejemplo:
            user = user_service.get_by_id(db, 1, "Usuario no encontrado")
        """
        item = db.query(self.model_class).filter(self.model_class.id == id).first()
        
        if not item:
            default_msg = f"{self.model_class.__name__} con ID {id} no encontrado"
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error_msg or default_msg
            )
        
        return item
    
    # ============================================================================
    # VALIDACIÓN DE UNICIDAD - Patrón común en 3+ servicios
    # ============================================================================
    
    def field_exists(
        self,
        db: Session,
        field_name: str,
        value: Any,
        exclude_id: Optional[int] = None
    ) -> bool:
        """
        Verifica si un campo tiene un valor único.
        
        Args:
            db: Sesión de base de datos
            field_name: Nombre del campo a validar (e.g., "email", "codigo")
            value: Valor a buscar
            exclude_id: ID a excluir de la búsqueda (útil para updates)
        
        Returns:
            True si el valor existe, False si no
        
        Ejemplo:
            if self.field_exists(db, "email", "user@example.com"):
                raise HTTPException(...)
        """
        try:
            query = db.query(self.model_class)
            field = getattr(self.model_class, field_name)
            query = query.filter(field == value)
            
            if exclude_id:
                query = query.filter(self.model_class.id != exclude_id)
            
            return query.first() is not None
        except AttributeError:
            raise ValueError(f"Campo '{field_name}' no existe en {self.model_class.__name__}")
    
    def assert_field_unique(
        self,
        db: Session,
        field_name: str,
        value: Any,
        error_msg: str,
        exclude_id: Optional[int] = None
    ) -> None:
        """
        Valida que un campo sea único. Lanza excepción si no lo es.
        
        Args:
            db: Sesión de base de datos
            field_name: Nombre del campo
            value: Valor a validar
            error_msg: Mensaje de error si no es único
            exclude_id: ID a excluir (para updates)
        
        Raises:
            HTTPException: Si el valor ya existe (400)
        
        Ejemplo:
            self.assert_field_unique(db, "email", user_data.email, 
                                    "Email ya registrado")
        """
        if self.field_exists(db, field_name, value, exclude_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )
    
    # ============================================================================
    # BÚSQUEDA POR CAMPO - Consolidar múltiples métodos get_by_*
    # ============================================================================
    
    def get_by_field(
        self,
        db: Session,
        field_name: str,
        value: Any
    ) -> Optional[T]:
        """
        Busca un registro por campo específico.
        
        Args:
            db: Sesión de base de datos
            field_name: Nombre del campo (e.g., "email", "codigo_user")
            value: Valor a buscar
        
        Returns:
            Registro encontrado o None
        
        Ejemplo:
            user = user_service.get_by_field(db, "email", "user@example.com")
            user = user_service.get_by_field(db, "codigo_user", "EMP001")
        """
        try:
            field = getattr(self.model_class, field_name)
            return db.query(self.model_class).filter(field == value).first()
        except AttributeError:
            raise ValueError(f"Campo '{field_name}' no existe en {self.model_class.__name__}")
    
    # ============================================================================
    # PAGINACIÓN + BÚSQUEDA - Patrón duplicado en 3+ servicios
    # ============================================================================
    
    def paginate_with_search(
        self,
        db: Session,
        page: int = 1,
        page_size: int = 10,
        search: Optional[str] = None,
        search_fields: Optional[List[str]] = None,
        filters: Optional[Dict[str, Any]] = None,
        sort_by: Optional[str] = None,
        sort_order: str = "asc"
    ) -> Dict[str, Any]:
        """
        Realiza paginación con búsqueda y filtros avanzados.
        
        Args:
            db: Sesión de base de datos
            page: Número de página (1-based)
            page_size: Cantidad de registros por página
            search: Término de búsqueda (busca en search_fields)
            search_fields: Lista de campos donde buscar
                          (e.g., ["name", "email", "codigo_user"])
            filters: Dict con filtros adicionales (e.g., {"activo": True})
            sort_by: Campo para ordenar
            sort_order: "asc" o "desc"
        
        Returns:
            Dict con estructura:
            {
                "records": [list de registros],
                "totalRecords": int,
                "totalPages": int,
                "currentPage": int
            }
        
        Ejemplo:
            result = user_service.paginate_with_search(
                db,
                page=1,
                page_size=10,
                search="john",
                search_fields=["name", "email"],
                filters={"activo": True},
                sort_by="name",
                sort_order="asc"
            )
        """
        query = db.query(self.model_class)
        
        # Aplicar búsqueda
        if search and search_fields:
            search_term = f"%{search}%"
            try:
                conditions = [
                    getattr(self.model_class, field).ilike(search_term)
                    for field in search_fields
                ]
                query = query.filter(or_(*conditions))
            except AttributeError as e:
                raise ValueError(f"Campo de búsqueda inválido: {str(e)}")
        
        # Aplicar filtros adicionales
        if filters:
            for field_name, value in filters.items():
                try:
                    query = query.filter(getattr(self.model_class, field_name) == value)
                except AttributeError:
                    raise ValueError(f"Campo de filtro inválido: {field_name}")
        
        # Contar total ANTES de paginar
        total_records = query.count()
        
        # Aplicar ordenamiento
        if sort_by:
            try:
                if hasattr(self.model_class, sort_by):
                    order_column = getattr(self.model_class, sort_by)
                    if sort_order == "desc":
                        query = query.order_by(desc(order_column))
                    else:
                        query = query.order_by(asc(order_column))
            except AttributeError:
                pass  # Si el campo no existe, ignorar ordenamiento
        
        # Aplicar paginación
        offset = (page - 1) * page_size
        records = query.offset(offset).limit(page_size).all()
        
        # Calcular total de páginas
        total_pages = (total_records + page_size - 1) // page_size
        
        return {
            "records": records,
            "totalRecords": total_records,
            "totalPages": total_pages,
            "currentPage": page
        }
    
    # ============================================================================
    # TRANSACCIONES SEGURAS - Error handling duplicado en ~20 métodos
    # ============================================================================
    
    def save_with_transaction(
        self,
        db: Session,
        item: T,
        error_msg: str = "Error al guardar registro"
    ) -> T:
        """
        Guarda un nuevo registro con transacción segura y error handling.
        
        Args:
            db: Sesión de base de datos
            item: Instancia del modelo a guardar
            error_msg: Mensaje de error personalizado
        
        Returns:
            Registro guardado y refrescado
        
        Raises:
            HTTPException: Si falla la transacción (500)
        
        Ejemplo:
            nuevo_usuario = User(name="John", email="john@example.com")
            user = user_service.save_with_transaction(db, nuevo_usuario)
        """
        try:
            db.add(item)
            db.commit()
            db.refresh(item)
            return item
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"{error_msg}: {str(e)}"
            )
    
    def update_with_transaction(
        self,
        db: Session,
        item: T,
        error_msg: str = "Error al actualizar registro"
    ) -> T:
        """
        Actualiza un registro existente con transacción segura.
        
        Args:
            db: Sesión de base de datos
            item: Instancia del modelo (ya modificada)
            error_msg: Mensaje de error personalizado
        
        Returns:
            Registro actualizado y refrescado
        
        Raises:
            HTTPException: Si falla la transacción (500)
        
        Ejemplo:
            usuario.name = "Jane"
            user = user_service.update_with_transaction(db, usuario)
        """
        try:
            db.commit()
            db.refresh(item)
            return item
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"{error_msg}: {str(e)}"
            )
    
    def delete_with_transaction(
        self,
        db: Session,
        item: T,
        error_msg: str = "Error al eliminar registro"
    ) -> None:
        """
        Elimina un registro con transacción segura.
        
        Args:
            db: Sesión de base de datos
            item: Instancia del modelo a eliminar
            error_msg: Mensaje de error personalizado
        
        Raises:
            HTTPException: Si falla la transacción (500)
        
        Ejemplo:
            usuario = user_service.get_by_id(db, 1)
            user_service.delete_with_transaction(db, usuario)
        """
        try:
            db.delete(item)
            db.commit()
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"{error_msg}: {str(e)}"
            )
    
    # ============================================================================
    # UTILIDADES ADICIONALES
    # ============================================================================
    
    def exists_by_id(self, db: Session, id: int) -> bool:
        """
        Verifica si un registro existe por ID sin lanzar excepción.
        
        Args:
            db: Sesión de base de datos
            id: ID a verificar
        
        Returns:
            True si existe, False si no
        """
        return db.query(self.model_class).filter(self.model_class.id == id).first() is not None
    
    def get_all(self, db: Session, limit: Optional[int] = None) -> List[T]:
        """
        Obtiene todos los registros (con límite opcional).
        
        Args:
            db: Sesión de base de datos
            limit: Límite de registros (opcional)
        
        Returns:
            Lista de registros
        """
        query = db.query(self.model_class)
        if limit:
            query = query.limit(limit)
        return query.all()
    
    def count(self, db: Session, filters: Optional[Dict[str, Any]] = None) -> int:
        """
        Cuenta registros con filtros opcionales.
        
        Args:
            db: Sesión de base de datos
            filters: Dict con filtros (e.g., {"activo": True})
        
        Returns:
            Número de registros
        """
        query = db.query(self.model_class)
        if filters:
            for field_name, value in filters.items():
                query = query.filter(getattr(self.model_class, field_name) == value)
        return query.count()
