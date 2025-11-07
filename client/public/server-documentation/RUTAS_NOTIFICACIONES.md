# 🔔 Rutas HTTP - Controlador de Notificaciones

**Prefijo Base:** `/notificaciones`

---

## 📑 Tabla de Contenidos

1. [GET - Listar Notificaciones](#1-get---listar-notificaciones)
2. [GET - Contar No Leídas](#2-get---contar-no-leídas)
3. [GET - Obtener Notificación por ID](#3-get---obtener-notificación-por-id)
4. [PUT - Marcar Notificación como Leída](#4-put---marcar-notificación-como-leída)
5. [PUT - Marcar Todas como Leídas](#5-put---marcar-todas-como-leídas)
6. [DELETE - Limpiar Notificaciones Antiguas](#6-delete---limpiar-notificaciones-antiguas)

---

## 1. GET - Listar Notificaciones

### 📌 Información General

- **Ruta:** `/notificaciones/`
- **Método:** `GET`
- **Descripción:** Lista las notificaciones del usuario actual con opciones de filtrado y paginación.
- **Autenticación:** Requerida

### 🔍 Query Parameters

| Parámetro        | Tipo      | Obligatorio | Valores         | Descripción                                            |
| ---------------- | --------- | ----------- | --------------- | ------------------------------------------------------ |
| `solo_no_leidas` | `boolean` | ❌ No       | `true`, `false` | Filtrar solo notificaciones no leídas (default: false) |
| `skip`           | `integer` | ❌ No       | ≥ 0             | Registros a omitir para paginación (default: 0)        |
| `limit`          | `integer` | ❌ No       | 1-100           | Límite de registros (default: 50, máximo: 100)         |

### 📤 Ejemplos de Consulta

**Ejemplo 1: Obtener todas las notificaciones**

```
GET /notificaciones/?skip=0&limit=50
```

**Ejemplo 2: Obtener solo notificaciones no leídas**

```
GET /notificaciones/?solo_no_leidas=true&skip=0&limit=50
```

**Ejemplo 3: Obtener segunda página (paginación)**

```
GET /notificaciones/?skip=50&limit=50
```

**Ejemplo 4: Obtener solo no leídas con paginación**

```
GET /notificaciones/?solo_no_leidas=true&skip=0&limit=20
```

### ✅ Respuesta Exitosa (HTTP 200)

```json
{
  "total": 5,
  "no_leidas": 2,
  "notificaciones": [
    {
      "id": 25,
      "user_id": 1,
      "tipo": "tardanza",
      "prioridad": "media",
      "titulo": "Registro de tardanza",
      "mensaje": "Se registró una tardanza de 15 minutos en tu entrada del día 2025-10-16",
      "datos_adicionales": {
        "minutos_tardanza": 15,
        "fecha": "2025-10-16"
      },
      "leida": false,
      "fecha_lectura": null,
      "email_enviado": true,
      "fecha_envio_email": "2025-10-16T08:35:00",
      "accion_url": "/asistencias?fecha=2025-10-16",
      "accion_texto": "Ver asistencia",
      "expira_en": "2025-11-15T08:30:00",
      "created_at": "2025-10-16T08:30:15.123456",
      "updated_at": null
    },
    {
      "id": 24,
      "user_id": 1,
      "tipo": "justificacion",
      "prioridad": "alta",
      "titulo": "Justificación aprobada",
      "mensaje": "Tu justificación del 2025-10-15 al 2025-10-17 (Médica) ha sido aprobada.",
      "datos_adicionales": {
        "justificacion_id": 15,
        "tipo_justificacion": "medica"
      },
      "leida": true,
      "fecha_lectura": "2025-10-16T10:30:00",
      "email_enviado": true,
      "fecha_envio_email": "2025-10-16T09:00:00",
      "accion_url": "/justificaciones/15",
      "accion_texto": "Ver justificación",
      "expira_en": "2025-11-15T09:00:00",
      "created_at": "2025-10-16T09:00:00.654321",
      "updated_at": "2025-10-16T10:30:00.987654"
    }
  ]
}
```

### ❌ Respuestas de Error

| Código | Mensaje                               | Causa                        |
| ------ | ------------------------------------- | ---------------------------- |
| `401`  | "Usuario no autenticado"              | No hay sesión activa         |
| `400`  | "limit no puede ser mayor a 100"      | Límite de registros excesivo |
| `400`  | "skip no puede ser negativo"          | Valor negativo en skip       |
| `500`  | "Error al listar notificaciones: ..." | Error interno del servidor   |

---

## 2. GET - Contar No Leídas

### 📌 Información General

- **Ruta:** `/notificaciones/count`
- **Método:** `GET`
- **Descripción:** Retorna el conteo de notificaciones no leídas del usuario actual. Útil para mostrar badges o contadores en la interfaz.
- **Autenticación:** Requerida

### 🔍 Query Parameters

**No aplica**

### 📤 Ejemplo de Consulta

```
GET /notificaciones/count
```

### ✅ Respuesta Exitosa (HTTP 200)

```json
{
  "count": 3
}
```

### ❌ Respuestas de Error

| Código | Mensaje                          | Causa                      |
| ------ | -------------------------------- | -------------------------- |
| `401`  | "Usuario no autenticado"         | No hay sesión activa       |
| `500`  | "Error al contar no leídas: ..." | Error interno del servidor |

---

## 3. GET - Obtener Notificación por ID

### 📌 Información General

- **Ruta:** `/notificaciones/{notificacion_id}`
- **Método:** `GET`
- **Descripción:** Obtiene los detalles de una notificación específica. El usuario solo puede acceder a sus propias notificaciones.
- **Autenticación:** Requerida

### 🔗 Parámetro de Ruta

| Parámetro         | Tipo      | Obligatorio | Descripción           |
| ----------------- | --------- | ----------- | --------------------- |
| `notificacion_id` | `integer` | ✅ Sí       | ID de la notificación |

### 🔍 Query Parameters

**No aplica**

### 📤 Ejemplo de Consulta

```
GET /notificaciones/25
```

### ✅ Respuesta Exitosa (HTTP 200)

```json
{
  "id": 25,
  "user_id": 1,
  "tipo": "tardanza",
  "prioridad": "media",
  "titulo": "Registro de tardanza",
  "mensaje": "Se registró una tardanza de 15 minutos en tu entrada del día 2025-10-16",
  "datos_adicionales": {
    "minutos_tardanza": 15,
    "fecha": "2025-10-16"
  },
  "leida": false,
  "fecha_lectura": null,
  "email_enviado": true,
  "fecha_envio_email": "2025-10-16T08:35:00",
  "accion_url": "/asistencias?fecha=2025-10-16",
  "accion_texto": "Ver asistencia",
  "expira_en": "2025-11-15T08:30:00",
  "created_at": "2025-10-16T08:30:15.123456",
  "updated_at": null
}
```

### ❌ Respuestas de Error

| Código | Mensaje                                | Causa                                    |
| ------ | -------------------------------------- | ---------------------------------------- |
| `404`  | "Notificación no encontrada"           | El notificacion_id no existe             |
| `403`  | "No tienes acceso a esta notificación" | La notificación pertenece a otro usuario |
| `401`  | "Usuario no autenticado"               | No hay sesión activa                     |
| `500`  | "Error al obtener notificación: ..."   | Error interno del servidor               |

---

## 4. PUT - Marcar Notificación como Leída

### 📌 Información General

- **Ruta:** `/notificaciones/{notificacion_id}/marcar-leida`
- **Método:** `PUT`
- **Descripción:** Marca una notificación específica como leída. Registra automáticamente la fecha de lectura.
- **Autenticación:** Requerida

### 🔗 Parámetro de Ruta

| Parámetro         | Tipo      | Obligatorio | Descripción           |
| ----------------- | --------- | ----------- | --------------------- |
| `notificacion_id` | `integer` | ✅ Sí       | ID de la notificación |

### 🔍 Query Parameters

**No aplica**

### 📤 Ejemplo de Consulta

```
PUT /notificaciones/25/marcar-leida
```

### ✅ Respuesta Exitosa (HTTP 200)

```json
{
  "id": 25,
  "user_id": 1,
  "tipo": "tardanza",
  "prioridad": "media",
  "titulo": "Registro de tardanza",
  "mensaje": "Se registró una tardanza de 15 minutos en tu entrada del día 2025-10-16",
  "datos_adicionales": {
    "minutos_tardanza": 15,
    "fecha": "2025-10-16"
  },
  "leida": true,
  "fecha_lectura": "2025-10-16T11:45:30.123456",
  "email_enviado": true,
  "fecha_envio_email": "2025-10-16T08:35:00",
  "accion_url": "/asistencias?fecha=2025-10-16",
  "accion_texto": "Ver asistencia",
  "expira_en": "2025-11-15T08:30:00",
  "created_at": "2025-10-16T08:30:15.123456",
  "updated_at": "2025-10-16T11:45:30.123456"
}
```

### ❌ Respuestas de Error

| Código | Mensaje                                | Causa                                    |
| ------ | -------------------------------------- | ---------------------------------------- |
| `404`  | "Notificación no encontrada"           | El notificacion_id no existe             |
| `403`  | "No tienes acceso a esta notificación" | La notificación pertenece a otro usuario |
| `401`  | "Usuario no autenticado"               | No hay sesión activa                     |
| `500`  | "Error al marcar como leída: ..."      | Error interno del servidor               |

---

## 5. PUT - Marcar Todas como Leídas

### 📌 Información General

- **Ruta:** `/notificaciones/marcar-todas-leidas`
- **Método:** `PUT`
- **Descripción:** Marca todas las notificaciones del usuario actual como leídas. Operación masiva muy útil para limpiar la bandeja.
- **Autenticación:** Requerida

### 🔍 Query Parameters

**No aplica**

### 📤 Ejemplo de Consulta

```
PUT /notificaciones/marcar-todas-leidas
```

### ✅ Respuesta Exitosa (HTTP 200)

```json
{
  "message": "5 notificaciones marcadas como leídas",
  "count": 5
}
```

### ❌ Respuestas de Error

| Código | Mensaje                                  | Causa                      |
| ------ | ---------------------------------------- | -------------------------- |
| `401`  | "Usuario no autenticado"                 | No hay sesión activa       |
| `500`  | "Error al marcar todas como leídas: ..." | Error interno del servidor |

---

## 6. DELETE - Limpiar Notificaciones Antiguas

### 📌 Información General

- **Ruta:** `/notificaciones/limpiar`
- **Método:** `DELETE`
- **Descripción:** Elimina notificaciones leídas antiguas del sistema. Solo administradores pueden usar este endpoint. Útil para mantener la base de datos limpia.
- **Autenticación:** Requerida (Administrador)

### 🔍 Query Parameters

| Parámetro | Tipo      | Obligatorio | Valores | Descripción                      |
| --------- | --------- | ----------- | ------- | -------------------------------- |
| `dias`    | `integer` | ❌ No       | 1-365   | Días de antigüedad (default: 30) |

### 📤 Ejemplos de Consulta

**Ejemplo 1: Limpiar notificaciones con más de 30 días**

```
DELETE /notificaciones/limpiar?dias=30
```

**Ejemplo 2: Limpiar notificaciones con más de 60 días**

```
DELETE /notificaciones/limpiar?dias=60
```

**Ejemplo 3: Limpiar notificaciones con más de 90 días**

```
DELETE /notificaciones/limpiar?dias=90
```

### ✅ Respuesta Exitosa (HTTP 200)

```json
{
  "message": "23 notificaciones eliminadas",
  "count": 23
}
```

### ❌ Respuestas de Error

| Código | Mensaje                                | Causa                       |
| ------ | -------------------------------------- | --------------------------- |
| `401`  | "Usuario no autenticado"               | No hay sesión activa        |
| `403`  | "No tiene permisos para esta acción"   | Usuario no es administrador |
| `400`  | "dias debe estar entre 1 y 365"        | Valor fuera de rango        |
| `500`  | "Error al limpiar notificaciones: ..." | Error interno del servidor  |

---

## 📊 Resumen de Rutas

| Método   | Ruta                                             | Descripción              | Auth     |
| -------- | ------------------------------------------------ | ------------------------ | -------- |
| `GET`    | `/notificaciones/`                               | Lista notificaciones     | ✅       |
| `GET`    | `/notificaciones/count`                          | Cuenta no leídas         | ✅       |
| `GET`    | `/notificaciones/{notificacion_id}`              | Obtiene una notificación | ✅       |
| `PUT`    | `/notificaciones/{notificacion_id}/marcar-leida` | Marca como leída         | ✅       |
| `PUT`    | `/notificaciones/marcar-todas-leidas`            | Marca todas como leídas  | ✅       |
| `DELETE` | `/notificaciones/limpiar`                        | Limpia antiguas          | Admin ✅ |

---

## 📋 Tipos de Notificación

```
tardanza              - Notificación de tardanza registrada
ausencia              - Notificación de ausencia
alerta                - Alertas generales del sistema
justificacion         - Sobre solicitudes de justificación
aprobacion            - Notificación de aprobación
rechazo               - Notificación de rechazo
recordatorio          - Recordatorios del sistema
sistema               - Notificaciones de mantenimiento/sistema
exceso_jornada        - Cuando se excede horas de jornada
incumplimiento_jornada - Cuando no se cumplen horas de jornada
```

---

## 🎯 Niveles de Prioridad

```
baja      - Información general, sin urgencia
media     - Información importante, requiere atención
alta      - Muy importante, acción recomendada pronto
urgente   - Crítica, requiere acción inmediata
```

---

## 📊 Campos de Respuesta Explicados

| Campo               | Descripción                                  |
| ------------------- | -------------------------------------------- |
| `id`                | Identificador único de la notificación       |
| `user_id`           | ID del usuario propietario                   |
| `tipo`              | Categoría de la notificación                 |
| `prioridad`         | Nivel de urgencia                            |
| `titulo`            | Título corto y descriptivo                   |
| `mensaje`           | Contenido detallado del mensaje              |
| `datos_adicionales` | JSON con información contextual adicional    |
| `leida`             | Si el usuario ha visto la notificación       |
| `fecha_lectura`     | Cuándo se marcó como leída                   |
| `email_enviado`     | Si se envió un email sobre esta notificación |
| `fecha_envio_email` | Cuándo se envió el email                     |
| `accion_url`        | URL a donde redirige la notificación         |
| `accion_texto`      | Texto del botón de acción                    |
| `expira_en`         | Cuándo expira la notificación                |
| `created_at`        | Fecha de creación                            |
| `updated_at`        | Fecha de última actualización                |

---

## 🔐 Notas de Seguridad

- **Privacidad:** Los usuarios solo pueden ver sus propias notificaciones.
- **Administrador:** Solo administradores pueden limpiar notificaciones antiguas.
- **Expiración:** Las notificaciones pueden tener fecha de expiración.
- **Email:** El sistema puede enviar emails sobre notificaciones importantes.
- **Auditoría:** Se registran automáticamente created_at y updated_at.

---

## 💡 Casos de Uso

### Monitoreo de Tardanzas

```
GET /notificaciones/?tipo=tardanza&solo_no_leidas=true
```

### Seguimiento de Justificaciones

```
GET /notificaciones/?tipo=justificacion
```

### Verificar Alertas No Leídas

```
GET /notificaciones/count
```

### Marcar Todo como Visto

```
PUT /notificaciones/marcar-todas-leidas
```

### Limpiar Base de Datos (Admin)

```
DELETE /notificaciones/limpiar?dias=60
```

---

**Última actualización:** 16 de octubre de 2025
