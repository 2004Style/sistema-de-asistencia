# 👤 Rutas HTTP - Controlador de Roles

**Prefijo Base:** `/roles`

---

## 📑 Tabla de Contenidos

1. [POST - Crear Rol](#1-post---crear-rol)
2. [GET - Listar Roles](#2-get---listar-roles)
3. [GET - Obtener Rol por ID](#3-get---obtener-rol-por-id)
4. [GET - Listar Roles Activos](#4-get---listar-roles-activos)
5. [PUT - Actualizar Rol](#5-put---actualizar-rol)
6. [DELETE - Eliminar Rol](#6-delete---eliminar-rol)

---

## 1. POST - Crear Rol

### 📌 Información General

- **Ruta:** `/roles/`
- **Método:** `POST`
- **Descripción:** Crea un nuevo rol en el sistema. Define qué permisos tendrá este rol.
- **Status Code:** `201 Created`
- **Autenticación:** Requerida (Administrador)

### 📤 Body (JSON)

```json
{
  "nombre": "SUPERVISOR",
  "descripcion": "Supervisor de departamento con acceso a reportes y aprobación de justificaciones",
  "es_admin": false,
  "puede_aprobar": true,
  "puede_ver_reportes": true,
  "puede_gestionar_usuarios": false,
  "activo": true
}
```

### 🔍 Parámetros del Body

| Parámetro                  | Tipo      | Obligatorio | Descripción                                       |
| -------------------------- | --------- | ----------- | ------------------------------------------------- |
| `nombre`                   | `string`  | ✅ Sí       | Nombre único del rol (3-50 caracteres)            |
| `descripcion`              | `string`  | ❌ No       | Descripción del rol                               |
| `es_admin`                 | `boolean` | ❌ No       | Si tiene acceso total al sistema (default: false) |
| `puede_aprobar`            | `boolean` | ❌ No       | Si puede aprobar justificaciones (default: false) |
| `puede_ver_reportes`       | `boolean` | ❌ No       | Si puede ver reportes (default: false)            |
| `puede_gestionar_usuarios` | `boolean` | ❌ No       | Si puede gestionar usuarios (default: false)      |
| `activo`                   | `boolean` | ❌ No       | Si está activo (default: true)                    |

### 📥 Query Parameters

**No aplica**

### ✅ Respuesta Exitosa (HTTP 201)

```json
{
  "data": {
    "id": 3,
    "nombre": "SUPERVISOR",
    "descripcion": "Supervisor de departamento con acceso a reportes y aprobación de justificaciones",
    "es_admin": false,
    "puede_aprobar": true,
    "puede_ver_reportes": true,
    "puede_gestionar_usuarios": false,
    "activo": true
  },
  "message": "Rol creado exitosamente"
}
```

### ❌ Respuestas de Error

| Código | Mensaje                                        | Causa                      |
| ------ | ---------------------------------------------- | -------------------------- |
| `400`  | "El nombre del rol ya existe"                  | Nombre duplicado           |
| `400`  | "El nombre debe tener entre 3 y 50 caracteres" | Longitud inválida          |
| `403`  | "Solo administradores pueden crear roles"      | Permisos insuficientes     |
| `422`  | "Validación fallida"                           | Datos inválidos            |
| `500`  | "Error al crear rol: ..."                      | Error interno del servidor |

---

## 2. GET - Listar Roles

### 📌 Información General

- **Ruta:** `/roles/`
- **Método:** `GET`
- **Descripción:** Obtiene una lista paginada de roles con opciones de búsqueda, filtrado y ordenamiento.
- **Autenticación:** Requerida

### 🔍 Query Parameters

| Parámetro      | Tipo      | Obligatorio | Valores         | Descripción                                  |
| -------------- | --------- | ----------- | --------------- | -------------------------------------------- |
| `page`         | `integer` | ❌ No       | ≥ 1             | Número de página (default: 1)                |
| `pageSize`     | `integer` | ❌ No       | 1-100           | Tamaño de página (default: 10, máximo: 100)  |
| `search`       | `string`  | ❌ No       | -               | Buscar por nombre o descripción              |
| `sortBy`       | `string`  | ❌ No       | -               | Campo para ordenar (nombre, createdAt, etc.) |
| `sortOrder`    | `string`  | ❌ No       | `asc`, `desc`   | Orden (default: asc)                         |
| `activos_solo` | `boolean` | ❌ No       | `true`, `false` | Solo roles activos (default: false)          |

### 📤 Ejemplos de Consulta

**Ejemplo 1: Obtener primera página de roles**

```
GET /roles/?page=1&pageSize=10
```

**Ejemplo 2: Buscar roles por nombre**

```
GET /roles/?search=ADMIN&page=1&pageSize=10
```

**Ejemplo 3: Obtener solo roles activos**

```
GET /roles/?activos_solo=true&page=1&pageSize=50
```

**Ejemplo 4: Listar ordenado por nombre descendente**

```
GET /roles/?sortBy=nombre&sortOrder=desc&page=1&pageSize=20
```

**Ejemplo 5: Búsqueda con filtros combinados**

```
GET /roles/?search=supervisor&activos_solo=true&sortBy=nombre&sortOrder=asc&page=1&pageSize=15
```

### ✅ Respuesta Exitosa (HTTP 200)

```json
{
  "data": {
    "records": [
      {
        "id": 1,
        "nombre": "ADMIN",
        "descripcion": "Administrador con acceso total al sistema",
        "es_admin": true,
        "puede_aprobar": true,
        "puede_ver_reportes": true,
        "puede_gestionar_usuarios": true,
        "activo": true
      },
      {
        "id": 2,
        "nombre": "COLABORADOR",
        "descripcion": "Colaborador regular sin acceso administrativo",
        "es_admin": false,
        "puede_aprobar": false,
        "puede_ver_reportes": false,
        "puede_gestionar_usuarios": false,
        "activo": true
      },
      {
        "id": 3,
        "nombre": "SUPERVISOR",
        "descripcion": "Supervisor de departamento con acceso a reportes y aprobación",
        "es_admin": false,
        "puede_aprobar": true,
        "puede_ver_reportes": true,
        "puede_gestionar_usuarios": false,
        "activo": true
      }
    ],
    "totalRecords": 3,
    "totalPages": 1,
    "currentPage": 1
  },
  "message": "Roles obtenidos exitosamente"
}
```

### ❌ Respuestas de Error

| Código | Mensaje                             | Causa                      |
| ------ | ----------------------------------- | -------------------------- |
| `400`  | "pageSize no puede ser mayor a 100" | Tamaño de página excesivo  |
| `400`  | "page debe ser mayor o igual a 1"   | Número de página inválido  |
| `500`  | "Error al listar roles: ..."        | Error interno del servidor |

---

## 3. GET - Obtener Rol por ID

### 📌 Información General

- **Ruta:** `/roles/{role_id}`
- **Método:** `GET`
- **Descripción:** Obtiene los detalles de un rol específico por su ID.
- **Autenticación:** Requerida

### 🔗 Parámetro de Ruta

| Parámetro | Tipo      | Obligatorio | Descripción |
| --------- | --------- | ----------- | ----------- |
| `role_id` | `integer` | ✅ Sí       | ID del rol  |

### 🔍 Query Parameters

**No aplica**

### 📤 Ejemplo de Consulta

```
GET /roles/3
```

### ✅ Respuesta Exitosa (HTTP 200)

```json
{
  "data": {
    "id": 3,
    "nombre": "SUPERVISOR",
    "descripcion": "Supervisor de departamento con acceso a reportes y aprobación de justificaciones",
    "es_admin": false,
    "puede_aprobar": true,
    "puede_ver_reportes": true,
    "puede_gestionar_usuarios": false,
    "activo": true
  },
  "message": "Rol obtenido exitosamente"
}
```

### ❌ Respuestas de Error

| Código | Mensaje                     | Causa                      |
| ------ | --------------------------- | -------------------------- |
| `404`  | "Rol no encontrado"         | El role_id no existe       |
| `500`  | "Error al obtener rol: ..." | Error interno del servidor |

---

## 4. GET - Listar Roles Activos

### 📌 Información General

- **Ruta:** `/roles/activos/listar`
- **Método:** `GET`
- **Descripción:** Obtiene todos los roles activos sin paginación. Útil para dropdowns y selects.
- **Autenticación:** Requerida

### 🔍 Query Parameters

**No aplica**

### 📤 Ejemplo de Consulta

```
GET /roles/activos/listar
```

### ✅ Respuesta Exitosa (HTTP 200)

```json
{
  "data": [
    {
      "id": 1,
      "nombre": "ADMIN",
      "descripcion": "Administrador con acceso total al sistema",
      "es_admin": true,
      "puede_aprobar": true,
      "puede_ver_reportes": true,
      "puede_gestionar_usuarios": true,
      "activo": true
    },
    {
      "id": 2,
      "nombre": "COLABORADOR",
      "descripcion": "Colaborador regular sin acceso administrativo",
      "es_admin": false,
      "puede_aprobar": false,
      "puede_ver_reportes": false,
      "puede_gestionar_usuarios": false,
      "activo": true
    },
    {
      "id": 3,
      "nombre": "SUPERVISOR",
      "descripcion": "Supervisor de departamento con acceso a reportes y aprobación",
      "es_admin": false,
      "puede_aprobar": true,
      "puede_ver_reportes": true,
      "puede_gestionar_usuarios": false,
      "activo": true
    }
  ],
  "message": "3 roles activos obtenidos"
}
```

### ❌ Respuestas de Error

| Código | Mensaje                               | Causa                      |
| ------ | ------------------------------------- | -------------------------- |
| `500`  | "Error al obtener roles activos: ..." | Error interno del servidor |

---

## 5. PUT - Actualizar Rol

### 📌 Información General

- **Ruta:** `/roles/{role_id}`
- **Método:** `PUT`
- **Descripción:** Actualiza los datos de un rol existente. Solo se actualizan los campos enviados.
- **Autenticación:** Requerida (Administrador)

### 🔗 Parámetro de Ruta

| Parámetro | Tipo      | Obligatorio | Descripción             |
| --------- | --------- | ----------- | ----------------------- |
| `role_id` | `integer` | ✅ Sí       | ID del rol a actualizar |

### 📤 Body (JSON)

```json
{
  "descripcion": "Supervisor actualizado con más permisos",
  "puede_gestionar_usuarios": true,
  "activo": true
}
```

### 🔍 Parámetros del Body

| Parámetro                  | Tipo      | Obligatorio | Descripción                            |
| -------------------------- | --------- | ----------- | -------------------------------------- |
| `nombre`                   | `string`  | ❌ No       | Nuevo nombre del rol (3-50 caracteres) |
| `descripcion`              | `string`  | ❌ No       | Nueva descripción                      |
| `es_admin`                 | `boolean` | ❌ No       | Nuevo valor de acceso administrativo   |
| `puede_aprobar`            | `boolean` | ❌ No       | Nuevo valor para aprobación            |
| `puede_ver_reportes`       | `boolean` | ❌ No       | Nuevo valor para ver reportes          |
| `puede_gestionar_usuarios` | `boolean` | ❌ No       | Nuevo valor para gestionar usuarios    |
| `activo`                   | `boolean` | ❌ No       | Nuevo estado activo                    |

### 📥 Query Parameters

**No aplica**

### ✅ Respuesta Exitosa (HTTP 200)

```json
{
  "data": {
    "id": 3,
    "nombre": "SUPERVISOR",
    "descripcion": "Supervisor actualizado con más permisos",
    "es_admin": false,
    "puede_aprobar": true,
    "puede_ver_reportes": true,
    "puede_gestionar_usuarios": true,
    "activo": true
  },
  "message": "Rol actualizado exitosamente"
}
```

### ❌ Respuestas de Error

| Código | Mensaje                                        | Causa                      |
| ------ | ---------------------------------------------- | -------------------------- |
| `404`  | "Rol no encontrado"                            | El role_id no existe       |
| `400`  | "El nombre del rol ya existe"                  | Nombre duplicado           |
| `400`  | "El nombre debe tener entre 3 y 50 caracteres" | Longitud inválida          |
| `403`  | "Solo administradores pueden actualizar roles" | Permisos insuficientes     |
| `422`  | "Validación fallida"                           | Datos inválidos            |
| `500`  | "Error al actualizar rol: ..."                 | Error interno del servidor |

---

## 6. DELETE - Eliminar Rol

### 📌 Información General

- **Ruta:** `/roles/{role_id}`
- **Método:** `DELETE`
- **Descripción:** Elimina (desactiva) un rol del sistema. Es una eliminación lógica: el rol se marca como inactivo, no se elimina físicamente. No se puede eliminar si tiene usuarios activos asociados.
- **Status Code:** `200 OK`
- **Autenticación:** Requerida (Administrador)

### 🔗 Parámetro de Ruta

| Parámetro | Tipo      | Obligatorio | Descripción           |
| --------- | --------- | ----------- | --------------------- |
| `role_id` | `integer` | ✅ Sí       | ID del rol a eliminar |

### 🔍 Query Parameters

**No aplica**

### 📤 Ejemplo de Consulta

```
DELETE /roles/3
```

### ✅ Respuesta Exitosa (HTTP 200)

```json
{
  "data": {
    "id": 3
  },
  "message": "Rol eliminado exitosamente"
}
```

### ❌ Respuestas de Error

| Código | Mensaje                                      | Causa                               |
| ------ | -------------------------------------------- | ----------------------------------- |
| `404`  | "Rol no encontrado"                          | El role_id no existe                |
| `400`  | "No se puede eliminar el rol ADMIN"          | Intento de eliminar rol del sistema |
| `400`  | "El rol tiene usuarios activos asociados"    | Hay usuarios asignados a este rol   |
| `403`  | "Solo administradores pueden eliminar roles" | Permisos insuficientes              |
| `500`  | "Error al eliminar rol: ..."                 | Error interno del servidor          |

---

## 📊 Resumen de Rutas

| Método   | Ruta                    | Descripción         | Auth     |
| -------- | ----------------------- | ------------------- | -------- |
| `POST`   | `/roles/`               | Crea un rol         | Admin ✅ |
| `GET`    | `/roles/`               | Lista roles         | ✅       |
| `GET`    | `/roles/{role_id}`      | Obtiene un rol      | ✅       |
| `GET`    | `/roles/activos/listar` | Lista roles activos | ✅       |
| `PUT`    | `/roles/{role_id}`      | Actualiza un rol    | Admin ✅ |
| `DELETE` | `/roles/{role_id}`      | Elimina un rol      | Admin ✅ |

---

## 📋 Roles Predefinidos del Sistema

### 1. ADMIN

```json
{
  "nombre": "ADMIN",
  "descripcion": "Administrador con acceso total al sistema",
  "es_admin": true,
  "puede_aprobar": true,
  "puede_ver_reportes": true,
  "puede_gestionar_usuarios": true
}
```

**Permisos totales:** Acceso completo a todas las funciones.

### 2. COLABORADOR

```json
{
  "nombre": "COLABORADOR",
  "descripcion": "Colaborador regular sin acceso administrativo",
  "es_admin": false,
  "puede_aprobar": false,
  "puede_ver_reportes": false,
  "puede_gestionar_usuarios": false
}
```

**Permisos:** Solo ver su propia información de asistencia.

### 3. SUPERVISOR

```json
{
  "nombre": "SUPERVISOR",
  "descripcion": "Supervisor con acceso a reportes y aprobación",
  "es_admin": false,
  "puede_aprobar": true,
  "puede_ver_reportes": true,
  "puede_gestionar_usuarios": false
}
```

**Permisos:** Aprobar justificaciones y ver reportes de su equipo.

---

## 🔐 Matriz de Permisos

| Permiso                    | ADMIN | SUPERVISOR | COLABORADOR |
| -------------------------- | ----- | ---------- | ----------- |
| Ver propia asistencia      | ✅    | ✅         | ✅          |
| Ver reportes               | ✅    | ✅         | ❌          |
| Aprobar justificaciones    | ✅    | ✅         | ❌          |
| Gestionar usuarios         | ✅    | ❌         | ❌          |
| Crear roles                | ✅    | ❌         | ❌          |
| Crear horarios             | ✅    | ❌         | ❌          |
| Ver estadísticas generales | ✅    | ✅         | ❌          |
| Limpiar notificaciones     | ✅    | ❌         | ❌          |

---

## 💡 Casos de Uso

### Crear Nuevo Rol Personalizado

```
POST /roles/
{
  "nombre": "RECURSOS_HUMANOS",
  "descripcion": "Personal de RH con acceso a gestión de usuarios y reportes",
  "puede_gestionar_usuarios": true,
  "puede_ver_reportes": true
}
```

### Búsqueda de Roles

```
GET /roles/?search=supervisor&activos_solo=true
```

### Obtener Roles para Dropdown

```
GET /roles/activos/listar
```

### Actualizar Permisos de Rol

```
PUT /roles/3
{
  "puede_ver_reportes": true,
  "puede_gestionar_usuarios": true
}
```

### Desactivar Rol

```
DELETE /roles/4
```

---

## 🔐 Notas de Seguridad

- **Solo Administradores:** Crear, actualizar y eliminar roles requiere permisos de administrador.
- **Rol ADMIN:** No puede ser eliminado del sistema (protección).
- **Eliminación Lógica:** Los roles se desactivan en lugar de eliminarse físicamente para mantener auditoría.
- **Validación:** No se puede eliminar un rol si tiene usuarios activos asignados.
- **Nombres Únicos:** Los nombres de roles son únicos en el sistema.
- **Auditoría:** Se registran todas las operaciones en logs.

---

## 📌 Mejores Prácticas

1. **Crear Roles Específicos:** Crea roles según las necesidades de tu organización.
2. **Usar Descripciones Claras:** Documenta qué puede hacer cada rol.
3. **Revisión Regular:** Audita los permisos de los roles regularmente.
4. **Desactivar vs Eliminar:** Desactiva roles en lugar de eliminarlos para mantener histórico.
5. **Nombres Descriptivos:** Usa nombres que claramente indiquen el nivel de permisos.

---

**Última actualización:** 16 de octubre de 2025
