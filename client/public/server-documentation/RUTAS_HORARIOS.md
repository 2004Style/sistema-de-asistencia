# 📅 Rutas HTTP - Controlador de Horarios

**Prefijo Base:** `/horarios`

---

## 📑 Tabla de Contenidos

1. [POST - Crear Horario](#1-post---crear-horario)
2. [POST - Crear Múltiples Horarios (Bulk)](#2-post---crear-múltiples-horarios-bulk)
3. [GET - Listar Horarios](#3-get---listar-horarios)
4. [GET - Obtener Horario por ID](#4-get---obtener-horario-por-id)
5. [GET - Obtener Horarios por Usuario](#5-get---obtener-horarios-por-usuario)
6. [GET - Detectar Turno Activo](#6-get---detectar-turno-activo)
7. [PUT - Actualizar Horario](#7-put---actualizar-horario)
8. [DELETE - Eliminar Horario](#8-delete---eliminar-horario)
9. [DELETE - Eliminar Horarios por Usuario](#9-delete---eliminar-horarios-por-usuario)

---

## 1. POST - Crear Horario

### 📌 Información General

- **Ruta:** `/horarios`
- **Método:** `POST`
- **Descripción:** Crea un nuevo horario para un usuario. Soporta múltiples turnos por día.
- **Status Code:** `201 Created`
- **Autenticación:** Requerida

### 📤 Body (JSON)

```json
{
  "user_id": 1,
  "dia_semana": "LUNES",
  "turno_id": 2,
  "hora_entrada": "08:30:00",
  "hora_salida": "17:15:00",
  "horas_requeridas": 480,
  "tolerancia_entrada": 15,
  "tolerancia_salida": 15,
  "activo": true,
  "descripcion": "Turno matutino regular"
}
```

### 🔍 Parámetros del Body

| Parámetro            | Tipo              | Obligatorio | Descripción                                                                                |
| -------------------- | ----------------- | ----------- | ------------------------------------------------------------------------------------------ |
| `user_id`            | `integer`         | ✅ Sí       | ID del usuario al que pertenece el horario                                                 |
| `dia_semana`         | `string`          | ✅ Sí       | Día de la semana: `LUNES`, `MARTES`, `MIERCOLES`, `JUEVES`, `VIERNES`, `SABADO`, `DOMINGO` |
| `turno_id`           | `integer`         | ✅ Sí       | ID del turno asignado                                                                      |
| `hora_entrada`       | `time` (HH:MM:SS) | ✅ Sí       | Hora de entrada                                                                            |
| `hora_salida`        | `time` (HH:MM:SS) | ✅ Sí       | Hora de salida (puede ser menor que entrada para turnos nocturnos)                         |
| `horas_requeridas`   | `integer`         | ✅ Sí       | Horas requeridas en minutos (1-1440)                                                       |
| `tolerancia_entrada` | `integer`         | ❌ No       | Tolerancia de entrada en minutos (default: 15)                                             |
| `tolerancia_salida`  | `integer`         | ❌ No       | Tolerancia de salida en minutos (default: 15)                                              |
| `activo`             | `boolean`         | ❌ No       | Si el horario está activo (default: true)                                                  |
| `descripcion`        | `string`          | ❌ No       | Descripción opcional del horario                                                           |

### 📥 Query Parameters

**No aplica**

### ✅ Respuesta Exitosa (HTTP 201)

```json
{
  "data": {
    "id": 5,
    "user_id": 1,
    "dia_semana": "LUNES",
    "turno_id": 2,
    "hora_entrada": "08:30:00",
    "hora_salida": "17:15:00",
    "horas_requeridas": 480,
    "tolerancia_entrada": 15,
    "tolerancia_salida": 15,
    "activo": true,
    "descripcion": "Turno matutino regular",
    "usuario_nombre": "Juan Pérez",
    "usuario_email": "juan.perez@empresa.com",
    "turno_nombre": "Turno Matutino",
    "created_at": "2025-10-16T10:30:45.123456",
    "updated_at": null
  },
  "message": "Horario creado exitosamente"
}
```

### ❌ Respuestas de Error

| Código | Mensaje                                               | Causa                        |
| ------ | ----------------------------------------------------- | ---------------------------- |
| `404`  | "Usuario no encontrado"                               | El user_id no existe         |
| `404`  | "Turno no encontrado"                                 | El turno_id no existe        |
| `400`  | "Horas requeridas debe estar entre 1 y 1440 minutos"  | Valor fuera de rango         |
| `400`  | "Hora de salida no puede ser igual a hora de entrada" | Horas inválidas              |
| `400`  | "El turno_id debe ser un número positivo"             | turno_id inválido            |
| `422`  | "Validación fallida"                                  | Error de validación en datos |
| `500`  | "Error al crear horario: ..."                         | Error interno del servidor   |

---

## 2. POST - Crear Múltiples Horarios (Bulk)

### 📌 Información General

- **Ruta:** `/horarios/bulk`
- **Método:** `POST`
- **Descripción:** Crea múltiples horarios para un usuario de una sola vez. Todos deben pertenecer al mismo usuario. El sistema valida que no se solapen.
- **Status Code:** `201 Created`
- **Autenticación:** Requerida

### 📤 Body (JSON)

```json
[
  {
    "user_id": 1,
    "dia_semana": "LUNES",
    "turno_id": 2,
    "hora_entrada": "08:30:00",
    "hora_salida": "17:15:00",
    "horas_requeridas": 480,
    "tolerancia_entrada": 15,
    "tolerancia_salida": 15,
    "activo": true
  },
  {
    "user_id": 1,
    "dia_semana": "MARTES",
    "turno_id": 2,
    "hora_entrada": "08:30:00",
    "hora_salida": "17:15:00",
    "horas_requeridas": 480,
    "tolerancia_entrada": 15,
    "tolerancia_salida": 15,
    "activo": true
  },
  {
    "user_id": 1,
    "dia_semana": "MIERCOLES",
    "turno_id": 2,
    "hora_entrada": "08:30:00",
    "hora_salida": "17:15:00",
    "horas_requeridas": 480,
    "tolerancia_entrada": 15,
    "tolerancia_salida": 15,
    "activo": true
  }
]
```

### 🔍 Parámetros del Body

Array de objetos con la misma estructura que [Crear Horario](#1-post---crear-horario).

**Validaciones:**

- Mínimo 1 horario
- Todos deben tener el mismo `user_id`
- No deben solaparse los horarios

### 📥 Query Parameters

**No aplica**

### ✅ Respuesta Exitosa (HTTP 201)

```json
{
  "data": {
    "records": [
      {
        "id": 5,
        "user_id": 1,
        "dia_semana": "LUNES",
        "turno_id": 2,
        "hora_entrada": "08:30:00",
        "hora_salida": "17:15:00",
        "horas_requeridas": 480,
        "tolerancia_entrada": 15,
        "tolerancia_salida": 15,
        "activo": true,
        "usuario_nombre": "Juan Pérez",
        "usuario_email": "juan.perez@empresa.com",
        "turno_nombre": "Turno Matutino",
        "created_at": "2025-10-16T10:30:45.123456",
        "updated_at": null
      },
      {
        "id": 6,
        "user_id": 1,
        "dia_semana": "MARTES",
        "turno_id": 2,
        "hora_entrada": "08:30:00",
        "hora_salida": "17:15:00",
        "horas_requeridas": 480,
        "tolerancia_entrada": 15,
        "tolerancia_salida": 15,
        "activo": true,
        "usuario_nombre": "Juan Pérez",
        "usuario_email": "juan.perez@empresa.com",
        "turno_nombre": "Turno Matutino",
        "created_at": "2025-10-16T10:30:50.654321",
        "updated_at": null
      }
    ],
    "totalRecords": 2,
    "totalPages": 1,
    "currentPage": 1
  },
  "message": "Se crearon 2 horarios exitosamente"
}
```

### ❌ Respuestas de Error

| Código | Mensaje                                                | Causa                      |
| ------ | ------------------------------------------------------ | -------------------------- |
| `400`  | "Debe proporcionar al menos un horario"                | Array vacío                |
| `400`  | "Todos los horarios deben pertenecer al mismo usuario" | user_id diferentes         |
| `400`  | "Los horarios se solapan"                              | Horarios conflictivos      |
| `404`  | "Usuario no encontrado"                                | El user_id no existe       |
| `500`  | "Error al crear horarios: ..."                         | Error interno del servidor |

---

## 3. GET - Listar Horarios

### 📌 Información General

- **Ruta:** `/horarios`
- **Método:** `GET`
- **Descripción:** Obtiene una lista paginada de horarios con filtros opcionales.
- **Autenticación:** Requerida

### 🔍 Query Parameters

| Parámetro    | Tipo      | Obligatorio | Valores                                                                  | Descripción                                 |
| ------------ | --------- | ----------- | ------------------------------------------------------------------------ | ------------------------------------------- |
| `page`       | `integer` | ❌ No       | ≥ 1                                                                      | Número de página (default: 1)               |
| `page_size`  | `integer` | ❌ No       | 1-100                                                                    | Tamaño de página (default: 10, máximo: 100) |
| `user_id`    | `integer` | ❌ No       | -                                                                        | Filtrar por ID de usuario                   |
| `dia_semana` | `string`  | ❌ No       | `LUNES`, `MARTES`, `MIERCOLES`, `JUEVES`, `VIERNES`, `SABADO`, `DOMINGO` | Filtrar por día de la semana                |
| `activo`     | `boolean` | ❌ No       | `true`, `false`                                                          | Filtrar por estado activo                   |

### 📤 Ejemplos de Consulta

**Ejemplo 1: Obtener primera página**

```
GET /horarios?page=1&page_size=10
```

**Ejemplo 2: Filtrar por usuario**

```
GET /horarios?user_id=1&page=1&page_size=10
```

**Ejemplo 3: Filtrar por día y estado activo**

```
GET /horarios?dia_semana=LUNES&activo=true&page=1&page_size=15
```

**Ejemplo 4: Obtener segunda página con más registros**

```
GET /horarios?page=2&page_size=20
```

### ✅ Respuesta Exitosa (HTTP 200)

```json
{
  "data": {
    "records": [
      {
        "id": 1,
        "user_id": 1,
        "dia_semana": "LUNES",
        "turno_id": 2,
        "hora_entrada": "08:30:00",
        "hora_salida": "17:15:00",
        "horas_requeridas": 480,
        "tolerancia_entrada": 15,
        "tolerancia_salida": 15,
        "activo": true,
        "descripcion": "Turno regular",
        "usuario_nombre": "Juan Pérez",
        "usuario_email": "juan.perez@empresa.com",
        "turno_nombre": "Turno Matutino",
        "created_at": "2025-10-15T09:00:00.000000",
        "updated_at": null
      }
    ],
    "totalRecords": 45,
    "totalPages": 5,
    "currentPage": 1
  },
  "message": "Horarios obtenidos exitosamente"
}
```

### ❌ Respuestas de Error

| Código | Mensaje                              | Causa                           |
| ------ | ------------------------------------ | ------------------------------- |
| `400`  | "page_size no puede ser mayor a 100" | Tamaño de página excesivo       |
| `400`  | "Día de la semana inválido"          | dia_semana con valor incorrecto |
| `404`  | "Usuario no encontrado"              | El user_id no existe            |
| `500`  | "Error al obtener horarios: ..."     | Error interno del servidor      |

---

## 4. GET - Obtener Horario por ID

### 📌 Información General

- **Ruta:** `/horarios/{horario_id}`
- **Método:** `GET`
- **Descripción:** Obtiene un horario específico por su ID.
- **Autenticación:** Requerida

### 🔗 Parámetro de Ruta

| Parámetro    | Tipo      | Obligatorio | Descripción    |
| ------------ | --------- | ----------- | -------------- |
| `horario_id` | `integer` | ✅ Sí       | ID del horario |

### 🔍 Query Parameters

**No aplica**

### 📤 Ejemplo de Consulta

```
GET /horarios/5
```

### ✅ Respuesta Exitosa (HTTP 200)

```json
{
  "data": {
    "id": 5,
    "user_id": 1,
    "dia_semana": "LUNES",
    "turno_id": 2,
    "hora_entrada": "08:30:00",
    "hora_salida": "17:15:00",
    "horas_requeridas": 480,
    "tolerancia_entrada": 15,
    "tolerancia_salida": 15,
    "activo": true,
    "descripcion": "Turno matutino regular",
    "usuario_nombre": "Juan Pérez",
    "usuario_email": "juan.perez@empresa.com",
    "turno_nombre": "Turno Matutino",
    "created_at": "2025-10-16T10:30:45.123456",
    "updated_at": null
  },
  "message": "Horario obtenido exitosamente"
}
```

### ❌ Respuestas de Error

| Código | Mensaje                         | Causa                      |
| ------ | ------------------------------- | -------------------------- |
| `404`  | "Horario no encontrado"         | El horario_id no existe    |
| `500`  | "Error al obtener horario: ..." | Error interno del servidor |

---

## 5. GET - Obtener Horarios por Usuario

### 📌 Información General

- **Ruta:** `/horarios/usuario/{user_id}`
- **Método:** `GET`
- **Descripción:** Obtiene todos los horarios de un usuario específico, con opción de filtrar por día.
- **Autenticación:** Requerida

### 🔗 Parámetro de Ruta

| Parámetro | Tipo      | Obligatorio | Descripción    |
| --------- | --------- | ----------- | -------------- |
| `user_id` | `integer` | ✅ Sí       | ID del usuario |

### 🔍 Query Parameters

| Parámetro    | Tipo     | Obligatorio | Valores                                                                  | Descripción                |
| ------------ | -------- | ----------- | ------------------------------------------------------------------------ | -------------------------- |
| `dia_semana` | `string` | ❌ No       | `LUNES`, `MARTES`, `MIERCOLES`, `JUEVES`, `VIERNES`, `SABADO`, `DOMINGO` | Filtrar por día específico |

### 📤 Ejemplos de Consulta

**Ejemplo 1: Obtener todos los horarios del usuario**

```
GET /horarios/usuario/1
```

**Ejemplo 2: Obtener horarios de un usuario para un día específico**

```
GET /horarios/usuario/1?dia_semana=LUNES
```

### ✅ Respuesta Exitosa (HTTP 200)

```json
{
  "data": {
    "records": [
      {
        "id": 1,
        "user_id": 1,
        "dia_semana": "LUNES",
        "turno_id": 2,
        "hora_entrada": "08:30:00",
        "hora_salida": "17:15:00",
        "horas_requeridas": 480,
        "tolerancia_entrada": 15,
        "tolerancia_salida": 15,
        "activo": true,
        "usuario_nombre": "Juan Pérez",
        "usuario_email": "juan.perez@empresa.com",
        "turno_nombre": "Turno Matutino",
        "created_at": "2025-10-15T09:00:00.000000",
        "updated_at": null
      },
      {
        "id": 2,
        "user_id": 1,
        "dia_semana": "MARTES",
        "turno_id": 2,
        "hora_entrada": "08:30:00",
        "hora_salida": "17:15:00",
        "horas_requeridas": 480,
        "tolerancia_entrada": 15,
        "tolerancia_salida": 15,
        "activo": true,
        "usuario_nombre": "Juan Pérez",
        "usuario_email": "juan.perez@empresa.com",
        "turno_nombre": "Turno Matutino",
        "created_at": "2025-10-15T09:05:00.000000",
        "updated_at": null
      }
    ],
    "totalRecords": 2,
    "totalPages": 1,
    "currentPage": 1
  },
  "message": "Horarios del usuario 1 obtenidos exitosamente"
}
```

### ❌ Respuestas de Error

| Código | Mensaje                          | Causa                           |
| ------ | -------------------------------- | ------------------------------- |
| `404`  | "Usuario no encontrado"          | El user_id no existe            |
| `400`  | "Día de la semana inválido"      | dia_semana con valor incorrecto |
| `500`  | "Error al obtener horarios: ..." | Error interno del servidor      |

---

## 6. GET - Detectar Turno Activo

### 📌 Información General

- **Ruta:** `/horarios/usuario/{user_id}/turno-activo`
- **Método:** `GET`
- **Descripción:** Detecta qué turno está activo para un usuario en un momento específico. Considera una ventana de 1 hora antes/después del horario.
- **Autenticación:** Requerida

### 🔗 Parámetro de Ruta

| Parámetro | Tipo      | Obligatorio | Descripción    |
| --------- | --------- | ----------- | -------------- |
| `user_id` | `integer` | ✅ Sí       | ID del usuario |

### 🔍 Query Parameters

| Parámetro    | Tipo             | Obligatorio | Valores                                                                  | Descripción                             |
| ------------ | ---------------- | ----------- | ------------------------------------------------------------------------ | --------------------------------------- |
| `dia_semana` | `string`         | ❌ No       | `LUNES`, `MARTES`, `MIERCOLES`, `JUEVES`, `VIERNES`, `SABADO`, `DOMINGO` | Día a consultar (default: hoy)          |
| `hora`       | `string` (HH:MM) | ❌ No       | Formato HH:MM                                                            | Hora a consultar (default: hora actual) |

### 📤 Ejemplos de Consulta

**Ejemplo 1: Detectar turno activo ahora**

```
GET /horarios/usuario/1/turno-activo
```

**Ejemplo 2: Detectar turno activo para un día específico a una hora específica**

```
GET /horarios/usuario/1/turno-activo?dia_semana=LUNES&hora=14:30
```

**Ejemplo 3: Detectar turno para mañana (martes) a las 9:00 AM**

```
GET /horarios/usuario/1/turno-activo?dia_semana=MARTES&hora=09:00
```

### ✅ Respuesta Exitosa (HTTP 200)

```json
{
  "data": {
    "id": 1,
    "user_id": 1,
    "dia_semana": "LUNES",
    "turno_id": 2,
    "hora_entrada": "08:30:00",
    "hora_salida": "17:15:00",
    "horas_requeridas": 480,
    "tolerancia_entrada": 15,
    "tolerancia_salida": 15,
    "activo": true,
    "usuario_nombre": "Juan Pérez",
    "usuario_email": "juan.perez@empresa.com",
    "turno_nombre": "Turno Matutino",
    "created_at": "2025-10-15T09:00:00.000000",
    "updated_at": null
  },
  "message": "Turno activo: 08:30 - 17:15"
}
```

### ❌ Respuestas de Error

| Código | Mensaje                                                 | Causa                           |
| ------ | ------------------------------------------------------- | ------------------------------- |
| `404`  | "Usuario no encontrado"                                 | El user_id no existe            |
| `404`  | "No hay turno activo para este usuario en este momento" | No hay turno en ese horario     |
| `400`  | "Formato de hora inválido. Use HH:MM"                   | Formato de hora incorrecto      |
| `400`  | "Día de la semana inválido"                             | dia_semana con valor incorrecto |
| `500`  | "Error al detectar turno: ..."                          | Error interno del servidor      |

---

## 7. PUT - Actualizar Horario

### 📌 Información General

- **Ruta:** `/horarios/{horario_id}`
- **Método:** `PUT`
- **Descripción:** Actualiza un horario existente. Todos los campos son opcionales.
- **Autenticación:** Requerida

### 🔗 Parámetro de Ruta

| Parámetro    | Tipo      | Obligatorio | Descripción                 |
| ------------ | --------- | ----------- | --------------------------- |
| `horario_id` | `integer` | ✅ Sí       | ID del horario a actualizar |

### 📤 Body (JSON)

```json
{
  "turno_id": 3,
  "hora_entrada": "09:00:00",
  "hora_salida": "17:30:00",
  "horas_requeridas": 510,
  "tolerancia_entrada": 20,
  "tolerancia_salida": 15,
  "descripcion": "Turno matutino actualizado",
  "activo": true
}
```

### 🔍 Parámetros del Body

| Parámetro            | Tipo              | Obligatorio | Descripción                        |
| -------------------- | ----------------- | ----------- | ---------------------------------- |
| `turno_id`           | `integer`         | ❌ No       | Nuevo ID del turno                 |
| `hora_entrada`       | `time` (HH:MM:SS) | ❌ No       | Nueva hora de entrada              |
| `hora_salida`        | `time` (HH:MM:SS) | ❌ No       | Nueva hora de salida               |
| `horas_requeridas`   | `integer`         | ❌ No       | Nuevas horas requeridas en minutos |
| `tolerancia_entrada` | `integer`         | ❌ No       | Nueva tolerancia de entrada        |
| `tolerancia_salida`  | `integer`         | ❌ No       | Nueva tolerancia de salida         |
| `descripcion`        | `string`          | ❌ No       | Nueva descripción                  |
| `activo`             | `boolean`         | ❌ No       | Nuevo estado activo                |

### 📥 Query Parameters

**No aplica**

### ✅ Respuesta Exitosa (HTTP 200)

```json
{
  "data": {
    "id": 5,
    "user_id": 1,
    "dia_semana": "LUNES",
    "turno_id": 3,
    "hora_entrada": "09:00:00",
    "hora_salida": "17:30:00",
    "horas_requeridas": 510,
    "tolerancia_entrada": 20,
    "tolerancia_salida": 15,
    "activo": true,
    "descripcion": "Turno matutino actualizado",
    "usuario_nombre": "Juan Pérez",
    "usuario_email": "juan.perez@empresa.com",
    "turno_nombre": "Turno Matutino",
    "created_at": "2025-10-16T10:30:45.123456",
    "updated_at": "2025-10-16T14:45:30.987654"
  },
  "message": "Horario actualizado exitosamente"
}
```

### ❌ Respuestas de Error

| Código | Mensaje                                               | Causa                       |
| ------ | ----------------------------------------------------- | --------------------------- |
| `404`  | "Horario no encontrado"                               | El horario_id no existe     |
| `404`  | "Turno no encontrado"                                 | El nuevo turno_id no existe |
| `400`  | "Horas requeridas debe estar entre 1 y 1440 minutos"  | Valor fuera de rango        |
| `400`  | "Hora de salida no puede ser igual a hora de entrada" | Horas inválidas             |
| `422`  | "Validación fallida"                                  | Error de validación         |
| `500`  | "Error al actualizar horario: ..."                    | Error interno del servidor  |

---

## 8. DELETE - Eliminar Horario

### 📌 Información General

- **Ruta:** `/horarios/{horario_id}`
- **Método:** `DELETE`
- **Descripción:** Elimina un horario específico.
- **Autenticación:** Requerida

### 🔗 Parámetro de Ruta

| Parámetro    | Tipo      | Obligatorio | Descripción               |
| ------------ | --------- | ----------- | ------------------------- |
| `horario_id` | `integer` | ✅ Sí       | ID del horario a eliminar |

### 🔍 Query Parameters

**No aplica**

### 📤 Ejemplo de Consulta

```
DELETE /horarios/5
```

### ✅ Respuesta Exitosa (HTTP 200)

```json
{
  "data": {
    "id": 5
  },
  "message": "Horario eliminado exitosamente"
}
```

### ❌ Respuestas de Error

| Código | Mensaje                          | Causa                      |
| ------ | -------------------------------- | -------------------------- |
| `404`  | "Horario no encontrado"          | El horario_id no existe    |
| `500`  | "Error al eliminar horario: ..." | Error interno del servidor |

---

## 9. DELETE - Eliminar Horarios por Usuario

### 📌 Información General

- **Ruta:** `/horarios/usuario/{user_id}`
- **Método:** `DELETE`
- **Descripción:** Elimina todos los horarios asociados a un usuario específico.
- **Autenticación:** Requerida (Administrador)

### 🔗 Parámetro de Ruta

| Parámetro | Tipo      | Obligatorio | Descripción    |
| --------- | --------- | ----------- | -------------- |
| `user_id` | `integer` | ✅ Sí       | ID del usuario |

### 🔍 Query Parameters

**No aplica**

### 📤 Ejemplo de Consulta

```
DELETE /horarios/usuario/1
```

### ✅ Respuesta Exitosa (HTTP 200)

```json
{
  "data": {
    "user_id": 1
  },
  "message": "Todos los horarios del usuario 1 fueron eliminados exitosamente"
}
```

### ❌ Respuestas de Error

| Código | Mensaje                                                     | Causa                      |
| ------ | ----------------------------------------------------------- | -------------------------- |
| `404`  | "Usuario no encontrado"                                     | El user_id no existe       |
| `403`  | "Solo administradores pueden eliminar horarios de usuarios" | Permisos insuficientes     |
| `500`  | "Error al eliminar horarios: ..."                           | Error interno del servidor |

---

## 📊 Resumen de Rutas

| Método   | Ruta                                       | Descripción                 | Auth     |
| -------- | ------------------------------------------ | --------------------------- | -------- |
| `POST`   | `/horarios`                                | Crea un horario             | ✅       |
| `POST`   | `/horarios/bulk`                           | Crea múltiples horarios     | ✅       |
| `GET`    | `/horarios`                                | Lista horarios con filtros  | ✅       |
| `GET`    | `/horarios/{horario_id}`                   | Obtiene un horario          | ✅       |
| `GET`    | `/horarios/usuario/{user_id}`              | Obtiene horarios de usuario | ✅       |
| `GET`    | `/horarios/usuario/{user_id}/turno-activo` | Detecta turno activo        | ✅       |
| `PUT`    | `/horarios/{horario_id}`                   | Actualiza un horario        | ✅       |
| `DELETE` | `/horarios/{horario_id}`                   | Elimina un horario          | ✅       |
| `DELETE` | `/horarios/usuario/{user_id}`              | Elimina horarios de usuario | Admin ✅ |

---

## 🔐 Notas de Seguridad

- **Validación de Turnos:** Los turnos no pueden solaparse en el mismo día.
- **Turnos Nocturnos:** Se soportan horarios donde `hora_salida < hora_entrada`.
- **Tolerancia:** Define los minutos permitidos antes/después del horario oficial.
- **Estado Activo:** Permite desactivar horarios sin eliminarlos.
- **Auditoria:** Se registran `created_at` y `updated_at` automáticamente.

---

## 📋 Valores Válidos para Días de la Semana

```
LUNES, MARTES, MIERCOLES, JUEVES, VIERNES, SABADO, DOMINGO
```

---

**Última actualización:** 16 de octubre de 2025
