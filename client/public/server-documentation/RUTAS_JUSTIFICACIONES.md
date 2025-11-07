# ✅ Rutas HTTP - Controlador de Justificaciones

**Prefijo Base:** `/justificaciones`

---

## 📑 Tabla de Contenidos

1. [POST - Crear Justificación](#1-post---crear-justificación)
2. [GET - Listar Justificaciones](#2-get---listar-justificaciones)
3. [GET - Obtener Justificación por ID](#3-get---obtener-justificación-por-id)
4. [GET - Obtener Justificaciones por Usuario](#4-get---obtener-justificaciones-por-usuario)
5. [GET - Obtener Justificaciones Pendientes](#5-get---obtener-justificaciones-pendientes)
6. [GET - Obtener Justificaciones Pendientes por Usuario](#6-get---obtener-justificaciones-pendientes-por-usuario)
7. [PUT - Actualizar Justificación](#7-put---actualizar-justificación)
8. [POST - Aprobar Justificación](#8-post---aprobar-justificación)
9. [POST - Rechazar Justificación](#9-post---rechazar-justificación)
10. [DELETE - Eliminar Justificación](#10-delete---eliminar-justificación)
11. [GET - Obtener Estadísticas](#11-get---obtener-estadísticas)

---

## 1. POST - Crear Justificación

### 📌 Información General

- **Ruta:** `/justificaciones`
- **Método:** `POST`
- **Descripción:** Crea una nueva justificación de ausencia o tardanza. La justificación se crea en estado PENDIENTE y debe ser revisada por un administrador.
- **Status Code:** `201 Created`
- **Autenticación:** Requerida

### 📤 Body (JSON)

```json
{
  "user_id": 1,
  "fecha_inicio": "2025-10-16",
  "fecha_fin": "2025-10-18",
  "tipo": "medica",
  "motivo": "Gripe fuerte con fiebre. Adjunto certificado médico.",
  "documento_url": "https://example.com/certificados/cert_123.pdf"
}
```

### 🔍 Parámetros del Body

| Parámetro       | Tipo                | Obligatorio | Descripción                                                                                                 |
| --------------- | ------------------- | ----------- | ----------------------------------------------------------------------------------------------------------- |
| `user_id`       | `integer`           | ✅ Sí       | ID del usuario que crea la justificación                                                                    |
| `fecha_inicio`  | `date` (YYYY-MM-DD) | ✅ Sí       | Fecha de inicio de la justificación                                                                         |
| `fecha_fin`     | `date` (YYYY-MM-DD) | ✅ Sí       | Fecha de fin (debe ser ≥ fecha_inicio)                                                                      |
| `tipo`          | `string`            | ✅ Sí       | Tipo: `medica`, `personal`, `familiar`, `academica`, `permiso_autorizado`, `vacaciones`, `licencia`, `otro` |
| `motivo`        | `string`            | ✅ Sí       | Motivo detallado (10-1000 caracteres)                                                                       |
| `documento_url` | `string`            | ❌ No       | URL del documento adjunto (certificado, etc.)                                                               |

### 📥 Query Parameters

**No aplica**

### ✅ Respuesta Exitosa (HTTP 201)

```json
{
  "data": {
    "id": 15,
    "user_id": 1,
    "fecha_inicio": "2025-10-16",
    "fecha_fin": "2025-10-18",
    "tipo": "medica",
    "motivo": "Gripe fuerte con fiebre. Adjunto certificado médico.",
    "documento_url": "https://example.com/certificados/cert_123.pdf",
    "estado": "PENDIENTE",
    "fecha_revision": null,
    "aprobado_por": null,
    "comentario_revisor": null,
    "dias_justificados": 3,
    "esta_aprobada": false,
    "esta_pendiente": true,
    "created_at": "2025-10-16T10:30:45.123456",
    "updated_at": null,
    "usuario_nombre": "Juan Pérez",
    "usuario_email": "juan.perez@empresa.com",
    "revisor_nombre": null
  },
  "message": "Justificación creada exitosamente. Está pendiente de revisión."
}
```

### ❌ Respuestas de Error

| Código | Mensaje                                                      | Causa                      |
| ------ | ------------------------------------------------------------ | -------------------------- |
| `404`  | "Usuario no encontrado"                                      | El user_id no existe       |
| `400`  | "La fecha de fin no puede ser anterior a la fecha de inicio" | Fechas inválidas           |
| `400`  | "Motivo debe tener al menos 10 caracteres"                   | Motivo muy corto           |
| `422`  | "Tipo de justificación inválido"                             | Tipo no válido             |
| `500`  | "Error al crear justificación: ..."                          | Error interno del servidor |

---

## 2. GET - Listar Justificaciones

### 📌 Información General

- **Ruta:** `/justificaciones`
- **Método:** `GET`
- **Descripción:** Obtiene una lista paginada de justificaciones con múltiples filtros opcionales.
- **Autenticación:** Requerida

### 🔍 Query Parameters

| Parámetro     | Tipo                | Obligatorio | Valores                                                                                               | Descripción                                 |
| ------------- | ------------------- | ----------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `page`        | `integer`           | ❌ No       | ≥ 1                                                                                                   | Número de página (default: 1)               |
| `page_size`   | `integer`           | ❌ No       | 1-100                                                                                                 | Tamaño de página (default: 10, máximo: 100) |
| `user_id`     | `integer`           | ❌ No       | -                                                                                                     | Filtrar por ID de usuario                   |
| `estado`      | `string`            | ❌ No       | `PENDIENTE`, `APROBADA`, `RECHAZADA`                                                                  | Filtrar por estado                          |
| `tipo`        | `string`            | ❌ No       | `medica`, `personal`, `familiar`, `academica`, `permiso_autorizado`, `vacaciones`, `licencia`, `otro` | Filtrar por tipo                            |
| `fecha_desde` | `date` (YYYY-MM-DD) | ❌ No       | -                                                                                                     | Filtrar desde fecha                         |
| `fecha_hasta` | `date` (YYYY-MM-DD) | ❌ No       | -                                                                                                     | Filtrar hasta fecha                         |

### 📤 Ejemplos de Consulta

**Ejemplo 1: Obtener primera página**

```
GET /justificaciones?page=1&page_size=10
```

**Ejemplo 2: Obtener justificaciones pendientes**

```
GET /justificaciones?estado=PENDIENTE&page=1&page_size=15
```

**Ejemplo 3: Obtener justificaciones médicas de un usuario**

```
GET /justificaciones?user_id=1&tipo=medica&page=1&page_size=10
```

**Ejemplo 4: Obtener justificaciones de un período**

```
GET /justificaciones?fecha_desde=2025-10-01&fecha_hasta=2025-10-31&page=1&page_size=20
```

### ✅ Respuesta Exitosa (HTTP 200)

```json
{
  "data": {
    "records": [
      {
        "id": 15,
        "user_id": 1,
        "fecha_inicio": "2025-10-16",
        "fecha_fin": "2025-10-18",
        "tipo": "medica",
        "motivo": "Gripe fuerte con fiebre. Adjunto certificado médico.",
        "documento_url": "https://example.com/certificados/cert_123.pdf",
        "estado": "PENDIENTE",
        "fecha_revision": null,
        "aprobado_por": null,
        "comentario_revisor": null,
        "dias_justificados": 3,
        "esta_aprobada": false,
        "esta_pendiente": true,
        "created_at": "2025-10-16T10:30:45.123456",
        "updated_at": null,
        "usuario_nombre": "Juan Pérez",
        "usuario_email": "juan.perez@empresa.com",
        "revisor_nombre": null
      },
      {
        "id": 14,
        "user_id": 2,
        "fecha_inicio": "2025-10-15",
        "fecha_fin": "2025-10-15",
        "tipo": "personal",
        "motivo": "Trámites personales urgentes que no pueden esperar.",
        "documento_url": null,
        "estado": "APROBADA",
        "fecha_revision": "2025-10-15T15:00:00",
        "aprobado_por": 5,
        "comentario_revisor": "Aprobado por circunstancias especiales.",
        "dias_justificados": 1,
        "esta_aprobada": true,
        "esta_pendiente": false,
        "created_at": "2025-10-15T08:00:00",
        "updated_at": "2025-10-15T15:00:00",
        "usuario_nombre": "María García",
        "usuario_email": "maria.garcia@empresa.com",
        "revisor_nombre": "Carlos López"
      }
    ],
    "totalRecords": 45,
    "totalPages": 5,
    "currentPage": 1
  },
  "message": "Justificaciones obtenidas exitosamente"
}
```

### ❌ Respuestas de Error

| Código | Mensaje                                 | Causa                      |
| ------ | --------------------------------------- | -------------------------- |
| `400`  | "page_size no puede ser mayor a 100"    | Tamaño de página excesivo  |
| `400`  | "Estado inválido"                       | Estado no válido           |
| `400`  | "Tipo inválido"                         | Tipo no válido             |
| `404`  | "Usuario no encontrado"                 | El user_id no existe       |
| `500`  | "Error al obtener justificaciones: ..." | Error interno del servidor |

---

## 3. GET - Obtener Justificación por ID

### 📌 Información General

- **Ruta:** `/justificaciones/{justificacion_id}`
- **Método:** `GET`
- **Descripción:** Obtiene los detalles de una justificación específica por su ID.
- **Autenticación:** Requerida

### 🔗 Parámetro de Ruta

| Parámetro          | Tipo      | Obligatorio | Descripción            |
| ------------------ | --------- | ----------- | ---------------------- |
| `justificacion_id` | `integer` | ✅ Sí       | ID de la justificación |

### 🔍 Query Parameters

**No aplica**

### 📤 Ejemplo de Consulta

```
GET /justificaciones/15
```

### ✅ Respuesta Exitosa (HTTP 200)

```json
{
  "data": {
    "id": 15,
    "user_id": 1,
    "fecha_inicio": "2025-10-16",
    "fecha_fin": "2025-10-18",
    "tipo": "medica",
    "motivo": "Gripe fuerte con fiebre. Adjunto certificado médico.",
    "documento_url": "https://example.com/certificados/cert_123.pdf",
    "estado": "PENDIENTE",
    "fecha_revision": null,
    "aprobado_por": null,
    "comentario_revisor": null,
    "dias_justificados": 3,
    "esta_aprobada": false,
    "esta_pendiente": true,
    "created_at": "2025-10-16T10:30:45.123456",
    "updated_at": null,
    "usuario_nombre": "Juan Pérez",
    "usuario_email": "juan.perez@empresa.com",
    "revisor_nombre": null
  },
  "message": "Justificación obtenida exitosamente"
}
```

### ❌ Respuestas de Error

| Código | Mensaje                               | Causa                         |
| ------ | ------------------------------------- | ----------------------------- |
| `404`  | "Justificación no encontrada"         | El justificacion_id no existe |
| `500`  | "Error al obtener justificación: ..." | Error interno del servidor    |

---

## 4. GET - Obtener Justificaciones por Usuario

### 📌 Información General

- **Ruta:** `/justificaciones/usuario/{user_id}`
- **Método:** `GET`
- **Descripción:** Obtiene todas las justificaciones de un usuario específico.
- **Autenticación:** Requerida

### 🔗 Parámetro de Ruta

| Parámetro | Tipo      | Obligatorio | Descripción    |
| --------- | --------- | ----------- | -------------- |
| `user_id` | `integer` | ✅ Sí       | ID del usuario |

### 🔍 Query Parameters

**No aplica**

### 📤 Ejemplo de Consulta

```
GET /justificaciones/usuario/1
```

### ✅ Respuesta Exitosa (HTTP 200)

```json
{
  "data": {
    "records": [
      {
        "id": 15,
        "user_id": 1,
        "fecha_inicio": "2025-10-16",
        "fecha_fin": "2025-10-18",
        "tipo": "medica",
        "motivo": "Gripe fuerte con fiebre. Adjunto certificado médico.",
        "documento_url": "https://example.com/certificados/cert_123.pdf",
        "estado": "PENDIENTE",
        "fecha_revision": null,
        "aprobado_por": null,
        "comentario_revisor": null,
        "dias_justificados": 3,
        "esta_aprobada": false,
        "esta_pendiente": true,
        "created_at": "2025-10-16T10:30:45.123456",
        "updated_at": null,
        "usuario_nombre": "Juan Pérez",
        "usuario_email": "juan.perez@empresa.com",
        "revisor_nombre": null
      },
      {
        "id": 10,
        "user_id": 1,
        "fecha_inicio": "2025-09-15",
        "fecha_fin": "2025-09-16",
        "tipo": "personal",
        "motivo": "Cita médica importante con especialista.",
        "documento_url": null,
        "estado": "APROBADA",
        "fecha_revision": "2025-09-14T16:00:00",
        "aprobado_por": 5,
        "comentario_revisor": "Aprobado. Cita con especialista.",
        "dias_justificados": 2,
        "esta_aprobada": true,
        "esta_pendiente": false,
        "created_at": "2025-09-14T08:00:00",
        "updated_at": "2025-09-14T16:00:00",
        "usuario_nombre": "Juan Pérez",
        "usuario_email": "juan.perez@empresa.com",
        "revisor_nombre": "Carlos López"
      }
    ],
    "totalRecords": 2,
    "totalPages": 1,
    "currentPage": 1
  },
  "message": "Justificaciones del usuario 1 obtenidas exitosamente"
}
```

### ❌ Respuestas de Error

| Código | Mensaje                                 | Causa                      |
| ------ | --------------------------------------- | -------------------------- |
| `404`  | "Usuario no encontrado"                 | El user_id no existe       |
| `500`  | "Error al obtener justificaciones: ..." | Error interno del servidor |

---

## 5. GET - Obtener Justificaciones Pendientes

### 📌 Información General

- **Ruta:** `/justificaciones/pendientes/todas`
- **Método:** `GET`
- **Descripción:** Obtiene todas las justificaciones pendientes de revisión. Típicamente usado por administradores o supervisores.
- **Autenticación:** Requerida (Administrador)

### 🔍 Query Parameters

**No aplica**

### 📤 Ejemplo de Consulta

```
GET /justificaciones/pendientes/todas
```

### ✅ Respuesta Exitosa (HTTP 200)

```json
{
  "data": {
    "records": [
      {
        "id": 15,
        "user_id": 1,
        "fecha_inicio": "2025-10-16",
        "fecha_fin": "2025-10-18",
        "tipo": "medica",
        "motivo": "Gripe fuerte con fiebre. Adjunto certificado médico.",
        "documento_url": "https://example.com/certificados/cert_123.pdf",
        "estado": "PENDIENTE",
        "fecha_revision": null,
        "aprobado_por": null,
        "comentario_revisor": null,
        "dias_justificados": 3,
        "esta_aprobada": false,
        "esta_pendiente": true,
        "created_at": "2025-10-16T10:30:45.123456",
        "updated_at": null,
        "usuario_nombre": "Juan Pérez",
        "usuario_email": "juan.perez@empresa.com",
        "revisor_nombre": null
      }
    ],
    "totalRecords": 1,
    "totalPages": 1,
    "currentPage": 1
  },
  "message": "Justificaciones pendientes obtenidas exitosamente"
}
```

### ❌ Respuestas de Error

| Código | Mensaje                                                      | Causa                      |
| ------ | ------------------------------------------------------------ | -------------------------- |
| `403`  | "Solo administradores pueden ver justificaciones pendientes" | Permisos insuficientes     |
| `500`  | "Error al obtener justificaciones: ..."                      | Error interno del servidor |

---

## 6. GET - Obtener Justificaciones Pendientes por Usuario

### 📌 Información General

- **Ruta:** `/justificaciones/pendientes/usuario/{user_id}`
- **Método:** `GET`
- **Descripción:** Obtiene las justificaciones pendientes de revisión de un usuario específico.
- **Autenticación:** Requerida

### 🔗 Parámetro de Ruta

| Parámetro | Tipo      | Obligatorio | Descripción    |
| --------- | --------- | ----------- | -------------- |
| `user_id` | `integer` | ✅ Sí       | ID del usuario |

### 🔍 Query Parameters

**No aplica**

### 📤 Ejemplo de Consulta

```
GET /justificaciones/pendientes/usuario/1
```

### ✅ Respuesta Exitosa (HTTP 200)

```json
{
  "data": {
    "records": [
      {
        "id": 15,
        "user_id": 1,
        "fecha_inicio": "2025-10-16",
        "fecha_fin": "2025-10-18",
        "tipo": "medica",
        "motivo": "Gripe fuerte con fiebre. Adjunto certificado médico.",
        "documento_url": "https://example.com/certificados/cert_123.pdf",
        "estado": "PENDIENTE",
        "fecha_revision": null,
        "aprobado_por": null,
        "comentario_revisor": null,
        "dias_justificados": 3,
        "esta_aprobada": false,
        "esta_pendiente": true,
        "created_at": "2025-10-16T10:30:45.123456",
        "updated_at": null,
        "usuario_nombre": "Juan Pérez",
        "usuario_email": "juan.perez@empresa.com",
        "revisor_nombre": null
      }
    ],
    "totalRecords": 1,
    "totalPages": 1,
    "currentPage": 1
  },
  "message": "Justificaciones pendientes del usuario 1 obtenidas exitosamente"
}
```

### ❌ Respuestas de Error

| Código | Mensaje                                 | Causa                      |
| ------ | --------------------------------------- | -------------------------- |
| `404`  | "Usuario no encontrado"                 | El user_id no existe       |
| `500`  | "Error al obtener justificaciones: ..." | Error interno del servidor |

---

## 7. PUT - Actualizar Justificación

### 📌 Información General

- **Ruta:** `/justificaciones/{justificacion_id}`
- **Método:** `PUT`
- **Descripción:** Actualiza los datos de una justificación. Solo se pueden actualizar justificaciones en estado PENDIENTE.
- **Autenticación:** Requerida

### 🔗 Parámetro de Ruta

| Parámetro          | Tipo      | Obligatorio | Descripción                         |
| ------------------ | --------- | ----------- | ----------------------------------- |
| `justificacion_id` | `integer` | ✅ Sí       | ID de la justificación a actualizar |

### 📤 Body (JSON)

```json
{
  "fecha_inicio": "2025-10-16",
  "fecha_fin": "2025-10-19",
  "tipo": "medica",
  "motivo": "Gripe fuerte con fiebre y dolor de garganta. Adjunto certificado médico actualizado.",
  "documento_url": "https://example.com/certificados/cert_123_v2.pdf"
}
```

### 🔍 Parámetros del Body

| Parámetro       | Tipo                | Obligatorio | Descripción                       |
| --------------- | ------------------- | ----------- | --------------------------------- |
| `fecha_inicio`  | `date` (YYYY-MM-DD) | ❌ No       | Nueva fecha de inicio             |
| `fecha_fin`     | `date` (YYYY-MM-DD) | ❌ No       | Nueva fecha de fin                |
| `tipo`          | `string`            | ❌ No       | Nuevo tipo de justificación       |
| `motivo`        | `string`            | ❌ No       | Nuevo motivo (10-1000 caracteres) |
| `documento_url` | `string`            | ❌ No       | Nueva URL del documento           |

### 📥 Query Parameters

**No aplica**

### ✅ Respuesta Exitosa (HTTP 200)

```json
{
  "data": {
    "id": 15,
    "user_id": 1,
    "fecha_inicio": "2025-10-16",
    "fecha_fin": "2025-10-19",
    "tipo": "medica",
    "motivo": "Gripe fuerte con fiebre y dolor de garganta. Adjunto certificado médico actualizado.",
    "documento_url": "https://example.com/certificados/cert_123_v2.pdf",
    "estado": "PENDIENTE",
    "fecha_revision": null,
    "aprobado_por": null,
    "comentario_revisor": null,
    "dias_justificados": 4,
    "esta_aprobada": false,
    "esta_pendiente": true,
    "created_at": "2025-10-16T10:30:45.123456",
    "updated_at": "2025-10-16T11:15:30.654321",
    "usuario_nombre": "Juan Pérez",
    "usuario_email": "juan.perez@empresa.com",
    "revisor_nombre": null
  },
  "message": "Justificación actualizada exitosamente"
}
```

### ❌ Respuestas de Error

| Código | Mensaje                                                          | Causa                         |
| ------ | ---------------------------------------------------------------- | ----------------------------- |
| `404`  | "Justificación no encontrada"                                    | El justificacion_id no existe |
| `400`  | "No se puede actualizar una justificación que no está pendiente" | Estado no es PENDIENTE        |
| `400`  | "La fecha de fin no puede ser anterior a la fecha de inicio"     | Fechas inválidas              |
| `400`  | "Motivo debe tener al menos 10 caracteres"                       | Motivo muy corto              |
| `500`  | "Error al actualizar justificación: ..."                         | Error interno del servidor    |

---

## 8. POST - Aprobar Justificación

### 📌 Información General

- **Ruta:** `/justificaciones/{justificacion_id}/aprobar`
- **Método:** `POST`
- **Descripción:** Aprueba una justificación pendiente. Solo administradores pueden aprobar.
- **Status Code:** `200 OK`
- **Autenticación:** Requerida (Administrador)

### 🔗 Parámetro de Ruta

| Parámetro          | Tipo      | Obligatorio | Descripción                      |
| ------------------ | --------- | ----------- | -------------------------------- |
| `justificacion_id` | `integer` | ✅ Sí       | ID de la justificación a aprobar |

### 🔍 Query Parameters

| Parámetro    | Tipo      | Obligatorio | Descripción                                           |
| ------------ | --------- | ----------- | ----------------------------------------------------- |
| `revisor_id` | `integer` | ✅ Sí       | ID del revisor que aprueba (administrador/supervisor) |
| `comentario` | `string`  | ❌ No       | Comentario opcional del revisor                       |

### 📤 Ejemplo de Consulta

```
POST /justificaciones/15/aprobar?revisor_id=5&comentario=Certificado%20médico%20válido.%20Justificación%20aprobada.
```

### ✅ Respuesta Exitosa (HTTP 200)

```json
{
  "data": {
    "id": 15,
    "user_id": 1,
    "fecha_inicio": "2025-10-16",
    "fecha_fin": "2025-10-18",
    "tipo": "medica",
    "motivo": "Gripe fuerte con fiebre. Adjunto certificado médico.",
    "documento_url": "https://example.com/certificados/cert_123.pdf",
    "estado": "APROBADA",
    "fecha_revision": "2025-10-16T14:30:00.987654",
    "aprobado_por": 5,
    "comentario_revisor": "Certificado médico válido. Justificación aprobada.",
    "dias_justificados": 3,
    "esta_aprobada": true,
    "esta_pendiente": false,
    "created_at": "2025-10-16T10:30:45.123456",
    "updated_at": "2025-10-16T14:30:00.987654",
    "usuario_nombre": "Juan Pérez",
    "usuario_email": "juan.perez@empresa.com",
    "revisor_nombre": "Carlos López"
  },
  "message": "Justificación aprobada exitosamente"
}
```

### ❌ Respuestas de Error

| Código | Mensaje                                               | Causa                         |
| ------ | ----------------------------------------------------- | ----------------------------- |
| `404`  | "Justificación no encontrada"                         | El justificacion_id no existe |
| `404`  | "Revisor no encontrado"                               | El revisor_id no existe       |
| `400`  | "Esta justificación ya fue revisada"                  | Estado no es PENDIENTE        |
| `403`  | "Solo administradores pueden aprobar justificaciones" | Usuario no es admin           |
| `500`  | "Error al aprobar justificación: ..."                 | Error interno del servidor    |

---

## 9. POST - Rechazar Justificación

### 📌 Información General

- **Ruta:** `/justificaciones/{justificacion_id}/rechazar`
- **Método:** `POST`
- **Descripción:** Rechaza una justificación pendiente. Solo administradores pueden rechazar. El comentario del revisor es obligatorio.
- **Status Code:** `200 OK`
- **Autenticación:** Requerida (Administrador)

### 🔗 Parámetro de Ruta

| Parámetro          | Tipo      | Obligatorio | Descripción                       |
| ------------------ | --------- | ----------- | --------------------------------- |
| `justificacion_id` | `integer` | ✅ Sí       | ID de la justificación a rechazar |

### 🔍 Query Parameters

| Parámetro    | Tipo      | Obligatorio | Descripción                                                |
| ------------ | --------- | ----------- | ---------------------------------------------------------- |
| `revisor_id` | `integer` | ✅ Sí       | ID del revisor que rechaza (administrador/supervisor)      |
| `comentario` | `string`  | ✅ Sí       | Comentario del revisor explicando el rechazo (OBLIGATORIO) |

### 📤 Ejemplo de Consulta

```
POST /justificaciones/15/rechazar?revisor_id=5&comentario=Certificado%20médico%20incompleto.%20Se%20requiere%20más%20información.
```

### ✅ Respuesta Exitosa (HTTP 200)

```json
{
  "data": {
    "id": 15,
    "user_id": 1,
    "fecha_inicio": "2025-10-16",
    "fecha_fin": "2025-10-18",
    "tipo": "medica",
    "motivo": "Gripe fuerte con fiebre. Adjunto certificado médico.",
    "documento_url": "https://example.com/certificados/cert_123.pdf",
    "estado": "RECHAZADA",
    "fecha_revision": "2025-10-16T14:35:00.123456",
    "aprobado_por": 5,
    "comentario_revisor": "Certificado médico incompleto. Se requiere más información.",
    "dias_justificados": 0,
    "esta_aprobada": false,
    "esta_pendiente": false,
    "created_at": "2025-10-16T10:30:45.123456",
    "updated_at": "2025-10-16T14:35:00.123456",
    "usuario_nombre": "Juan Pérez",
    "usuario_email": "juan.perez@empresa.com",
    "revisor_nombre": "Carlos López"
  },
  "message": "Justificación rechazada"
}
```

### ❌ Respuestas de Error

| Código | Mensaje                                                | Causa                         |
| ------ | ------------------------------------------------------ | ----------------------------- |
| `404`  | "Justificación no encontrada"                          | El justificacion_id no existe |
| `404`  | "Revisor no encontrado"                                | El revisor_id no existe       |
| `400`  | "Comentario es obligatorio para rechazar"              | Comentario vacío              |
| `400`  | "Esta justificación ya fue revisada"                   | Estado no es PENDIENTE        |
| `403`  | "Solo administradores pueden rechazar justificaciones" | Usuario no es admin           |
| `500`  | "Error al rechazar justificación: ..."                 | Error interno del servidor    |

---

## 10. DELETE - Eliminar Justificación

### 📌 Información General

- **Ruta:** `/justificaciones/{justificacion_id}`
- **Método:** `DELETE`
- **Descripción:** Elimina una justificación. Solo se pueden eliminar justificaciones en estado PENDIENTE.
- **Autenticación:** Requerida

### 🔗 Parámetro de Ruta

| Parámetro          | Tipo      | Obligatorio | Descripción                       |
| ------------------ | --------- | ----------- | --------------------------------- |
| `justificacion_id` | `integer` | ✅ Sí       | ID de la justificación a eliminar |

### 🔍 Query Parameters

**No aplica**

### 📤 Ejemplo de Consulta

```
DELETE /justificaciones/15
```

### ✅ Respuesta Exitosa (HTTP 200)

```json
{
  "data": {
    "id": 15
  },
  "message": "Justificación eliminada exitosamente"
}
```

### ❌ Respuestas de Error

| Código | Mensaje                                                        | Causa                         |
| ------ | -------------------------------------------------------------- | ----------------------------- |
| `404`  | "Justificación no encontrada"                                  | El justificacion_id no existe |
| `400`  | "No se puede eliminar una justificación que no está pendiente" | Estado no es PENDIENTE        |
| `500`  | "Error al eliminar justificación: ..."                         | Error interno del servidor    |

---

## 11. GET - Obtener Estadísticas

### 📌 Información General

- **Ruta:** `/justificaciones/estadisticas/general`
- **Método:** `GET`
- **Descripción:** Obtiene estadísticas generales de justificaciones con filtros opcionales. Retorna totales por estado, tipo y días justificados.
- **Autenticación:** Requerida

### 🔍 Query Parameters

| Parámetro     | Tipo                | Obligatorio | Descripción                    |
| ------------- | ------------------- | ----------- | ------------------------------ |
| `user_id`     | `integer`           | ❌ No       | Filtrar por usuario específico |
| `fecha_desde` | `date` (YYYY-MM-DD) | ❌ No       | Filtrar desde fecha            |
| `fecha_hasta` | `date` (YYYY-MM-DD) | ❌ No       | Filtrar hasta fecha            |

### 📤 Ejemplos de Consulta

**Ejemplo 1: Estadísticas generales del sistema**

```
GET /justificaciones/estadisticas/general
```

**Ejemplo 2: Estadísticas de un usuario**

```
GET /justificaciones/estadisticas/general?user_id=1
```

**Ejemplo 3: Estadísticas de un período**

```
GET /justificaciones/estadisticas/general?fecha_desde=2025-10-01&fecha_hasta=2025-10-31
```

**Ejemplo 4: Estadísticas completas filtradas**

```
GET /justificaciones/estadisticas/general?user_id=1&fecha_desde=2025-10-01&fecha_hasta=2025-10-31
```

### ✅ Respuesta Exitosa (HTTP 200)

```json
{
  "data": {
    "total": 25,
    "pendientes": 5,
    "aprobadas": 18,
    "rechazadas": 2,
    "por_tipo": {
      "medica": 12,
      "personal": 8,
      "familiar": 3,
      "academica": 1,
      "permiso_autorizado": 1,
      "vacaciones": 0,
      "licencia": 0,
      "otro": 0
    },
    "dias_totales_justificados": 45
  },
  "message": "Estadísticas obtenidas exitosamente"
}
```

### ❌ Respuestas de Error

| Código | Mensaje                                        | Causa                       |
| ------ | ---------------------------------------------- | --------------------------- |
| `404`  | "Usuario no encontrado"                        | El user_id no existe        |
| `400`  | "Fecha inválida"                               | Formato de fecha incorrecto |
| `400`  | "fecha_desde no puede ser mayor a fecha_hasta" | Rango de fechas inválido    |
| `500`  | "Error al obtener estadísticas: ..."           | Error interno del servidor  |

---

## 📊 Resumen de Rutas

| Método   | Ruta                                            | Descripción                        | Auth     |
| -------- | ----------------------------------------------- | ---------------------------------- | -------- |
| `POST`   | `/justificaciones`                              | Crea una justificación             | ✅       |
| `GET`    | `/justificaciones`                              | Lista justificaciones              | ✅       |
| `GET`    | `/justificaciones/{justificacion_id}`           | Obtiene una justificación          | ✅       |
| `GET`    | `/justificaciones/usuario/{user_id}`            | Obtiene justificaciones de usuario | ✅       |
| `GET`    | `/justificaciones/pendientes/todas`             | Obtiene pendientes                 | Admin ✅ |
| `GET`    | `/justificaciones/pendientes/usuario/{user_id}` | Obtiene pendientes de usuario      | ✅       |
| `PUT`    | `/justificaciones/{justificacion_id}`           | Actualiza una justificación        | ✅       |
| `POST`   | `/justificaciones/{justificacion_id}/aprobar`   | Aprueba una justificación          | Admin ✅ |
| `POST`   | `/justificaciones/{justificacion_id}/rechazar`  | Rechaza una justificación          | Admin ✅ |
| `DELETE` | `/justificaciones/{justificacion_id}`           | Elimina una justificación          | ✅       |
| `GET`    | `/justificaciones/estadisticas/general`         | Obtiene estadísticas               | ✅       |

---

## 📋 Tipos de Justificación Válidos

```
medica
personal
familiar
academica
permiso_autorizado
vacaciones
licencia
otro
```

---

## 🔐 Estados de Justificación

```
PENDIENTE     - Creada y esperando revisión
APROBADA      - Aprobada por administrador
RECHAZADA     - Rechazada por administrador
```

---

## 🔐 Notas de Seguridad

- **Solo Pendientes:** Solo se pueden actualizar y eliminar justificaciones en estado PENDIENTE.
- **Aprobación:** Requiere revisor_id válido y solo administradores pueden aprobar/rechazar.
- **Comentario Obligatorio:** Al rechazar es obligatorio proporcionar un comentario.
- **Fechas:** La fecha de fin siempre debe ser ≥ fecha de inicio.
- **Auditoria:** Se registran created_at, updated_at y fecha_revision automáticamente.
- **Documentos:** Las URLs de documentos pueden ser de certificados, permisos, etc.

---

**Última actualización:** 16 de octubre de 2025
