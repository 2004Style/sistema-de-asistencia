# 👥 Rutas HTTP - Controlador de Usuarios

**Prefijo Base:** `/users`

---

## 📑 Tabla de Contenidos

1. [POST - Registrar Usuario](#1-post---registrar-usuario)
2. [GET - Obtener Usuario por ID](#2-get---obtener-usuario-por-id)
3. [GET - Obtener Usuario por Código](#3-get---obtener-usuario-por-código)
4. [GET - Listar Usuarios](#4-get---listar-usuarios)
5. [PUT - Actualizar Usuario](#5-put---actualizar-usuario)
6. [DELETE - Eliminar Usuario](#6-delete---eliminar-usuario)

---

## 1. POST - Registrar Usuario

### 📌 Información General

- **Ruta:** `/users/register`
- **Método:** `POST`
- **Descripción:** Registra un nuevo usuario con reconocimiento facial. Requiere cargar exactamente 10 imágenes faciales para entrenar el modelo de reconocimiento.
- **Status Code:** `201 Created`
- **Content-Type:** `multipart/form-data`
- **Autenticación:** No requerida (endpoint público)

### 📤 Body (Form-Data)

| Campo              | Tipo      | Obligatorio | Descripción                                                |
| ------------------ | --------- | ----------- | ---------------------------------------------------------- |
| `name`             | `string`  | ✅ Sí       | Nombre completo del usuario (1-100 caracteres)             |
| `email`            | `string`  | ✅ Sí       | Correo electrónico único (válido)                          |
| `codigo_user`      | `string`  | ✅ Sí       | Código único del usuario (ej: "EMP001", máx 50 caracteres) |
| `password`         | `string`  | ✅ Sí       | Contraseña (mínimo 8 caracteres)                           |
| `confirm_password` | `string`  | ✅ Sí       | Confirmación de contraseña (debe coincidir)                |
| `role_id`          | `integer` | ❌ No       | ID del rol a asignar (default: COLABORADOR)                |
| `images`           | `file[]`  | ✅ Sí       | Exactamente 10 imágenes faciales (.jpg, .jpeg, .png)       |

### 📋 Formato de Ejemplo

```
POST /users/register
Content-Type: multipart/form-data

name=Juan Pérez
email=juan.perez@empresa.com
codigo_user=EMP001
password=SecurePass123
confirm_password=SecurePass123
role_id=2
images=imagen1.jpg, imagen2.jpg, ..., imagen10.jpg
```

### ✅ Respuesta Exitosa (HTTP 201)

```json
{
  "data": {
    "id": 1,
    "name": "Juan Pérez",
    "email": "juan.perez@empresa.com",
    "codigo_user": "EMP001",
    "role_id": 2,
    "is_active": true,
    "huella": null,
    "created_at": "2025-10-16T10:30:45.123456",
    "updated_at": null
  },
  "message": "Usuario registrado exitosamente"
}
```

### ❌ Respuestas de Error

| Código | Mensaje                                           | Causa                                     |
| ------ | ------------------------------------------------- | ----------------------------------------- |
| `400`  | "El nombre no puede estar vacío"                  | Campo name vacío                          |
| `400`  | "Email no válido"                                 | Email con formato incorrecto              |
| `400`  | "El email ya está registrado"                     | Email duplicado en el sistema             |
| `400`  | "El código de usuario ya existe"                  | codigo_user duplicado                     |
| `400`  | "La contraseña debe tener al menos 8 caracteres"  | Contraseña muy corta                      |
| `400`  | "Las contraseñas no coinciden"                    | confirm_password no coincide con password |
| `400`  | "Debe proporcionar exactamente 10 imágenes"       | Número incorrecto de archivos             |
| `400`  | "Rol no encontrado"                               | role_id no existe                         |
| `400`  | "Archivo no es una imagen válida"                 | Formato de archivo incorrecto             |
| `500`  | "No se encontró el rol por defecto 'COLABORADOR'" | Error de configuración del sistema        |
| `422`  | "Error de validación en los datos de usuario"     | Datos inválidos                           |
| `500`  | "Error al registrar usuario: ..."                 | Error interno del servidor                |

### 💡 Casos de Uso

**Caso 1: Registrar colaborador básico**

```
POST /users/register
- Sin especificar role_id → Asigna rol COLABORADOR por defecto
```

**Caso 2: Registrar supervisor**

```
POST /users/register
- role_id=3 → Asigna rol SUPERVISOR
```

**Caso 3: Registrar con admin**

```
POST /users/register
- role_id=1 → Asigna rol ADMIN
```

### 📸 Requisitos de Imágenes Faciales

- **Cantidad:** Exactamente 10 imágenes
- **Formatos:** .jpg, .jpeg, .png
- **Tamaño:** Máximo 5MB por imagen
- **Resolución:** Mínimo 640x480
- **Contenido:** Rostro claramente visible, bien iluminado
- **Variedad:** Diferentes ángulos y expresiones para mejor reconocimiento
- **Directorio de almacenamiento:** `recognize/data/{username}/`

---

## 2. GET - Obtener Usuario por ID

### 📌 Información General

- **Ruta:** `/users/{user_id}`
- **Método:** `GET`
- **Descripción:** Obtiene la información completa de un usuario específico por su ID.
- **Autenticación:** Requerida

### 🔗 Parámetro de Ruta

| Parámetro | Tipo      | Obligatorio | Descripción    |
| --------- | --------- | ----------- | -------------- |
| `user_id` | `integer` | ✅ Sí       | ID del usuario |

### 🔍 Query Parameters

**No aplica**

### 📤 Ejemplo de Consulta

```
GET /users/1
```

### ✅ Respuesta Exitosa (HTTP 200)

```json
{
  "data": {
    "id": 1,
    "name": "Juan Pérez",
    "email": "juan.perez@empresa.com",
    "codigo_user": "EMP001",
    "role_id": 2,
    "is_active": true,
    "huella": null,
    "created_at": "2025-10-16T10:30:45.123456",
    "updated_at": "2025-10-16T14:20:10.987654"
  },
  "message": "Usuario obtenido exitosamente"
}
```

### ❌ Respuestas de Error

| Código | Mensaje                         | Causa                      |
| ------ | ------------------------------- | -------------------------- |
| `404`  | "Usuario no encontrado"         | user_id no existe          |
| `401`  | "Usuario no autenticado"        | No hay sesión activa       |
| `500`  | "Error al obtener usuario: ..." | Error interno del servidor |

---

## 3. GET - Obtener Usuario por Código

### 📌 Información General

- **Ruta:** `/users/codigo/{codigo}`
- **Método:** `GET`
- **Descripción:** Obtiene la información de un usuario buscando por su código único (ej: "EMP001").
- **Autenticación:** Requerida

### 🔗 Parámetro de Ruta

| Parámetro | Tipo     | Obligatorio | Descripción              |
| --------- | -------- | ----------- | ------------------------ |
| `codigo`  | `string` | ✅ Sí       | Código único del usuario |

### 🔍 Query Parameters

**No aplica**

### 📤 Ejemplo de Consulta

```
GET /users/codigo/EMP001
```

### ✅ Respuesta Exitosa (HTTP 200)

```json
{
  "data": {
    "id": 1,
    "name": "Juan Pérez",
    "email": "juan.perez@empresa.com",
    "codigo_user": "EMP001",
    "role_id": 2,
    "is_active": true,
    "huella": null,
    "created_at": "2025-10-16T10:30:45.123456",
    "updated_at": null
  },
  "message": "Usuario obtenido exitosamente"
}
```

### ❌ Respuestas de Error

| Código | Mensaje                         | Causa                      |
| ------ | ------------------------------- | -------------------------- |
| `404`  | "Usuario no encontrado"         | El código no existe        |
| `401`  | "Usuario no autenticado"        | No hay sesión activa       |
| `500`  | "Error al obtener usuario: ..." | Error interno del servidor |

### 💡 Caso de Uso

```
GET /users/codigo/EMP001
→ Obtener usuario por su código de empleado
```

---

## 4. GET - Listar Usuarios

### 📌 Información General

- **Ruta:** `/users/`
- **Método:** `GET`
- **Descripción:** Obtiene una lista paginada de usuarios con opciones de búsqueda, filtrado y ordenamiento.
- **Autenticación:** Requerida

### 🔍 Query Parameters

| Parámetro   | Tipo      | Obligatorio | Valores                              | Descripción                                          |
| ----------- | --------- | ----------- | ------------------------------------ | ---------------------------------------------------- |
| `page`      | `integer` | ❌ No       | ≥ 1                                  | Número de página (default: 1)                        |
| `pageSize`  | `integer` | ❌ No       | 1-100                                | Registros por página (default: 10, máximo: 100)      |
| `search`    | `string`  | ❌ No       | Cualquier texto                      | Término de búsqueda (busca en nombre, email, código) |
| `sortBy`    | `string`  | ❌ No       | name, email, codigo_user, created_at | Campo para ordenar (default: name)                   |
| `sortOrder` | `string`  | ❌ No       | asc, desc                            | Orden de clasificación (default: asc)                |

### 📤 Ejemplos de Consulta

**Ejemplo 1: Obtener primera página de usuarios**

```
GET /users/?page=1&pageSize=10
```

**Ejemplo 2: Buscar usuarios con término**

```
GET /users/?page=1&pageSize=10&search=Juan
```

**Ejemplo 3: Buscar y ordenar por email**

```
GET /users/?search=empresa.com&sortBy=email&sortOrder=asc&pageSize=20
```

**Ejemplo 4: Obtener segunda página ordenada por fecha**

```
GET /users/?page=2&pageSize=15&sortBy=created_at&sortOrder=desc
```

### ✅ Respuesta Exitosa (HTTP 200)

```json
{
  "data": {
    "records": [
      {
        "id": 1,
        "name": "Juan Pérez",
        "email": "juan.perez@empresa.com",
        "codigo_user": "EMP001",
        "role_id": 2,
        "is_active": true,
        "huella": null,
        "created_at": "2025-10-16T10:30:45.123456",
        "updated_at": "2025-10-16T14:20:10.987654"
      },
      {
        "id": 2,
        "name": "María García",
        "email": "maria.garcia@empresa.com",
        "codigo_user": "EMP002",
        "role_id": 2,
        "is_active": true,
        "huella": null,
        "created_at": "2025-10-15T09:15:30.456789",
        "updated_at": null
      },
      {
        "id": 3,
        "name": "Carlos López",
        "email": "carlos.lopez@empresa.com",
        "codigo_user": "EMP003",
        "role_id": 3,
        "is_active": true,
        "huella": null,
        "created_at": "2025-10-14T16:45:20.789012",
        "updated_at": "2025-10-16T11:30:00.654321"
      }
    ],
    "totalRecords": 3,
    "totalPages": 1,
    "currentPage": 1
  },
  "message": "Usuarios obtenidos exitosamente"
}
```

### ❌ Respuestas de Error

| Código | Mensaje                             | Causa                            |
| ------ | ----------------------------------- | -------------------------------- |
| `400`  | "page debe ser mayor o igual a 1"   | Número de página inválido        |
| `400`  | "pageSize debe ser entre 1 y 100"   | Tamaño de página fuera de rango  |
| `400`  | "sortOrder debe ser 'asc' o 'desc'" | Orden de clasificación inválido  |
| `400`  | "Campo de ordenamiento no válido"   | sortBy no está en campos válidos |
| `401`  | "Usuario no autenticado"            | No hay sesión activa             |
| `500`  | "Error al obtener usuarios: ..."    | Error interno del servidor       |

### 📊 Estructura de Respuesta

| Campo          | Tipo      | Descripción               |
| -------------- | --------- | ------------------------- |
| `records`      | `array`   | Array de UserResponse     |
| `totalRecords` | `integer` | Número total de registros |
| `totalPages`   | `integer` | Número total de páginas   |
| `currentPage`  | `integer` | Página actual             |

### 💡 Casos de Uso

**Caso 1: Buscar empleado específico**

```
GET /users/?search=Juan&pageSize=50
→ Busca usuarios con "Juan" en nombre/email/código
```

**Caso 2: Listar usuarios ordenados alfabéticamente**

```
GET /users/?sortBy=name&sortOrder=asc&pageSize=100
→ Obtiene todos los usuarios ordenados por nombre
```

**Caso 3: Usuarios registrados recientemente**

```
GET /users/?sortBy=created_at&sortOrder=desc&pageSize=20
→ Últimos 20 usuarios registrados
```

---

## 5. PUT - Actualizar Usuario

### 📌 Información General

- **Ruta:** `/users/{user_id}`
- **Método:** `PUT`
- **Descripción:** Actualiza los datos de un usuario existente. Solo se actualizan los campos enviados.
- **Autenticación:** Requerida (Usuario propietario o Administrador)

### 🔗 Parámetro de Ruta

| Parámetro | Tipo      | Obligatorio | Descripción                 |
| --------- | --------- | ----------- | --------------------------- |
| `user_id` | `integer` | ✅ Sí       | ID del usuario a actualizar |

### 📤 Body (JSON)

```json
{
  "name": "Juan Carlos Pérez",
  "email": "juancarlos.perez@empresa.com",
  "codigo_user": "EMP001_V2",
  "role_id": 3,
  "is_active": true,
  "password": "NewSecurePass456"
}
```

### 🔍 Parámetros del Body

| Parámetro     | Tipo      | Obligatorio | Descripción                            |
| ------------- | --------- | ----------- | -------------------------------------- |
| `name`        | `string`  | ❌ No       | Nuevo nombre del usuario               |
| `email`       | `string`  | ❌ No       | Nuevo email único                      |
| `codigo_user` | `string`  | ❌ No       | Nuevo código del usuario               |
| `role_id`     | `integer` | ❌ No       | Nuevo ID de rol                        |
| `is_active`   | `boolean` | ❌ No       | Activar/desactivar usuario             |
| `password`    | `string`  | ❌ No       | Nueva contraseña (mínimo 8 caracteres) |
| `huella`      | `string`  | ❌ No       | Datos de huella digital                |

### 📥 Query Parameters

**No aplica**

### ✅ Respuesta Exitosa (HTTP 200)

```json
{
  "data": {
    "id": 1,
    "name": "Juan Carlos Pérez",
    "email": "juancarlos.perez@empresa.com",
    "codigo_user": "EMP001_V2",
    "role_id": 3,
    "is_active": true,
    "huella": null,
    "created_at": "2025-10-16T10:30:45.123456",
    "updated_at": "2025-10-16T15:45:30.654321"
  },
  "message": "Usuario actualizado exitosamente"
}
```

### ❌ Respuestas de Error

| Código | Mensaje                                          | Causa                       |
| ------ | ------------------------------------------------ | --------------------------- |
| `404`  | "Usuario no encontrado"                          | user_id no existe           |
| `400`  | "El email ya está registrado"                    | Email duplicado             |
| `400`  | "El código de usuario ya existe"                 | codigo_user duplicado       |
| `400`  | "La contraseña debe tener al menos 8 caracteres" | Contraseña muy corta        |
| `400`  | "Email no válido"                                | Formato de email incorrecto |
| `400`  | "Rol no encontrado"                              | role_id no existe           |
| `403`  | "No tiene permisos para actualizar este usuario" | No es propietario ni admin  |
| `401`  | "Usuario no autenticado"                         | No hay sesión activa        |
| `422`  | "Error de validación"                            | Datos inválidos             |
| `500`  | "Error al actualizar usuario: ..."               | Error interno del servidor  |

### 💡 Casos de Uso

**Caso 1: Cambiar contraseña**

```json
PUT /users/1
{
  "password": "NewPassword789"
}
```

**Caso 2: Actualizar rol a supervisor**

```json
PUT /users/1
{
  "role_id": 3
}
```

**Caso 3: Desactivar usuario**

```json
PUT /users/1
{
  "is_active": false
}
```

**Caso 4: Cambiar múltiples datos**

```json
PUT /users/1
{
  "name": "Juan Pérez González",
  "email": "jpg.nuevoemail@empresa.com",
  "role_id": 3
}
```

---

## 6. DELETE - Eliminar Usuario

### 📌 Información General

- **Ruta:** `/users/{user_id}`
- **Método:** `DELETE`
- **Descripción:** Elimina un usuario y todos sus datos asociados incluyendo imágenes faciales, registros de asistencia y datos del sistema de reconocimiento.
- **Status Code:** `200 OK`
- **Autenticación:** Requerida (Administrador)

### 🔗 Parámetro de Ruta

| Parámetro | Tipo      | Obligatorio | Descripción               |
| --------- | --------- | ----------- | ------------------------- |
| `user_id` | `integer` | ✅ Sí       | ID del usuario a eliminar |

### 🔍 Query Parameters

**No aplica**

### 📤 Ejemplo de Consulta

```
DELETE /users/1
```

### ✅ Respuesta Exitosa (HTTP 200)

```json
{
  "data": {
    "deleted": true
  },
  "message": "Usuario eliminado exitosamente. Carpeta y datos del reconocimiento eliminados."
}
```

### ⚠️ Datos que se Eliminan

Cuando se elimina un usuario, se elimina:

1. **Registro en base de datos**

   - Perfil del usuario
   - Credenciales
   - Información personal

2. **Directorio de imágenes faciales**

   - Ruta: `recognize/data/{username}/`
   - Todas las imágenes almacenadas

3. **Modelos de reconocimiento facial**

   - Datos entrenados
   - Vectores faciales

4. **Registros de asistencia** (Opcional según configuración)
   - Historial completo del usuario

### ❌ Respuestas de Error

| Código | Mensaje                                                    | Causa                       |
| ------ | ---------------------------------------------------------- | --------------------------- |
| `404`  | "Usuario no encontrado"                                    | user_id no existe           |
| `403`  | "No tiene permisos para eliminar usuarios"                 | Usuario no es administrador |
| `400`  | "No se puede eliminar el último administrador del sistema" | Último admin                |
| `401`  | "Usuario no autenticado"                                   | No hay sesión activa        |
| `500`  | "Error al eliminar usuario: ..."                           | Error interno del servidor  |

### 💡 Casos de Uso

**Caso 1: Eliminar usuario inactivo**

```
DELETE /users/5
→ Elimina usuario y todas sus imágenes faciales
```

**Caso 2: Remover acceso de empleado**

```
DELETE /users/3
→ Elimina perfil, reconocimiento facial e historial
```

---

## 📊 Resumen de Rutas

| Método   | Ruta                     | Descripción                | Auth     |
| -------- | ------------------------ | -------------------------- | -------- |
| `POST`   | `/users/register`        | Registra un usuario        | ❌       |
| `GET`    | `/users/{user_id}`       | Obtiene usuario por ID     | ✅       |
| `GET`    | `/users/codigo/{codigo}` | Obtiene usuario por código | ✅       |
| `GET`    | `/users/`                | Lista usuarios paginados   | ✅       |
| `PUT`    | `/users/{user_id}`       | Actualiza usuario          | ✅       |
| `DELETE` | `/users/{user_id}`       | Elimina usuario            | Admin ✅ |

---

## 👥 Roles del Sistema

| Role ID | Nombre      | Permisos                   | Descripción                                  |
| ------- | ----------- | -------------------------- | -------------------------------------------- |
| `1`     | ADMIN       | Todos                      | Administrador del sistema (máximos permisos) |
| `2`     | SUPERVISOR  | Lectura/Escritura limitada | Supervisor de empleados                      |
| `3`     | COLABORADOR | Lectura propia             | Colaborador/empleado básico                  |

---

## 🔐 Política de Contraseñas

- **Longitud mínima:** 8 caracteres
- **Caracteres permitidos:** Mayúsculas, minúsculas, números, símbolos
- **Validación:** Se valida en registro y actualización
- **Hash:** Se almacena hasheada (no recuperable)

---

## 📸 Sistema de Reconocimiento Facial

### Almacenamiento de Imágenes

```
recognize/data/
  ├── juan_perez/           (nombre usuario)
  │   ├── imagen1.jpg
  │   ├── imagen2.jpg
  │   └── ... (hasta 10 imágenes)
  ├── maria_garcia/
  └── carlos_lopez/
```

### Proceso de Reconocimiento

1. **Captura:** 10 imágenes en ángulos diferentes
2. **Almacenamiento:** Carpeta `recognize/data/{username}/`
3. **Entrenamiento:** Modelo facial se entrena con las imágenes
4. **Reconocimiento:** Sistema detecta facial al registrar asistencia

---

## 📌 Campos de Usuario Explicados

| Campo         | Tipo     | Descripción                          |
| ------------- | -------- | ------------------------------------ |
| `id`          | integer  | Identificador único del usuario      |
| `name`        | string   | Nombre completo del usuario          |
| `email`       | string   | Correo electrónico único (validado)  |
| `codigo_user` | string   | Código único (ej: EMP001, NOMINA)    |
| `role_id`     | integer  | ID del rol asignado                  |
| `is_active`   | boolean  | Estado del usuario (activo/inactivo) |
| `huella`      | string   | Datos opcionales de huella digital   |
| `created_at`  | datetime | Fecha de creación                    |
| `updated_at`  | datetime | Fecha de última actualización        |

---

## 🔍 Búsqueda Inteligente

El parámetro `search` busca en:

- **Nombre:** Búsqueda parcial (case-insensitive)
- **Email:** Búsqueda parcial
- **Código:** Búsqueda exacta o parcial

**Ejemplos:**

```
search=juan        → Encuentra "Juan Pérez", "Juan Carlos", etc.
search=@empresa    → Encuentra todos los emails de la empresa
search=EMP001      → Encuentra usuario con código EMP001
```

---

## 📊 Campos de Ordenamiento

Disponibles en la ruta `GET /users/`:

| Campo         | Descripción        | Ejemplo              |
| ------------- | ------------------ | -------------------- |
| `name`        | Nombre del usuario | A-Z o Z-A            |
| `email`       | Email del usuario  | Alfabético           |
| `codigo_user` | Código del usuario | Alfabético           |
| `created_at`  | Fecha de creación  | Más reciente primero |

---

## 🔐 Notas de Seguridad

- **Contraseñas:** Nunca se devuelven en las respuestas
- **Autenticación:** Requerida para obtener/listar usuarios
- **Autorización:** Cada usuario solo puede editar su propio perfil (excepto ADMIN)
- **Eliminación:** Solo ADMIN puede eliminar usuarios
- **Imágenes faciales:** Se almacenan localmente en `recognize/data/`
- **Validación de email:** Se valida formato y unicidad
- **Códigos únicos:** Códigos de usuario deben ser únicos en el sistema

---

## 💡 Flujo Típico de Uso

### 1. Registrar Nuevo Usuario

```
POST /users/register
├─ Enviar 10 imágenes faciales
├─ Crear usuario en BD
├─ Entrenar modelo facial
└─ Retornar UserResponse
```

### 2. Listar Usuarios en UI

```
GET /users/?page=1&pageSize=20
├─ Obtener lista paginada
├─ Mostrar en tabla/listado
└─ Permitir búsqueda y ordenamiento
```

### 3. Editar Perfil de Usuario

```
PUT /users/{user_id}
├─ Actualizar datos personales
├─ Cambiar contraseña
├─ Modificar rol
└─ Guardar cambios
```

### 4. Eliminar Cuando Sea Necesario

```
DELETE /users/{user_id}
├─ Eliminar de BD
├─ Eliminar imágenes faciales
├─ Eliminar modelo facial
└─ Limpiar todos los datos
```

---

**Última actualización:** 16 de octubre de 2025
