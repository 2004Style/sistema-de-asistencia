# 🔄 Rutas HTTP - Controlador de Turnos

**Prefijo Base:** `/turnos`

---

## 📑 Tabla de Contenidos

1. [POST - Crear Turno](#1-post---crear-turno)
2. [GET - Listar Turnos](#2-get---listar-turnos)
3. [GET - Listar Turnos Activos](#3-get---listar-turnos-activos)
4. [GET - Obtener Turno por ID](#4-get---obtener-turno-por-id)
5. [PUT - Actualizar Turno](#5-put---actualizar-turno)
6. [POST - Activar Turno](#6-post---activar-turno)
7. [DELETE - Eliminar Turno](#7-delete---eliminar-turno)

---

## 1. POST - Crear Turno

### 📌 Información General

- **Ruta:** `/turnos/`
- **Método:** `POST`
- **Descripción:** Crea un nuevo turno de trabajo en el sistema. Los turnos definen los horarios laborales disponibles.
- **Status Code:** `201 Created`
- **Autenticación:** Requerida (Administrador)

### 📤 Body (JSON)

```json
{
  "nombre": "Turno Matutino",
  "descripcion": "Turno de mañana de 08:00 a 16:30",
  "hora_inicio": "08:00",
  "hora_fin": "16:30",
  "activo": true
}
```

### 🔍 Parámetros del Body

| Parámetro     | Tipo           | Obligatorio | Descripción                                |
| ------------- | -------------- | ----------- | ------------------------------------------ |
| `nombre`      | `string`       | ✅ Sí       | Nombre del turno (1-100 caracteres)        |
| `descripcion` | `string`       | ❌ No       | Descripción del turno (máx 255 caracteres) |
| `hora_inicio` | `time` (HH:MM) | ✅ Sí       | Hora de inicio del turno                   |
| `hora_fin`    | `time` (HH:MM) | ✅ Sí       | Hora de fin del turno                      |
| `activo`      | `boolean`      | ❌ No       | Si está activo (default: true)             |

### 📥 Query Parameters

**No aplica**

### ✅ Respuesta Exitosa (HTTP 201)

```json
{
  "id": 1,
  "nombre": "Turno Matutino",
  "descripcion": "Turno de mañana de 08:00 a 16:30",
  "hora_inicio": "08:00:00",
  "hora_fin": "16:30:00",
  "activo": true,
  "duracion_horas": 8.5,
  "es_turno_nocturno": false
}
```

### ❌ Respuestas de Error

| Código | Mensaje                                         | Causa                       |
| ------ | ----------------------------------------------- | --------------------------- |
| `400`  | "El nombre del turno no puede estar vacío"      | Nombre vacío                |
| `400`  | "El nombre debe tener entre 1 y 100 caracteres" | Longitud inválida           |
| `400`  | "Ya existe un turno con este nombre"            | Nombre duplicado            |
| `403`  | "No tiene permisos para crear turnos"           | Usuario no es administrador |
| `422`  | "Validación fallida"                            | Datos inválidos             |
| `500`  | "Error al crear turno: ..."                     | Error interno del servidor  |

---

## 2. GET - Listar Turnos

### 📌 Información General

- **Ruta:** `/turnos/`
- **Método:** `GET`
- **Descripción:** Obtiene una lista paginada de todos los turnos con opciones de búsqueda, filtrado y ordenamiento.
- **Autenticación:** Requerida

### 🔍 Query Parameters

| Parámetro   | Tipo      | Obligatorio | Valores         | Descripción                                     |
| ----------- | --------- | ----------- | --------------- | ----------------------------------------------- |
| `page`      | `integer` | ❌ No       | ≥ 1             | Número de página (default: 1)                   |
| `pageSize`  | `integer` | ❌ No       | 1-100           | Registros por página (default: 10, máximo: 100) |
| `search`    | `string`  | ❌ No       | Cualquier texto | Buscar por nombre o descripción                 |
| `sortBy`    | `string`  | ❌ No       | Nombre de campo | Campo para ordenar (default: "nombre")          |
| `sortOrder` | `string`  | ❌ No       | `asc`, `desc`   | Orden de clasificación (default: "asc")         |

### 📤 Ejemplos de Consulta

**Ejemplo 1: Obtener primera página con 10 turnos**

```
GET /turnos/?page=1&pageSize=10
```

**Ejemplo 2: Buscar turnos por nombre**

```
GET /turnos/?page=1&pageSize=10&search=Matutino
```

**Ejemplo 3: Obtener turnos ordenados por descripción (descendente)**

```
GET /turnos/?page=1&pageSize=10&sortBy=descripcion&sortOrder=desc
```

**Ejemplo 4: Buscar y paginar resultados**

```
GET /turnos/?page=2&pageSize=5&search=turno
```

**Ejemplo 5: Combinación completa**

```
GET /turnos/?page=1&pageSize=20&search=Nocturno&sortBy=nombre&sortOrder=asc
```

### ✅ Respuesta Exitosa (HTTP 200)

```json
{
  "data": {
    "records": [
      {
        "id": 1,
        "nombre": "Turno Matutino",
        "descripcion": "Turno de mañana de 08:00 a 16:30",
        "hora_inicio": "08:00:00",
        "hora_fin": "16:30:00",
        "activo": true,
        "duracion_horas": 8.5,
        "es_turno_nocturno": false
      },
      {
        "id": 2,
        "nombre": "Turno Vespertino",
        "descripcion": "Turno de tarde de 16:00 a 00:00",
        "hora_inicio": "16:00:00",
        "hora_fin": "00:00:00",
        "activo": true,
        "duracion_horas": 8.0,
        "es_turno_nocturno": true
      },
      {
        "id": 3,
        "nombre": "Turno Nocturno",
        "descripcion": "Turno de noche de 22:00 a 06:00",
        "hora_inicio": "22:00:00",
        "hora_fin": "06:00:00",
        "activo": true,
        "duracion_horas": 8.0,
        "es_turno_nocturno": true
      }
    ],
    "totalRecords": 3,
    "totalPages": 1,
    "currentPage": 1
  },
  "message": "Turnos obtenidos exitosamente"
}
```

### ❌ Respuestas de Error

| Código | Mensaje                             | Causa                      |
| ------ | ----------------------------------- | -------------------------- |
| `400`  | "pageSize no puede ser mayor a 100" | Tamaño de página excesivo  |
| `400`  | "page debe ser mayor o igual a 1"   | Número de página inválido  |
| `401`  | "Usuario no autenticado"            | No hay sesión activa       |
| `500`  | "Error al listar turnos: ..."       | Error interno del servidor |

---

## 3. GET - Listar Turnos Activos

### 📌 Información General

- **Ruta:** `/turnos/activos`
- **Método:** `GET`
- **Descripción:** Obtiene una lista paginada de solo los turnos activos con opciones de búsqueda y ordenamiento. Útil para dropdowns y selects al crear horarios.
- **Autenticación:** Requerida

### 🔍 Query Parameters

| Parámetro   | Tipo      | Obligatorio | Valores         | Descripción                                     |
| ----------- | --------- | ----------- | --------------- | ----------------------------------------------- |
| `page`      | `integer` | ❌ No       | ≥ 1             | Número de página (default: 1)                   |
| `pageSize`  | `integer` | ❌ No       | 1-100           | Registros por página (default: 10, máximo: 100) |
| `search`    | `string`  | ❌ No       | Cualquier texto | Buscar por nombre o descripción                 |
| `sortBy`    | `string`  | ❌ No       | Nombre de campo | Campo para ordenar (default: "nombre")          |
| `sortOrder` | `string`  | ❌ No       | `asc`, `desc`   | Orden de clasificación (default: "asc")         |

### 📤 Ejemplos de Consulta

**Ejemplo 1: Obtener primer página de turnos activos**

```
GET /turnos/activos?page=1&pageSize=10
```

**Ejemplo 2: Buscar turnos activos específicos**

```
GET /turnos/activos?page=1&pageSize=10&search=Nocturno
```

**Ejemplo 3: Obtener turnos activos ordenados descendentemente**

```
GET /turnos/activos?page=1&pageSize=10&sortBy=nombre&sortOrder=desc
```

**Ejemplo 4: Combinación completa**

```
GET /turnos/activos?page=1&pageSize=20&search=turno&sortBy=descripcion&sortOrder=asc
```

### ✅ Respuesta Exitosa (HTTP 200)

```json
{
  "data": {
    "records": [
      {
        "id": 1,
        "nombre": "Turno Matutino",
        "descripcion": "Turno de mañana de 08:00 a 16:30",
        "hora_inicio": "08:00:00",
        "hora_fin": "16:30:00",
        "activo": true,
        "duracion_horas": 8.5,
        "es_turno_nocturno": false
      },
      {
        "id": 2,
        "nombre": "Turno Vespertino",
        "descripcion": "Turno de tarde de 16:00 a 00:00",
        "hora_inicio": "16:00:00",
        "hora_fin": "00:00:00",
        "activo": true,
        "duracion_horas": 8.0,
        "es_turno_nocturno": true
      },
      {
        "id": 3,
        "nombre": "Turno Nocturno",
        "descripcion": "Turno de noche de 22:00 a 06:00",
        "hora_inicio": "22:00:00",
        "hora_fin": "06:00:00",
        "activo": true,
        "duracion_horas": 8.0,
        "es_turno_nocturno": true
      }
    ],
    "totalRecords": 3,
    "totalPages": 1,
    "currentPage": 1
  },
  "message": "Turnos activos obtenidos exitosamente"
}
```

### ❌ Respuestas de Error

| Código | Mensaje                               | Causa                      |
| ------ | ------------------------------------- | -------------------------- |
| `400`  | "pageSize no puede ser mayor a 100"   | Tamaño de página excesivo  |
| `400`  | "page debe ser mayor o igual a 1"     | Número de página inválido  |
| `401`  | "Usuario no autenticado"              | No hay sesión activa       |
| `500`  | "Error al listar turnos activos: ..." | Error interno del servidor |

---

## 4. GET - Obtener Turno por ID

### 📌 Información General

- **Ruta:** `/turnos/{turno_id}`
- **Método:** `GET`
- **Descripción:** Obtiene los detalles de un turno específico por su ID.
- **Autenticación:** Requerida

### 🔗 Parámetro de Ruta

| Parámetro  | Tipo      | Obligatorio | Descripción  |
| ---------- | --------- | ----------- | ------------ |
| `turno_id` | `integer` | ✅ Sí       | ID del turno |

### 🔍 Query Parameters

**No aplica**

### 📤 Ejemplo de Consulta

```
GET /turnos/1
```

### ✅ Respuesta Exitosa (HTTP 200)

```json
{
  "id": 1,
  "nombre": "Turno Matutino",
  "descripcion": "Turno de mañana de 08:00 a 16:30",
  "hora_inicio": "08:00:00",
  "hora_fin": "16:30:00",
  "activo": true,
  "duracion_horas": 8.5,
  "es_turno_nocturno": false
}
```

### ❌ Respuestas de Error

| Código | Mensaje                       | Causa                      |
| ------ | ----------------------------- | -------------------------- |
| `404`  | "Turno no encontrado"         | El turno_id no existe      |
| `401`  | "Usuario no autenticado"      | No hay sesión activa       |
| `500`  | "Error al obtener turno: ..." | Error interno del servidor |

---

## 5. PUT - Actualizar Turno

### 📌 Información General

- **Ruta:** `/turnos/{turno_id}`
- **Método:** `PUT`
- **Descripción:** Actualiza los datos de un turno existente. Solo se actualizan los campos enviados.
- **Autenticación:** Requerida (Administrador)

### 🔗 Parámetro de Ruta

| Parámetro  | Tipo      | Obligatorio | Descripción               |
| ---------- | --------- | ----------- | ------------------------- |
| `turno_id` | `integer` | ✅ Sí       | ID del turno a actualizar |

### 📤 Body (JSON)

```json
{
  "descripcion": "Turno de mañana actualizado de 08:00 a 17:00",
  "hora_fin": "17:00",
  "activo": true
}
```

### 🔍 Parámetros del Body

| Parámetro     | Tipo           | Obligatorio | Descripción                               |
| ------------- | -------------- | ----------- | ----------------------------------------- |
| `nombre`      | `string`       | ❌ No       | Nuevo nombre del turno (1-100 caracteres) |
| `descripcion` | `string`       | ❌ No       | Nueva descripción (máx 255 caracteres)    |
| `hora_inicio` | `time` (HH:MM) | ❌ No       | Nueva hora de inicio                      |
| `hora_fin`    | `time` (HH:MM) | ❌ No       | Nueva hora de fin                         |
| `activo`      | `boolean`      | ❌ No       | Nuevo estado activo                       |

### 📥 Query Parameters

**No aplica**

### ✅ Respuesta Exitosa (HTTP 200)

```json
{
  "id": 1,
  "nombre": "Turno Matutino",
  "descripcion": "Turno de mañana actualizado de 08:00 a 17:00",
  "hora_inicio": "08:00:00",
  "hora_fin": "17:00:00",
  "activo": true,
  "duracion_horas": 9.0,
  "es_turno_nocturno": false
}
```

### ❌ Respuestas de Error

| Código | Mensaje                                    | Causa                       |
| ------ | ------------------------------------------ | --------------------------- |
| `404`  | "Turno no encontrado"                      | El turno_id no existe       |
| `400`  | "El nombre del turno no puede estar vacío" | Nombre vacío                |
| `400`  | "Ya existe un turno con este nombre"       | Nombre duplicado            |
| `403`  | "No tiene permisos para actualizar turnos" | Usuario no es administrador |
| `401`  | "Usuario no autenticado"                   | No hay sesión activa        |
| `422`  | "Validación fallida"                       | Datos inválidos             |
| `500`  | "Error al actualizar turno: ..."           | Error interno del servidor  |

---

## 6. POST - Activar Turno

### 📌 Información General

- **Ruta:** `/turnos/{turno_id}/activar`
- **Método:** `POST`
- **Descripción:** Reactivar un turno que fue previamente desactivado.
- **Status Code:** `200 OK`
- **Autenticación:** Requerida (Administrador)

### 🔗 Parámetro de Ruta

| Parámetro  | Tipo      | Obligatorio | Descripción            |
| ---------- | --------- | ----------- | ---------------------- |
| `turno_id` | `integer` | ✅ Sí       | ID del turno a activar |

### 📥 Query Parameters

**No aplica**

### 📤 Ejemplo de Consulta

```
POST /turnos/3/activar
```

### ✅ Respuesta Exitosa (HTTP 200)

```json
{
  "id": 3,
  "nombre": "Turno Nocturno",
  "descripcion": "Turno de noche de 22:00 a 06:00",
  "hora_inicio": "22:00:00",
  "hora_fin": "06:00:00",
  "activo": true,
  "duracion_horas": 8.0,
  "es_turno_nocturno": true
}
```

### ❌ Respuestas de Error

| Código | Mensaje                                 | Causa                       |
| ------ | --------------------------------------- | --------------------------- |
| `404`  | "Turno no encontrado"                   | El turno_id no existe       |
| `400`  | "El turno ya está activo"               | El turno ya estaba activado |
| `403`  | "No tiene permisos para activar turnos" | Usuario no es administrador |
| `401`  | "Usuario no autenticado"                | No hay sesión activa        |
| `500`  | "Error al activar turno: ..."           | Error interno del servidor  |

---

## 7. DELETE - Eliminar Turno

### 📌 Información General

- **Ruta:** `/turnos/{turno_id}`
- **Método:** `DELETE`
- **Descripción:** Desactiva un turno (soft delete). No se elimina físicamente, solo se marca como inactivo. No se puede eliminar si tiene horarios activos asociados.
- **Status Code:** `204 No Content`
- **Autenticación:** Requerida (Administrador)

### 🔗 Parámetro de Ruta

| Parámetro  | Tipo      | Obligatorio | Descripción             |
| ---------- | --------- | ----------- | ----------------------- |
| `turno_id` | `integer` | ✅ Sí       | ID del turno a eliminar |

### 🔍 Query Parameters

**No aplica**

### 📤 Ejemplo de Consulta

```
DELETE /turnos/3
```

### ✅ Respuesta Exitosa (HTTP 204)

```
(Sin contenido)
```

### ❌ Respuestas de Error

| Código | Mensaje                                     | Causa                                   |
| ------ | ------------------------------------------- | --------------------------------------- |
| `404`  | "Turno no encontrado"                       | El turno_id no existe                   |
| `400`  | "El turno tiene horarios activos asociados" | No se puede eliminar turno con horarios |
| `403`  | "No tiene permisos para eliminar turnos"    | Usuario no es administrador             |
| `401`  | "Usuario no autenticado"                    | No hay sesión activa                    |
| `500`  | "Error al eliminar turno: ..."              | Error interno del servidor              |

---

## 📊 Resumen de Rutas

| Método   | Ruta                         | Descripción          | Auth     |
| -------- | ---------------------------- | -------------------- | -------- |
| `POST`   | `/turnos/`                   | Crea un turno        | Admin ✅ |
| `GET`    | `/turnos/`                   | Lista turnos         | ✅       |
| `GET`    | `/turnos/activos`            | Lista turnos activos | ✅       |
| `GET`    | `/turnos/{turno_id}`         | Obtiene un turno     | ✅       |
| `PUT`    | `/turnos/{turno_id}`         | Actualiza un turno   | Admin ✅ |
| `POST`   | `/turnos/{turno_id}/activar` | Activa un turno      | Admin ✅ |
| `DELETE` | `/turnos/{turno_id}`         | Elimina un turno     | Admin ✅ |

---

## 📋 Turnos Predefinidos del Sistema

### 1. Turno Matutino

```json
{
  "nombre": "Turno Matutino",
  "descripcion": "Turno de mañana",
  "hora_inicio": "08:00",
  "hora_fin": "16:30"
}
```

**Duración:** 8.5 horas | **Nocturno:** No

### 2. Turno Vespertino

```json
{
  "nombre": "Turno Vespertino",
  "descripcion": "Turno de tarde",
  "hora_inicio": "13:00",
  "hora_fin": "21:30"
}
```

**Duración:** 8.5 horas | **Nocturno:** No

### 3. Turno Nocturno

```json
{
  "nombre": "Turno Nocturno",
  "descripcion": "Turno de noche",
  "hora_inicio": "22:00",
  "hora_fin": "06:00"
}
```

**Duración:** 8.0 horas | **Nocturno:** Sí (cruza medianoche)

---

## 🔍 Campos Calculados

### `duracion_horas`

Se calcula automáticamente a partir de `hora_inicio` y `hora_fin`. Para turnos nocturnos, suma 24 horas a `hora_fin` antes de calcular.

**Ejemplo:**

- Turno Matutino: 08:00 a 16:30 = 8.5 horas
- Turno Nocturno: 22:00 a 06:00 = 8.0 horas (22:00 a 30:00)

### `es_turno_nocturno`

Se marca como `true` si `hora_fin` ≤ `hora_inicio`, indicando que el turno cruza medianoche.

---

## 💡 Casos de Uso

### Crear Nuevo Turno

```
POST /turnos/
{
  "nombre": "Turno Flexible",
  "descripcion": "Horario flexible de 10:00 a 18:00",
  "hora_inicio": "10:00",
  "hora_fin": "18:00"
}
```

### Obtener Turnos Activos para Dropdown

```
GET /turnos/activos?page=1&pageSize=100
```

### Buscar Turnos por Nombre

```
GET /turnos/?page=1&pageSize=10&search=Matutino
```

### Obtener Turnos Ordenados

```
GET /turnos/?page=1&pageSize=10&sortBy=nombre&sortOrder=asc
```

### Paginar Resultados de Búsqueda

```
GET /turnos/?page=2&pageSize=5&search=turno
```

### Actualizar Horario del Turno

```
PUT /turnos/1
{
  "hora_inicio": "08:30",
  "hora_fin": "17:00"
}
```

### Desactivar Turno Innecesario

```
DELETE /turnos/5
```

### Reactivar Turno Desactivado

```
POST /turnos/5/activar
```

---

## 🔐 Notas de Seguridad

- **Solo Administradores:** Crear, actualizar y eliminar turnos requiere permisos de administrador.
- **Eliminación Lógica:** Los turnos se desactivan en lugar de eliminarse físicamente para mantener auditoría.
- **Validación:** No se puede eliminar un turno si tiene horarios activos asociados.
- **Nombres Únicos:** Los nombres de turnos son únicos en el sistema.
- **Auditoría:** Se registran todas las operaciones en logs.
- **Turnos Nocturnos:** El sistema detecta automáticamente si un turno cruza medianoche.

---

## 📌 Campos de Respuesta Explicados

| Campo               | Tipo    | Descripción                                   |
| ------------------- | ------- | --------------------------------------------- |
| `id`                | integer | Identificador único del turno                 |
| `nombre`            | string  | Nombre del turno (ej: "Turno Matutino")       |
| `descripcion`       | string  | Descripción opcional del turno                |
| `hora_inicio`       | time    | Hora de inicio del turno (HH:MM:SS)           |
| `hora_fin`          | time    | Hora de fin del turno (HH:MM:SS)              |
| `activo`            | boolean | Si el turno está activo/disponible            |
| `duracion_horas`    | float   | Duración total del turno en horas (calculado) |
| `es_turno_nocturno` | boolean | Si el turno cruza medianoche (calculado)      |

---

## 📊 Información de Turnos Nocturnos

Para turnos que cruzan medianoche (ej: 22:00 a 06:00):

- El sistema suma 24 horas a la hora de fin para cálculos
- `duracion_horas` = 30:00 - 22:00 = 8 horas
- `es_turno_nocturno` = true
- Son válidos en sistemas de 24 horas

---

**Última actualización:** 16 de octubre de 2025
