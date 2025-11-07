# 📊 Rutas HTTP - Controlador de Reportes

**Prefijo Base:** `/reportes`

---

## 📑 Tabla de Contenidos

1. [GET - Generar Reporte Diario](#1-get---generar-reporte-diario)
2. [GET - Generar Reporte Semanal](#2-get---generar-reporte-semanal)
3. [GET - Generar Reporte Mensual](#3-get---generar-reporte-mensual)
4. [GET - Generar Reporte de Tardanzas](#4-get---generar-reporte-de-tardanzas)
5. [GET - Generar Reporte de Inasistencias](#5-get---generar-reporte-de-inasistencias)
6. [GET - Listar Reportes Generados](#6-get---listar-reportes-generados)
7. [GET - Descargar Reporte](#7-get---descargar-reporte)
8. [DELETE - Eliminar Reporte](#8-delete---eliminar-reporte)

---

## 1. GET - Generar Reporte Diario

### 📌 Información General

- **Ruta:** `/reportes/diario`
- **Método:** `GET`
- **Descripción:** Genera un reporte diario de asistencia para una fecha específica. Puede incluir todos los usuarios o uno en particular.
- **Requerimiento:** #11 - Reporte diario de asistencia
- **Autenticación:** Requerida (Administrador)

### 🔍 Query Parameters

| Parámetro      | Tipo                | Obligatorio | Valores                | Descripción                                                   |
| -------------- | ------------------- | ----------- | ---------------------- | ------------------------------------------------------------- |
| `fecha`        | `date` (YYYY-MM-DD) | ✅ Sí       | -                      | Fecha del reporte (no puede ser futura)                       |
| `user_id`      | `integer`           | ❌ No       | -                      | ID del usuario específico (si no se envía, genera para todos) |
| `formato`      | `string`            | ❌ No       | `pdf`, `excel`, `both` | Formato de salida (default: both)                             |
| `enviar_email` | `boolean`           | ❌ No       | `true`, `false`        | Enviar reporte por email (default: false)                     |

### 📤 Ejemplos de Consulta

**Ejemplo 1: Generar reporte diario para todos los usuarios**

```
GET /reportes/diario?fecha=2025-10-16
```

**Ejemplo 2: Generar reporte diario para un usuario específico en PDF**

```
GET /reportes/diario?fecha=2025-10-16&user_id=1&formato=pdf
```

**Ejemplo 3: Generar reporte diario en Excel para todos los usuarios**

```
GET /reportes/diario?fecha=2025-10-16&formato=excel
```

**Ejemplo 4: Generar reporte diario y enviar por email**

```
GET /reportes/diario?fecha=2025-10-16&enviar_email=true
```

### ✅ Respuesta Exitosa (HTTP 200)

```json
{
  "success": true,
  "message": "Reporte generado exitosamente",
  "fecha": "2025-10-16",
  "archivos": {
    "pdf": "/reportes/descargar/diarios/reporte_2025-10-16.pdf",
    "excel": "/reportes/descargar/diarios/reporte_2025-10-16.xlsx"
  },
  "generado_por": "Carlos López",
  "timestamp": "2025-10-16T14:35:22.123456"
}
```

### ❌ Respuestas de Error

| Código | Mensaje                                                           | Causa                       |
| ------ | ----------------------------------------------------------------- | --------------------------- |
| `400`  | "No se pueden generar reportes de fechas futuras"                 | La fecha es posterior a hoy |
| `403`  | "No tienes permisos para generar reportes. Solo administradores." | Usuario no es administrador |
| `404`  | "Usuario no encontrado"                                           | El user_id no existe        |
| `500`  | "Error al generar reporte: ..."                                   | Error interno del servidor  |

---

## 2. GET - Generar Reporte Semanal

### 📌 Información General

- **Ruta:** `/reportes/semanal`
- **Método:** `GET`
- **Descripción:** Genera un reporte semanal de asistencia (lunes a domingo). Puede incluir todos los usuarios o uno en particular.
- **Requerimiento:** #12 - Reporte semanal de asistencia
- **Autenticación:** Requerida (Administrador)

### 🔍 Query Parameters

| Parámetro      | Tipo                | Obligatorio | Valores                | Descripción                                          |
| -------------- | ------------------- | ----------- | ---------------------- | ---------------------------------------------------- |
| `fecha_inicio` | `date` (YYYY-MM-DD) | ✅ Sí       | -                      | Fecha de inicio de la semana (preferiblemente lunes) |
| `user_id`      | `integer`           | ❌ No       | -                      | ID del usuario específico (opcional)                 |
| `formato`      | `string`            | ❌ No       | `pdf`, `excel`, `both` | Formato de salida (default: both)                    |
| `enviar_email` | `boolean`           | ❌ No       | `true`, `false`        | Enviar reporte por email (default: false)            |

### 📤 Ejemplos de Consulta

**Ejemplo 1: Generar reporte semanal de la semana actual**

```
GET /reportes/semanal?fecha_inicio=2025-10-13
```

**Ejemplo 2: Generar reporte semanal para un usuario específico**

```
GET /reportes/semanal?fecha_inicio=2025-10-13&user_id=1&formato=pdf
```

**Ejemplo 3: Generar reporte semanal en Excel**

```
GET /reportes/semanal?fecha_inicio=2025-10-13&formato=excel
```

**Ejemplo 4: Generar y enviar por email**

```
GET /reportes/semanal?fecha_inicio=2025-10-13&enviar_email=true
```

### ✅ Respuesta Exitosa (HTTP 200)

```json
{
  "success": true,
  "message": "Reporte semanal generado exitosamente",
  "fecha_inicio": "2025-10-13",
  "fecha_fin": "2025-10-16",
  "archivos": {
    "pdf": "/reportes/descargar/semanales/reporte_semana_2025-10-13.pdf",
    "excel": "/reportes/descargar/semanales/reporte_semana_2025-10-13.xlsx"
  },
  "generado_por": "Carlos López",
  "timestamp": "2025-10-16T14:40:15.654321"
}
```

### ❌ Respuestas de Error

| Código | Mensaje                                                           | Causa                       |
| ------ | ----------------------------------------------------------------- | --------------------------- |
| `403`  | "No tienes permisos para generar reportes. Solo administradores." | Usuario no es administrador |
| `404`  | "Usuario no encontrado"                                           | El user_id no existe        |
| `500`  | "Error al generar reporte semanal: ..."                           | Error interno del servidor  |

---

## 3. GET - Generar Reporte Mensual

### 📌 Información General

- **Ruta:** `/reportes/mensual`
- **Método:** `GET`
- **Descripción:** Genera un reporte mensual de asistencia para un año y mes específicos.
- **Requerimiento:** #13 - Reporte mensual de asistencia
- **Autenticación:** Requerida (Administrador)

### 🔍 Query Parameters

| Parámetro      | Tipo      | Obligatorio | Valores                | Descripción                               |
| -------------- | --------- | ----------- | ---------------------- | ----------------------------------------- |
| `anio`         | `integer` | ✅ Sí       | 2000-2100              | Año del reporte                           |
| `mes`          | `integer` | ✅ Sí       | 1-12                   | Mes del reporte (1=enero, 12=diciembre)   |
| `user_id`      | `integer` | ❌ No       | -                      | ID del usuario específico (opcional)      |
| `formato`      | `string`  | ❌ No       | `pdf`, `excel`, `both` | Formato de salida (default: both)         |
| `enviar_email` | `boolean` | ❌ No       | `true`, `false`        | Enviar reporte por email (default: false) |

### 📤 Ejemplos de Consulta

**Ejemplo 1: Generar reporte de octubre de 2025**

```
GET /reportes/mensual?anio=2025&mes=10
```

**Ejemplo 2: Generar reporte mensual para un usuario en PDF**

```
GET /reportes/mensual?anio=2025&mes=10&user_id=1&formato=pdf
```

**Ejemplo 3: Generar reporte en Excel**

```
GET /reportes/mensual?anio=2025&mes=10&formato=excel
```

**Ejemplo 4: Generar y enviar por email**

```
GET /reportes/mensual?anio=2025&mes=10&enviar_email=true
```

### ✅ Respuesta Exitosa (HTTP 200)

```json
{
  "success": true,
  "message": "Reporte mensual de Octubre 2025 generado exitosamente",
  "anio": 2025,
  "mes": 10,
  "mes_nombre": "Octubre",
  "archivos": {
    "pdf": "/reportes/descargar/mensuales/reporte_2025-10.pdf",
    "excel": "/reportes/descargar/mensuales/reporte_2025-10.xlsx"
  },
  "generado_por": "Carlos López",
  "timestamp": "2025-10-16T14:45:30.123456"
}
```

### ❌ Respuestas de Error

| Código | Mensaje                                                           | Causa                       |
| ------ | ----------------------------------------------------------------- | --------------------------- |
| `400`  | "No se pueden generar reportes de meses futuros"                  | Mes/año posterior al actual |
| `403`  | "No tienes permisos para generar reportes. Solo administradores." | Usuario no es administrador |
| `404`  | "Usuario no encontrado"                                           | El user_id no existe        |
| `500`  | "Error al generar reporte mensual: ..."                           | Error interno del servidor  |

---

## 4. GET - Generar Reporte de Tardanzas

### 📌 Información General

- **Ruta:** `/reportes/tardanzas`
- **Método:** `GET`
- **Descripción:** Genera un reporte consolidado de todas las tardanzas en un período específico.
- **Requerimiento:** #14 - Reporte de tardanzas acumuladas
- **Autenticación:** Requerida (Administrador)

### 🔍 Query Parameters

| Parámetro      | Tipo                | Obligatorio | Valores                | Descripción                               |
| -------------- | ------------------- | ----------- | ---------------------- | ----------------------------------------- |
| `fecha_inicio` | `date` (YYYY-MM-DD) | ✅ Sí       | -                      | Fecha de inicio del período               |
| `fecha_fin`    | `date` (YYYY-MM-DD) | ✅ Sí       | -                      | Fecha de fin del período                  |
| `user_id`      | `integer`           | ❌ No       | -                      | ID del usuario específico (opcional)      |
| `formato`      | `string`            | ❌ No       | `pdf`, `excel`, `both` | Formato de salida (default: both)         |
| `enviar_email` | `boolean`           | ❌ No       | `true`, `false`        | Enviar reporte por email (default: false) |

### 📤 Ejemplos de Consulta

**Ejemplo 1: Reporte de tardanzas del mes de octubre**

```
GET /reportes/tardanzas?fecha_inicio=2025-10-01&fecha_fin=2025-10-31
```

**Ejemplo 2: Reporte de tardanzas de un usuario específico**

```
GET /reportes/tardanzas?fecha_inicio=2025-10-01&fecha_fin=2025-10-31&user_id=1&formato=pdf
```

**Ejemplo 3: Reporte de tardanzas en Excel**

```
GET /reportes/tardanzas?fecha_inicio=2025-10-01&fecha_fin=2025-10-31&formato=excel
```

### ✅ Respuesta Exitosa (HTTP 200)

```json
{
  "success": true,
  "message": "Reporte de tardanzas generado exitosamente",
  "fecha_inicio": "2025-10-01",
  "fecha_fin": "2025-10-31",
  "archivos": {
    "pdf": "/reportes/descargar/tardanzas/reporte_tardanzas_2025-10.pdf",
    "excel": "/reportes/descargar/tardanzas/reporte_tardanzas_2025-10.xlsx"
  },
  "generado_por": "Carlos López",
  "timestamp": "2025-10-16T15:00:45.123456"
}
```

### ❌ Respuestas de Error

| Código | Mensaje                                                           | Causa                           |
| ------ | ----------------------------------------------------------------- | ------------------------------- |
| `400`  | "La fecha de inicio no puede ser posterior a la fecha de fin"     | Rango de fechas inválido        |
| `400`  | "La fecha de fin no puede ser futura"                             | Fecha de fin es posterior a hoy |
| `403`  | "No tienes permisos para generar reportes. Solo administradores." | Usuario no es administrador     |
| `404`  | "Usuario no encontrado"                                           | El user_id no existe            |
| `500`  | "Error al generar reporte de tardanzas: ..."                      | Error interno del servidor      |

---

## 5. GET - Generar Reporte de Inasistencias

### 📌 Información General

- **Ruta:** `/reportes/inasistencias`
- **Método:** `GET`
- **Descripción:** Genera un reporte consolidado de todas las inasistencias en un período específico.
- **Requerimiento:** #15 - Reporte de inasistencias
- **Autenticación:** Requerida (Administrador)

### 🔍 Query Parameters

| Parámetro      | Tipo                | Obligatorio | Valores                | Descripción                               |
| -------------- | ------------------- | ----------- | ---------------------- | ----------------------------------------- |
| `fecha_inicio` | `date` (YYYY-MM-DD) | ✅ Sí       | -                      | Fecha de inicio del período               |
| `fecha_fin`    | `date` (YYYY-MM-DD) | ✅ Sí       | -                      | Fecha de fin del período                  |
| `user_id`      | `integer`           | ❌ No       | -                      | ID del usuario específico (opcional)      |
| `formato`      | `string`            | ❌ No       | `pdf`, `excel`, `both` | Formato de salida (default: both)         |
| `enviar_email` | `boolean`           | ❌ No       | `true`, `false`        | Enviar reporte por email (default: false) |

### 📤 Ejemplos de Consulta

**Ejemplo 1: Reporte de inasistencias del mes de octubre**

```
GET /reportes/inasistencias?fecha_inicio=2025-10-01&fecha_fin=2025-10-31
```

**Ejemplo 2: Reporte de inasistencias de un usuario en PDF**

```
GET /reportes/inasistencias?fecha_inicio=2025-10-01&fecha_fin=2025-10-31&user_id=1&formato=pdf
```

**Ejemplo 3: Reporte de inasistencias en Excel**

```
GET /reportes/inasistencias?fecha_inicio=2025-10-01&fecha_fin=2025-10-31&formato=excel
```

### ✅ Respuesta Exitosa (HTTP 200)

```json
{
  "success": true,
  "message": "Reporte de inasistencias generado exitosamente",
  "fecha_inicio": "2025-10-01",
  "fecha_fin": "2025-10-31",
  "archivos": {
    "pdf": "/reportes/descargar/inasistencias/reporte_inasistencias_2025-10.pdf",
    "excel": "/reportes/descargar/inasistencias/reporte_inasistencias_2025-10.xlsx"
  },
  "generado_por": "Carlos López",
  "timestamp": "2025-10-16T15:05:20.654321"
}
```

### ❌ Respuestas de Error

| Código | Mensaje                                                           | Causa                           |
| ------ | ----------------------------------------------------------------- | ------------------------------- |
| `400`  | "La fecha de inicio no puede ser posterior a la fecha de fin"     | Rango de fechas inválido        |
| `400`  | "La fecha de fin no puede ser futura"                             | Fecha de fin es posterior a hoy |
| `403`  | "No tienes permisos para generar reportes. Solo administradores." | Usuario no es administrador     |
| `404`  | "Usuario no encontrado"                                           | El user_id no existe            |
| `500`  | "Error al generar reporte de inasistencias: ..."                  | Error interno del servidor      |

---

## 6. GET - Listar Reportes Generados

### 📌 Información General

- **Ruta:** `/reportes/listar`
- **Método:** `GET`
- **Descripción:** Lista todos los reportes que han sido generados previamente, ordenados por fecha de creación (más recientes primero).
- **Autenticación:** Requerida (Administrador)

### 🔍 Query Parameters

| Parámetro | Tipo      | Obligatorio | Valores                                                      | Descripción                                        |
| --------- | --------- | ----------- | ------------------------------------------------------------ | -------------------------------------------------- |
| `tipo`    | `string`  | ❌ No       | `diario`, `semanal`, `mensual`, `tardanzas`, `inasistencias` | Filtrar por tipo de reporte                        |
| `limite`  | `integer` | ❌ No       | 1-200                                                        | Número máximo de reportes a retornar (default: 50) |

### 📤 Ejemplos de Consulta

**Ejemplo 1: Listar todos los reportes**

```
GET /reportes/listar
```

**Ejemplo 2: Listar solo reportes diarios**

```
GET /reportes/listar?tipo=diario
```

**Ejemplo 3: Listar reportes mensuales con límite de 100**

```
GET /reportes/listar?tipo=mensual&limite=100
```

**Ejemplo 4: Listar reportes de tardanzas**

```
GET /reportes/listar?tipo=tardanzas&limite=25
```

### ✅ Respuesta Exitosa (HTTP 200)

```json
{
  "success": true,
  "total": 3,
  "reportes": [
    {
      "nombre": "reporte_2025-10-16.pdf",
      "ruta": "diarios/reporte_2025-10-16.pdf",
      "tipo": "diarios",
      "formato": "pdf",
      "tamano": 245632,
      "fecha_creacion": "2025-10-16T14:35:22.123456",
      "url_descarga": "/reportes/descargar/diarios/reporte_2025-10-16.pdf"
    },
    {
      "nombre": "reporte_2025-10-16.xlsx",
      "ruta": "diarios/reporte_2025-10-16.xlsx",
      "tipo": "diarios",
      "formato": "xlsx",
      "tamano": 156234,
      "fecha_creacion": "2025-10-16T14:35:25.654321",
      "url_descarga": "/reportes/descargar/diarios/reporte_2025-10-16.xlsx"
    },
    {
      "nombre": "reporte_semana_2025-10-13.pdf",
      "ruta": "semanales/reporte_semana_2025-10-13.pdf",
      "tipo": "semanales",
      "formato": "pdf",
      "tamano": 512456,
      "fecha_creacion": "2025-10-16T14:40:15.123456",
      "url_descarga": "/reportes/descargar/semanales/reporte_semana_2025-10-13.pdf"
    }
  ]
}
```

### ❌ Respuestas de Error

| Código | Mensaje                                                           | Causa                       |
| ------ | ----------------------------------------------------------------- | --------------------------- |
| `403`  | "No tienes permisos para generar reportes. Solo administradores." | Usuario no es administrador |
| `500`  | "Error al listar reportes: ..."                                   | Error interno del servidor  |

---

## 7. GET - Descargar Reporte

### 📌 Información General

- **Ruta:** `/reportes/descargar/{ruta}`
- **Método:** `GET`
- **Descripción:** Descarga un reporte generado previamente. La ruta se obtiene del listado de reportes.
- **Autenticación:** Requerida (Administrador)
- **Retorna:** Archivo (PDF o Excel)

### 🔗 Parámetro de Ruta

| Parámetro | Tipo     | Obligatorio | Descripción                                                      |
| --------- | -------- | ----------- | ---------------------------------------------------------------- |
| `ruta`    | `string` | ✅ Sí       | Ruta relativa del archivo (ej: `diarios/reporte_2025-10-16.pdf`) |

### 📤 Ejemplos de Consulta

**Ejemplo 1: Descargar reporte diario en PDF**

```
GET /reportes/descargar/diarios/reporte_2025-10-16.pdf
```

**Ejemplo 2: Descargar reporte semanal en Excel**

```
GET /reportes/descargar/semanales/reporte_semana_2025-10-13.xlsx
```

**Ejemplo 3: Descargar reporte de tardanzas**

```
GET /reportes/descargar/tardanzas/reporte_tardanzas_2025-10.pdf
```

### ✅ Respuesta Exitosa (HTTP 200)

**El archivo se descarga directamente al cliente**

- Content-Type: `application/pdf` (para PDF) o `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (para Excel)
- Content-Disposition: `attachment; filename="reporte_2025-10-16.pdf"`

### ❌ Respuestas de Error

| Código | Mensaje                                                           | Causa                                                      |
| ------ | ----------------------------------------------------------------- | ---------------------------------------------------------- |
| `404`  | "Reporte no encontrado"                                           | El archivo no existe                                       |
| `403`  | "Acceso denegado"                                                 | Intento de acceso a archivo fuera del directorio permitido |
| `403`  | "No tienes permisos para generar reportes. Solo administradores." | Usuario no es administrador                                |
| `500`  | "Error al descargar reporte: ..."                                 | Error interno del servidor                                 |

---

## 8. DELETE - Eliminar Reporte

### 📌 Información General

- **Ruta:** `/reportes/eliminar/{ruta}`
- **Método:** `DELETE`
- **Descripción:** Elimina un reporte generado previamente. Esta acción es irreversible.
- **Autenticación:** Requerida (Administrador)

### 🔗 Parámetro de Ruta

| Parámetro | Tipo     | Obligatorio | Descripción                                                      |
| --------- | -------- | ----------- | ---------------------------------------------------------------- |
| `ruta`    | `string` | ✅ Sí       | Ruta relativa del archivo (ej: `diarios/reporte_2025-10-16.pdf`) |

### 📤 Ejemplos de Consulta

**Ejemplo 1: Eliminar reporte diario en PDF**

```
DELETE /reportes/eliminar/diarios/reporte_2025-10-16.pdf
```

**Ejemplo 2: Eliminar reporte semanal en Excel**

```
DELETE /reportes/eliminar/semanales/reporte_semana_2025-10-13.xlsx
```

### ✅ Respuesta Exitosa (HTTP 200)

```json
{
  "success": true,
  "message": "Reporte 'reporte_2025-10-16.pdf' eliminado exitosamente",
  "eliminado_por": "Carlos López",
  "timestamp": "2025-10-16T15:10:30.123456"
}
```

### ❌ Respuestas de Error

| Código | Mensaje                                                           | Causa                                                      |
| ------ | ----------------------------------------------------------------- | ---------------------------------------------------------- |
| `404`  | "Reporte no encontrado"                                           | El archivo no existe                                       |
| `403`  | "Acceso denegado"                                                 | Intento de acceso a archivo fuera del directorio permitido |
| `403`  | "No tienes permisos para generar reportes. Solo administradores." | Usuario no es administrador                                |
| `500`  | "Error al eliminar reporte: ..."                                  | Error interno del servidor                                 |

---

## 📊 Resumen de Rutas

| Método   | Ruta                         | Descripción                     | Auth     |
| -------- | ---------------------------- | ------------------------------- | -------- |
| `GET`    | `/reportes/diario`           | Genera reporte diario           | Admin ✅ |
| `GET`    | `/reportes/semanal`          | Genera reporte semanal          | Admin ✅ |
| `GET`    | `/reportes/mensual`          | Genera reporte mensual          | Admin ✅ |
| `GET`    | `/reportes/tardanzas`        | Genera reporte de tardanzas     | Admin ✅ |
| `GET`    | `/reportes/inasistencias`    | Genera reporte de inasistencias | Admin ✅ |
| `GET`    | `/reportes/listar`           | Lista reportes generados        | Admin ✅ |
| `GET`    | `/reportes/descargar/{ruta}` | Descarga un reporte             | Admin ✅ |
| `DELETE` | `/reportes/eliminar/{ruta}`  | Elimina un reporte              | Admin ✅ |

---

## 📋 Formatos de Reportes

```
pdf          - Formato PDF (mejor para visualización e impresión)
excel        - Formato Excel/XLSX (mejor para análisis de datos)
both         - Genera ambos formatos (default)
```

---

## 📁 Estructura de Directorios

Los reportes se organizan por tipo en los siguientes subdirectorios:

```
reportes/
├── diarios/           # Reportes diarios
├── semanales/         # Reportes semanales
├── mensuales/         # Reportes mensuales
├── tardanzas/         # Reportes de tardanzas
└── inasistencias/     # Reportes de inasistencias
```

---

## 🔐 Notas de Seguridad

- **Solo Administradores:** Todos los endpoints de reportes requieren autenticación de administrador.
- **Validación de Rutas:** Se valida que los archivos estén dentro del directorio permitido (prevención de path traversal).
- **Fechas:** No se pueden generar reportes de fechas futuras.
- **Email:** La opción de envío por email requiere configuración previa del servicio de email.
- **Auditoría:** Se registra quién generó/eliminó cada reporte.

---

## 💡 Casos de Uso

### Generar Reportes Diarios

```
GET /reportes/diario?fecha=2025-10-16&formato=pdf
```

### Generar Reportes Semanales Automatizados

```
GET /reportes/semanal?fecha_inicio=2025-10-13&enviar_email=true
```

### Analisar Tardanzas del Mes

```
GET /reportes/tardanzas?fecha_inicio=2025-10-01&fecha_fin=2025-10-31&formato=excel
```

### Verificar Inasistencias de un Empleado

```
GET /reportes/inasistencias?fecha_inicio=2025-10-01&fecha_fin=2025-10-31&user_id=5
```

### Limpiar Reportes Antiguos

Listar, verificar y eliminar reportes no necesarios:

```
GET /reportes/listar?limite=100
DELETE /reportes/eliminar/diarios/reporte_2025-09-01.pdf
```

---

## 📊 Información en los Reportes

### Reportes Diarios

- Asistencias del día
- Tardanzas registradas
- Ausencias
- Justificaciones
- Horas trabajadas por usuario

### Reportes Semanales

- Resumen de toda la semana
- Total de horas trabajadas
- Tendencia de tardanzas
- Ausencias justificadas vs unjustificadas

### Reportes Mensuales

- Resumen completo del mes
- Estadísticas por usuario
- Comparativa con meses anteriores
- Indicadores de desempeño

### Reportes de Tardanzas

- Fecha y hora de cada tardanza
- Minutos de retraso
- Usuario y turno
- Justificación (si aplica)

### Reportes de Inasistencias

- Fecha de inasistencia
- Usuario
- Justificación
- Estado (pendiente, aprobada, rechazada)

---

**Última actualización:** 16 de octubre de 2025
