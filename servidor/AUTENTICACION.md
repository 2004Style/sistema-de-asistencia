# Autenticación - Endpoint de Login

## Resumen de la Implementación

Se ha implementado un sistema completo de autenticación con JWT (JSON Web Tokens) que incluye:

### 1. **Endpoint de Login**

- **Ruta**: `POST /users/login/credentials`
- **Descripción**: Autentica un usuario con email y contraseña, retornando el usuario y tokens JWT

### 2. **Estructura de la Respuesta**

```json
{
  "user": {
    "id": 1,
    "name": "Juan Pérez",
    "email": "juan@example.com",
    "codigo_user": "JP001",
    "role_id": 2,
    "is_active": true,
    "huella": null,
    "created_at": "2025-10-16T10:30:00",
    "updated_at": null
  },
  "backendTokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  }
}
```

### 3. **Campos de Respuesta**

#### `user` (UserResponse)

- `id`: Identificador único del usuario
- `name`: Nombre completo del usuario
- `email`: Correo electrónico del usuario
- `codigo_user`: Código único del usuario
- `role_id`: ID del rol asignado
- `is_active`: Estado del usuario (activo/inactivo)
- `huella`: Huella digital del usuario (nula si no está registrada)
- `created_at`: Fecha de creación del usuario
- `updated_at`: Fecha de última actualización

#### `backendTokens` (BackendTokens)

- `accessToken`: Token JWT para acceso a recursos protegidos (válido por 15 minutos por defecto)
- `refreshToken`: Token JWT para renovar el access token (válido por 7 días por defecto)
- `expiresIn`: Tiempo de expiración del access token en segundos

### 4. **Solicitud de Login**

```json
{
  "email": "juan@example.com",
  "password": "miContraseña123"
}
```

### 5. **Códigos de Error**

- **401 Unauthorized**: Email o contraseña inválidos
- **403 Forbidden**: El usuario está inactivo
- **500 Internal Server Error**: Error en el servidor

### 6. **Archivos Modificados**

#### `src/config/settings.py`

- Agregadas configuraciones JWT:
  - `JWT_SECRET_KEY`: Clave secreta para firmar tokens
  - `JWT_ALGORITHM`: Algoritmo de encriptación (HS256 por defecto)
  - `JWT_ACCESS_TOKEN_EXPIRE_MINUTES`: Minutos de expiración del access token (15 por defecto)
  - `JWT_REFRESH_TOKEN_EXPIRE_DAYS`: Días de expiración del refresh token (7 por defecto)

#### `src/utils/security.py`

- `hash_password(password)`: Encripta una contraseña con bcrypt
- `verify_password(plain_password, hashed_password)`: Verifica una contraseña
- `create_access_token(data, expires_delta)`: Crea un token de acceso JWT
- `create_refresh_token(data, expires_delta)`: Crea un token de refresco JWT
- `verify_token(token)`: Verifica y decodifica un token JWT
- `create_tokens(user_id, user_email)`: Crea ambos tokens para un usuario

#### `src/users/schemas.py`

- `BackendTokens`: Modelo de datos para tokens
- `LoginRequest`: Modelo para solicitud de login
- `LoginResponse`: Modelo para respuesta de login

#### `src/users/service.py`

- `authenticate_user(db, email, password)`: Método para autenticar usuario por email y contraseña

#### `src/users/controller.py`

- `POST /users/login/credentials`: Endpoint de login

### 7. **Configuración Necesaria**

En el archivo `.env`, asegúrate de configurar:

```env
# JWT Configuration
JWT_SECRET_KEY=tu-clave-secreta-muy-segura-aqui
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=15
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7
```

### 8. **Ejemplo de Uso**

#### Request:

```bash
curl -X POST http://localhost:8000/users/login/credentials \
  -H "Content-Type: application/json" \
  -d '{
    "email": "juan@example.com",
    "password": "miContraseña123"
  }'
```

#### Response Success (200 OK):

```json
{
  "user": {
    "id": 1,
    "name": "Juan Pérez",
    "email": "juan@example.com",
    "codigo_user": "JP001",
    "role_id": 2,
    "is_active": true,
    "huella": null,
    "created_at": "2025-10-16T10:30:00",
    "updated_at": null
  },
  "backendTokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  }
}
```

#### Response Error (401):

```json
{
  "detail": "Email o contraseña inválidos"
}
```

### 9. **Próximos Pasos Opcionales**

Para completar el sistema de autenticación, puedes implementar:

1. **Endpoint de Refresh Token**: Para renovar el access token usando el refresh token

   ```
   POST /users/refresh
   ```

2. **Middleware de Autenticación**: Para proteger endpoints que requieren autenticación

   ```python
   async def get_current_user(token: str = Depends(oauth2_scheme)):
       user = verify_token(token)
       return user
   ```

3. **Endpoint de Logout**: Para invalidar tokens (requeriría una tabla de tokens revocados)

4. **Two-Factor Authentication**: Para mayor seguridad

## Resumen Técnico

- **Algoritmo de Hashing**: bcrypt para contraseñas
- **Algoritmo de Tokens**: HS256 (HMAC SHA-256)
- **Tokens JWT**: Incluyen `sub` (user_id), `email`, `type` (access/refresh)
- **Configuración**: Todas las configuraciones están centralizadas en `settings.py`
- **Seguridad**: Las contraseñas nunca se transmiten en la respuesta, solo se verifica contra el hash almacenado
