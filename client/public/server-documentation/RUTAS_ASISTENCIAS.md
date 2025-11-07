# 📋 Rutas HTTP - Controlador de Asistencias

**Prefijo Base:** `/asistencia`

---

## 📑 Tabla de Contenidos

1. [POST - Registrar Asistencia Manual](#1-post---registrar-asistencia-manual)
2. [POST - Registrar Asistencia por Facial](#2-post---registrar-asistencia-por-facial)
3. [PUT - Actualizar Asistencia](#3-put---actualizar-asistencia)
4. [GET - Listar Todas las Asistencias](#4-get---listar-todas-las-asistencias)
5. [GET - Obtener Asistencias por Usuario](#5-get---obtener-asistencias-por-usuario)
6. [GET - Obtener Asistencia por ID](#6-get---obtener-asistencia-por-id)
7. [DELETE - Eliminar Asistencia](#7-delete---eliminar-asistencia)

---

## 1. POST - Registrar Asistencia Manual

### 📌 Información General

- **Ruta:** `/asistencia/registrar-manual`
- **Método:** `POST`
- **Descripción:** Registra asistencia de forma manual (solo administradores). El servidor toma automáticamente la fecha y hora actual. Es útil para casos excepcionales.
- **Autenticación:** Requerida (Administrador)

### 📤 Body (JSON)

```json
{
  "user_id": 1,
  "tipo_registro": "entrada",
  "observaciones": "Registro manual por falla en el sistema biométrico"
}
```

### 🔍 Parámetros del Body

| Parámetro       | Tipo      | Obligatorio | Descripción                                                                            |
| --------------- | --------- | ----------- | -------------------------------------------------------------------------------------- |
| `user_id`       | `integer` | ✅ Sí       | ID del usuario a registrar                                                             |
| `tipo_registro` | `string`  | ❌ No       | Tipo de registro: `"entrada"` o `"salida"`. Si no se envía, se detecta automáticamente |
| `observaciones` | `string`  | ✅ Sí       | Motivo del registro manual (mínimo 10 caracteres)                                      |

### 📥 Query Parameters

**No aplica**

### ✅ Respuesta Exitosa (HTTP 200)

```json
{
  "data": {
    "id": 1,
    "user_id": 1,
    "horario_id": 5,
    "fecha": "2025-10-16",
    "hora_entrada": "08:15:30",
    "hora_salida": null,
    "metodo_entrada": "manual",
    "metodo_salida": null,
    "estado": "presente",
    "tardanza": false,
    "minutos_tardanza": 0,
    "minutos_trabajados": null,
    "horas_trabajadas_formato": "0:00",
    "justificacion_id": null,
    "observaciones": "Registro manual por falla en el sistema biométrico",
    "created_at": "2025-10-16T08:15:30.123456",
    "updated_at": "2025-10-16T08:15:30.123456",
    "nombre_usuario": "Juan Pérez",
    "codigo_usuario": "EMP001",
    "email_usuario": "juan.perez@empresa.com"
  },
  "message": "Registro manual realizado"
}
```

### ❌ Respuestas de Error

| Código | Mensaje                                                            | Causa                              |
| ------ | ------------------------------------------------------------------ | ---------------------------------- |
| `404`  | "Usuario con ID X no encontrado"                                   | El user_id no existe en el sistema |
| `403`  | "Solo los administradores pueden registrar asistencia manualmente" | El usuario no es administrador     |
| `500`  | "Error al registrar asistencia manual: ..."                        | Error interno del servidor         |

---

## 2. POST - Registrar Asistencia por Facial

### 📌 Información General

- **Ruta:** `/asistencia/registro-facial`
- **Método:** `POST`
- **Descripción:** Registra asistencia mediante reconocimiento facial. Se envía una imagen y el código del usuario. El sistema valida que la cara detectada coincida con el usuario.
- **Content-Type:** `multipart/form-data`
- **Autenticación:** No requerida

### 📤 Body (Form Data)

```
codigo: EMP001
image: [archivo binario de imagen]
```

### 🔍 Query Parameters

| Parámetro | Tipo     | Obligatorio | Descripción                              |
| --------- | -------- | ----------- | ---------------------------------------- |
| `codigo`  | `string` | ✅ Sí       | Código único del usuario a registrar     |
| `image`   | `file`   | ✅ Sí       | Imagen que contiene el rostro (máx 5 MB) |

### 📥 Consideraciones

- **Formato de imagen:** JPG, PNG
- **Tamaño máximo:** 5 MB
- **La imagen no debe estar vacía**

### ✅ Respuesta Exitosa (HTTP 200)

```json
{
  "data": {
    "id": 2,
    "user_id": 1,
    "horario_id": 5,
    "fecha": "2025-10-16",
    "hora_entrada": "08:45:15",
    "hora_salida": null,
    "metodo_entrada": "facial",
    "metodo_salida": null,
    "estado": "presente",
    "tardanza": false,
    "minutos_tardanza": 0,
    "minutos_trabajados": null,
    "horas_trabajadas_formato": "0:00",
    "justificacion_id": null,
    "observaciones": "Registrado por reconocimiento facial",
    "created_at": "2025-10-16T08:45:15.654321",
    "updated_at": "2025-10-16T08:45:15.654321",
    "nombre_usuario": "Juan Pérez",
    "codigo_usuario": "EMP001",
    "email_usuario": "juan.perez@empresa.com"
  },
  "message": "Asistencia registrada por reconocimiento facial"
}
```

### ❌ Respuestas de Error

| Código | Mensaje                              | Causa                                              |
| ------ | ------------------------------------ | -------------------------------------------------- |
| `404`  | "Usuario con código X no encontrado" | El código no existe en el sistema                  |
| `400`  | "Imagen vacía"                       | El archivo de imagen no contiene datos             |
| `400`  | "Imagen demasiado grande (máx 5MB)"  | El tamaño de la imagen excede el límite            |
| `400`  | "Rostro no coincide con el usuario"  | La cara detectada no pertenece al usuario indicado |
| `500`  | "Error en registro facial: ..."      | Error interno en el reconocimiento facial          |

---

## 3. PUT - Actualizar Asistencia

### 📌 Información General

- **Ruta:** `/asistencia/actualizar-manual/{asistencia_id}`
- **Método:** `PUT`
- **Descripción:** Actualiza un registro de asistencia existente. Solo administradores pueden actualizar. Se pueden modificar horas, estado y observaciones.
- **Autenticación:** Requerida (Administrador)

### 🔗 Parámetro de Ruta

| Parámetro       | Tipo      | Obligatorio | Descripción                                |
| --------------- | --------- | ----------- | ------------------------------------------ |
| `asistencia_id` | `integer` | ✅ Sí       | ID del registro de asistencia a actualizar |

### 📤 Body (JSON)

```json
{
  "hora_entrada": "08:30:00",
  "hora_salida": "17:15:00",
  "estado": "presente",
  "observaciones": "Actualización manual - corrección de horario"
}
```

### 🔍 Parámetros del Body

| Parámetro       | Tipo              | Obligatorio | Descripción                                                                |
| --------------- | ----------------- | ----------- | -------------------------------------------------------------------------- |
| `hora_entrada`  | `time` (HH:MM:SS) | ❌ No       | Hora de entrada                                                            |
| `hora_salida`   | `time` (HH:MM:SS) | ❌ No       | Hora de salida                                                             |
| `estado`        | `string`          | ❌ No       | Estado: `"presente"`, `"ausente"`, `"tarde"`, `"justificado"`, `"permiso"` |
| `observaciones` | `string`          | ❌ No       | Observaciones del registro                                                 |

### 📥 Query Parameters

**No aplica**

### ✅ Respuesta Exitosa (HTTP 200)

```json
{
  "data": {
    "id": 1,
    "user_id": 1,
    "horario_id": 5,
    "fecha": "2025-10-16",
    "hora_entrada": "08:30:00",
    "hora_salida": "17:15:00",
    "metodo_entrada": "manual",
    "metodo_salida": "manual",
    "estado": "presente",
    "tardanza": false,
    "minutos_tardanza": 0,
    "minutos_trabajados": 525,
    "horas_trabajadas_formato": "8:45",
    "justificacion_id": null,
    "observaciones": "Actualización manual - corrección de horario",
    "created_at": "2025-10-16T08:15:30.123456",
    "updated_at": "2025-10-16T14:30:00.987654",
    "nombre_usuario": "Juan Pérez",
    "codigo_usuario": "EMP001",
    "email_usuario": "juan.perez@empresa.com"
  },
  "message": "Asistencia actualizada exitosamente"
}
```

### ❌ Respuestas de Error

| Código | Mensaje                                                 | Causa                          |
| ------ | ------------------------------------------------------- | ------------------------------ |
| `404`  | "Asistencia con ID X no encontrada"                     | El ID de asistencia no existe  |
| `403`  | "Solo los administradores pueden actualizar asistencia" | El usuario no es administrador |
| `422`  | "Estado inválido"                                       | El estado enviado no es válido |
| `500`  | "Error al actualizar asistencia: ..."                   | Error interno del servidor     |

---

## 4. GET - Listar Todas las Asistencias

### 📌 Información General

- **Ruta:** `/asistencia/`
- **Método:** `GET`
- **Descripción:** Obtiene todas las asistencias del sistema con filtros opcionales y paginación.
- **Autenticación:** Requerida

### 🔍 Query Parameters

| Parámetro      | Tipo                | Obligatorio | Valores                                                  | Descripción                                     |
| -------------- | ------------------- | ----------- | -------------------------------------------------------- | ----------------------------------------------- |
| `page`         | `integer`           | ❌ No       | ≥ 1                                                      | Número de página (por defecto: 1)               |
| `page_size`    | `integer`           | ❌ No       | 1-100                                                    | Tamaño de página (por defecto: 10, máximo: 100) |
| `user_id`      | `integer`           | ❌ No       | -                                                        | Filtrar por ID de usuario específico            |
| `fecha_inicio` | `date` (YYYY-MM-DD) | ❌ No       | -                                                        | Fecha de inicio del rango de filtro             |
| `fecha_fin`    | `date` (YYYY-MM-DD) | ❌ No       | -                                                        | Fecha de fin del rango de filtro                |
| `estado`       | `string`            | ❌ No       | `presente`, `ausente`, `tarde`, `justificado`, `permiso` | Filtrar por estado de asistencia                |

### 📤 Ejemplos de Consulta

**Ejemplo 1: Obtener primera página con tamaño por defecto**

```
GET /asistencia/?page=1&page_size=10
```

**Ejemplo 2: Obtener asistencias de un usuario específico**

```
GET /asistencia/?user_id=1&page=1&page_size=20
```

**Ejemplo 3: Obtener asistencias de un rango de fechas**

```
GET /asistencia/?fecha_inicio=2025-10-01&fecha_fin=2025-10-16&page=1&page_size=15
```

**Ejemplo 4: Obtener asistencias tarde de un usuario en un período**

```
GET /asistencia/?user_id=1&estado=tarde&fecha_inicio=2025-10-01&fecha_fin=2025-10-16&page=1&page_size=10
```

### ✅ Respuesta Exitosa (HTTP 200)

```json
{
  "data": {
    "records": [
      {
        "id": 1,
        "user_id": 1,
        "horario_id": 5,
        "fecha": "2025-10-16",
        "hora_entrada": "08:30:00",
        "hora_salida": "17:15:00",
        "metodo_entrada": "manual",
        "metodo_salida": "manual",
        "estado": "presente",
        "tardanza": false,
        "minutos_tardanza": 0,
        "minutos_trabajados": 525,
        "horas_trabajadas_formato": "8:45",
        "justificacion_id": null,
        "observaciones": "Registro manual",
        "created_at": "2025-10-16T08:15:30.123456",
        "updated_at": "2025-10-16T14:30:00.987654",
        "nombre_usuario": "Juan Pérez",
        "codigo_usuario": "EMP001",
        "email_usuario": "juan.perez@empresa.com"
      },
      {
        "id": 2,
        "user_id": 2,
        "horario_id": 5,
        "fecha": "2025-10-16",
        "hora_entrada": "08:45:00",
        "hora_salida": "17:30:00",
        "metodo_entrada": "facial",
        "metodo_salida": "facial",
        "estado": "presente",
        "tardanza": false,
        "minutos_tardanza": 0,
        "minutos_trabajados": 525,
        "horas_trabajadas_formato": "8:45",
        "justificacion_id": null,
        "observaciones": null,
        "created_at": "2025-10-16T08:45:15.654321",
        "updated_at": "2025-10-16T17:30:10.555555",
        "nombre_usuario": "María García",
        "codigo_usuario": "EMP002",
        "email_usuario": "maria.garcia@empresa.com"
      }
    ],
    "totalRecords": 125,
    "totalPages": 13,
    "currentPage": 1
  },
  "message": "Asistencias obtenidas exitosamente"
}
```

### ❌ Respuestas de Error

| Código | Mensaje                              | Causa                                      |
| ------ | ------------------------------------ | ------------------------------------------ |
| `404`  | "Usuario con ID X no encontrado"     | El user_id del filtro no existe            |
| `400`  | "Fecha inválida"                     | Formato de fecha incorrecto                |
| `400`  | "page_size no puede ser mayor a 100" | Se solicitó un tamaño de página muy grande |
| `500`  | "Error al obtener asistencias: ..."  | Error interno del servidor                 |

---

## 5. GET - Obtener Asistencias por Usuario

### 📌 Información General

- **Ruta:** `/asistencia/usuario/{user_id}`
- **Método:** `GET`
- **Descripción:** Obtiene todas las asistencias de un usuario específico con paginación.
- **Autenticación:** Requerida

### 🔗 Parámetro de Ruta

| Parámetro | Tipo      | Obligatorio | Descripción    |
| --------- | --------- | ----------- | -------------- |
| `user_id` | `integer` | ✅ Sí       | ID del usuario |

### 🔍 Query Parameters

| Parámetro      | Tipo                | Obligatorio | Valores | Descripción                                     |
| -------------- | ------------------- | ----------- | ------- | ----------------------------------------------- |
| `page`         | `integer`           | ❌ No       | ≥ 1     | Número de página (por defecto: 1)               |
| `pageSize`     | `integer`           | ❌ No       | 1-100   | Tamaño de página (por defecto: 10, máximo: 100) |
| `fecha_inicio` | `date` (YYYY-MM-DD) | ❌ No       | -       | Fecha de inicio del rango                       |
| `fecha_fin`    | `date` (YYYY-MM-DD) | ❌ No       | -       | Fecha de fin del rango                          |

### 📤 Ejemplos de Consulta

**Ejemplo 1: Obtener primeras 10 asistencias del usuario**

```
GET /asistencia/usuario/1?page=1&pageSize=10
```

**Ejemplo 2: Obtener asistencias de un usuario en un período específico**

```
GET /asistencia/usuario/1?fecha_inicio=2025-10-01&fecha_fin=2025-10-16&page=1&pageSize=15
```

**Ejemplo 3: Obtener segunda página con 20 registros por página**

```
GET /asistencia/usuario/1?page=2&pageSize=20
```

### ✅ Respuesta Exitosa (HTTP 200)

```json
{
  "data": {
    "records": [
      {
        "id": 1,
        "user_id": 1,
        "horario_id": 5,
        "fecha": "2025-10-16",
        "hora_entrada": "08:30:00",
        "hora_salida": "17:15:00",
        "metodo_entrada": "manual",
        "metodo_salida": "manual",
        "estado": "presente",
        "tardanza": false,
        "minutos_tardanza": 0,
        "minutos_trabajados": 525,
        "horas_trabajadas_formato": "8:45",
        "justificacion_id": null,
        "observaciones": "Registro manual",
        "created_at": "2025-10-16T08:15:30.123456",
        "updated_at": "2025-10-16T14:30:00.987654",
        "nombre_usuario": "Juan Pérez",
        "codigo_usuario": "EMP001",
        "email_usuario": "juan.perez@empresa.com"
      }
    ],
    "totalRecords": 20,
    "totalPages": 2,
    "currentPage": 1
  },
  "message": "Asistencias del usuario Juan Pérez obtenidas exitosamente"
}
```

### ❌ Respuestas de Error

| Código | Mensaje                             | Causa                                      |
| ------ | ----------------------------------- | ------------------------------------------ |
| `404`  | "Usuario con ID X no encontrado"    | El user_id no existe                       |
| `400`  | "Fecha inválida"                    | Formato de fecha incorrecto                |
| `400`  | "pageSize no puede ser mayor a 100" | Se solicitó un tamaño de página muy grande |
| `500`  | "Error al obtener asistencias: ..." | Error interno del servidor                 |

---

## 6. GET - Obtener Asistencia por ID

### 📌 Información General

- **Ruta:** `/asistencia/{asistencia_id}`
- **Método:** `GET`
- **Descripción:** Obtiene un registro de asistencia específico por su ID.
- **Autenticación:** Requerida

### 🔗 Parámetro de Ruta

| Parámetro       | Tipo      | Obligatorio | Descripción                   |
| --------------- | --------- | ----------- | ----------------------------- |
| `asistencia_id` | `integer` | ✅ Sí       | ID del registro de asistencia |

### 🔍 Query Parameters

**No aplica**

### 📤 Ejemplo de Consulta

```
GET /asistencia/1
```

### ✅ Respuesta Exitosa (HTTP 200)

```json
{
  "data": {
    "id": 1,
    "user_id": 1,
    "horario_id": 5,
    "fecha": "2025-10-16",
    "hora_entrada": "08:30:00",
    "hora_salida": "17:15:00",
    "metodo_entrada": "manual",
    "metodo_salida": "manual",
    "estado": "presente",
    "tardanza": false,
    "minutos_tardanza": 0,
    "minutos_trabajados": 525,
    "horas_trabajadas_formato": "8:45",
    "justificacion_id": null,
    "observaciones": "Registro manual",
    "created_at": "2025-10-16T08:15:30.123456",
    "updated_at": "2025-10-16T14:30:00.987654",
    "nombre_usuario": "Juan Pérez",
    "codigo_usuario": "EMP001",
    "email_usuario": "juan.perez@empresa.com"
  },
  "message": "Asistencia obtenida exitosamente"
}
```

### ❌ Respuestas de Error

| Código | Mensaje                             | Causa                      |
| ------ | ----------------------------------- | -------------------------- |
| `404`  | "Asistencia con ID X no encontrada" | El asistencia_id no existe |
| `500`  | "Error al obtener asistencia: ..."  | Error interno del servidor |

---

## 7. DELETE - Eliminar Asistencia

### 📌 Información General

- **Ruta:** `/asistencia/{asistencia_id}`
- **Método:** `DELETE`
- **Descripción:** Elimina un registro de asistencia del sistema. Solo administradores.
- **Autenticación:** Requerida (Administrador)

### 🔗 Parámetro de Ruta

| Parámetro       | Tipo      | Obligatorio | Descripción                              |
| --------------- | --------- | ----------- | ---------------------------------------- |
| `asistencia_id` | `integer` | ✅ Sí       | ID del registro de asistencia a eliminar |

### 🔍 Query Parameters

**No aplica**

### 📤 Ejemplo de Consulta

```
DELETE /asistencia/1
```

### ✅ Respuesta Exitosa (HTTP 200)

```json
{
  "message": "Asistencia eliminada exitosamente"
}
```

### ❌ Respuestas de Error

| Código | Mensaje                                               | Causa                          |
| ------ | ----------------------------------------------------- | ------------------------------ |
| `404`  | "Asistencia con ID X no encontrada"                   | El asistencia_id no existe     |
| `403`  | "Solo los administradores pueden eliminar asistencia" | El usuario no es administrador |
| `500`  | "Error al eliminar asistencia: ..."                   | Error interno del servidor     |

---

## 📊 Resumen de Rutas

| Método   | Ruta                                 | Descripción                        | Auth     |
| -------- | ------------------------------------ | ---------------------------------- | -------- |
| `POST`   | `/asistencia/registrar-manual`       | Registra asistencia manualmente    | Admin ✅ |
| `POST`   | `/asistencia/registro-facial`        | Registra por reconocimiento facial | ❌       |
| `PUT`    | `/asistencia/actualizar-manual/{id}` | Actualiza un registro              | Admin ✅ |
| `GET`    | `/asistencia/`                       | Lista todas las asistencias        | ✅       |
| `GET`    | `/asistencia/usuario/{user_id}`      | Lista asistencias de un usuario    | ✅       |
| `GET`    | `/asistencia/{asistencia_id}`        | Obtiene una asistencia específica  | ✅       |
| `DELETE` | `/asistencia/{asistencia_id}`        | Elimina una asistencia             | Admin ✅ |

---

## 🔐 Notas de Seguridad

- **Registro Manual:** Solo administradores pueden registrar manualmente.
- **Fechas y Horas:** El servidor controla automáticamente estos valores por seguridad.
- **Validación Automática:** El estado se calcula automáticamente según la tardanza.
- **Autenticación:** La mayoría de rutas requieren autenticación (JWT).

---

**Última actualización:** 16 de octubre de 2025
