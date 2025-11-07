# Integración Completa del Controlador de Asistencias

## 📋 Resumen

Se ha realizado la integración completa del controlador de asistencias del backend con el cliente Next.js/React. Se incluyen todas las funcionalidades: listado, consulta, edición y eliminación de registros de asistencia.

**Rutas Excluidas (manejadas separadamente):**

- ❌ POST `/asistencia/registrar-manual` - Registro manual de asistencias
- ❌ POST `/asistencia/registro-facial` - Reconocimiento facial
- ❌ PUT `/asistencia/actualizar-manual` - Actualización manual

---

## 🗂️ Estructura de Carpetas Creadas

### Cliente (Usuario Regular)

```
client/src/app/client/asistencias/
├── page.tsx                          # Listado de mis asistencias con filtros
└── [id]/
    └── page.tsx                      # Detalle de asistencia
```

### Admin (Administrador)

```
client/src/app/admin/asistencias/
├── page.tsx                          # Listado completo con tabla y acciones ✅ YA EXISTÍA
├── [id]/
│   ├── page.tsx                      # Detalle con acciones Editar/Eliminar
│   └── edit/
│       └── page.tsx                  # Editar asistencia
```

---

## 🔧 Archivos Creados/Modificados

### 1. Hook Principal: `useAsistenciasApi.hook.ts`

**Ubicación:** `/client/src/hooks/useAsistenciasApi.hook.ts`

**Funcionalidades:**

- ✅ `list()` - Listar mis asistencias con filtros (PROTECTED)

  - Parámetros: `page`, `pageSize`, `filters?: { fecha_inicio, fecha_fin, estado }`
  - Retorna: `{ records: AsistenciaList[], total: number }`

- ✅ `listAdmin()` - Listar todas las asistencias (ADMIN)

  - Parámetros: `page`, `pageSize`, `filters?: { user_id, fecha_inicio, fecha_fin, estado }`
  - Retorna: `{ records: AsistenciaList[], total: number }`

- ✅ `getDetail()` - Obtener detalle por ID (PROTECTED/ADMIN)

  - Parámetro: `id: number`
  - Retorna: `AsistenciaDetails`

- ✅ `getByUser()` - Obtener asistencias de un usuario (PROTECTED/ADMIN)

  - Parámetros: `userId, page, pageSize, filters?: { fecha_inicio, fecha_fin }`
  - Retorna: `{ records: AsistenciaList[], total: number }`

- ✅ `update()` - Actualizar asistencia (ADMIN)

  - Parámetros: `id, data: Partial<AsistenciaUpdate>`
  - Campos actualizables: `hora_entrada`, `hora_salida`, `estado`, `observaciones`

- ✅ `delete_()` - Eliminar asistencia (ADMIN)
  - Parámetro: `id: number`

---

## 📄 Páginas del Cliente (Usuario)

### 1. Listado: `client/asistencias/page.tsx`

**Características:**

- 📊 Tabla responsive con columnas: Fecha, Entrada, Salida, Tardanza, Estado
- 🔍 Filtros avanzados:
  - Fecha inicio y fin (date picker)
  - Estado (select dropdown): Presente, Ausente, Tarde, Justificado, Permiso
  - Botón "Limpiar" para resetear todos los filtros
- 📄 Paginación con botones Anterior/Siguiente
- 🎯 Acceso a detalle clickeando "Ver"
- 📌 Indicadores visuales: Tardanza en minutos, badges de color por estado
- ⚡ Carga dinámica con spinner

**Estados Mostrados:**

- 🟢 Presente: Color verde
- 🔴 Ausente: Color rojo
- 🟡 Tarde: Color amarillo
- 🔵 Justificado: Color azul
- 🟣 Permiso: Color púrpura

**Campos Mostrados:**

```
| Fecha | Hora Entrada | Hora Salida | Tardanza | Estado | Acciones |
```

---

### 2. Detalle de Asistencia: `client/asistencias/[id]/page.tsx`

**Características:**

- 📱 Botón "Volver" para retroceder
- 📋 Información organizada en tarjetas (Cards):

  **Información General:**

  - Fecha completa (formato largo)
  - Estado con badge colorido
  - ID Horario

  **Horarios:**

  - Hora de entrada
  - Hora de salida
  - Horas trabajadas (formato)

  **Tardanza:**

  - Minutos de tardanza
  - Métodos de registro (entrada/salida)

  **Información del Usuario:**

  - Nombre completo
  - Código de usuario
  - Email

  **Información Adicional:**

  - Link a justificación asociada (si existe)

  **Información del Sistema:**

  - Fechas de creación y actualización

---

## 📄 Páginas de Admin

### 1. Listado: `admin/asistencias/page.tsx`

**Estado:** ✅ YA EXISTÍA

**Características:**

- 📊 DataTable con 20+ columnas
- 🔍 Búsqueda global
- 📑 Paginación (10, 15, 25, 50 registros)
- 📋 Columnas:
  - ID, Usuario (nombre + código), ID usuario, ID horario
  - Fecha, Entrada, Salida, Métodos de registro
  - Estado (con badges), Tardanza
  - Minutos de tardanza/trabajados
  - Horas trabajadas, Justificación ID
  - Observaciones, Origen (manual/automático)
  - Timestamps de creación/actualización
- ⚙️ Menú de acciones: Ver, Editar, Eliminar, Copiar ID

**Acciones Disponibles:**

- 👁️ Ver - Abre detalle en `/admin/asistencias/{id}`
- ✏️ Editar - Abre formulario en `/admin/asistencias/{id}/edit`
- 🗑️ Eliminar - Abre diálogo de confirmación
- 📋 Copiar ID - Copia el ID al portapapeles

---

### 2. Detalle Admin: `admin/asistencias/[id]/page.tsx`

**Características:**

- 📱 Botón "Volver" para retroceder
- ⚙️ Botones de acciones:
  - ✏️ Editar - Abre formulario de edición
  - 🗑️ Eliminar - Abre diálogo de confirmación
- 📋 Información organizada en tarjetas (Cards):

  **Información General:**

  - Fecha completa
  - Estado con badge colorido
  - ID Horario

  **Horarios:**

  - Hora entrada, salida
  - Horas trabajadas

  **Tardanza:**

  - Minutos de tardanza
  - Minutos trabajados
  - ¿Tardanza? (sí/no)

  **Métodos de Registro:**

  - Entrada (facial/manual/huella)
  - Salida (facial/manual/huella)

  **Información del Usuario:**

  - Nombre, código, email
  - ID Usuario

  **Información Adicional:**

  - Link clickeable a justificación asociada (si existe)

  **Información del Sistema:**

  - Timestamps de creación y actualización

- 🚨 Diálogo de eliminación con confirmación

---

### 3. Edición Admin: `admin/asistencias/[id]/edit/page.tsx`

**Características:**

- 📝 Formulario de edición con campos:

  - ⏰ Hora de Entrada (input time) - Requerido
  - ⏰ Hora de Salida (input time) - Requerido
  - 📊 Estado (select) - Requerido
    - Presente
    - Ausente
    - Tarde
    - Justificado
    - Permiso
  - 📝 Observaciones (textarea) - Opcional

- 📌 Información del registro visible en panel gris:

  - Fecha, Usuario, Código

- ✅ Validaciones del lado del cliente:

  - Hora de entrada requerida
  - Hora de salida requerida
  - Estado requerido
  - Feedback de errores

- 💾 Botones:

  - Cancelar - Retorna a vista anterior
  - Guardar Cambios - Submite formulario
  - Spinner mientras se guarda

- 🎯 Redirección a detalle tras guardar exitosamente

---

## 🎯 Endpoints Consumidos

### Backend Routes

```typescript
GET    /asistencia/                    # Listar mis asistencias
GET    /asistencia/admin/todas         # Listar todas (admin)
GET    /asistencia/{id}                # Detalle
GET    /asistencia/usuario/{user_id}   # Asistencias de usuario
PUT    /asistencia/{id}                # Actualizar
DELETE /asistencia/{id}                # Eliminar
```

### Parámetros de Query

```typescript
// list() y listAdmin()
page: number                           # Número de página
page_size: number                      # Registros por página
fecha_inicio?: string                  # Filtro fecha inicio (YYYY-MM-DD)
fecha_fin?: string                     # Filtro fecha fin (YYYY-MM-DD)
estado?: string                        # Filtro estado
user_id?: number                       # Filtro usuario (solo admin)
```

---

## 🎨 Interfaz de Tipos

### AsistenciaBase

```typescript
interface AsistenciaBase {
  id: number;
  user_id: number;
  horario_id: number;
  fecha: string;
  hora_entrada: string;
  hora_salida: string | null;
  metodo_entrada: "facial" | "manual" | "huella";
  metodo_salida: "facial" | "manual" | "huella" | null;
  estado: "presente" | "ausente" | "tarde" | "justificado" | "permiso";
  tardanza: boolean;
  minutos_tardanza: number;
  minutos_trabajados: number;
  horas_trabajadas_formato: string;
  justificacion_id: number | null;
  observaciones: string;
  created_at: string;
  updated_at: string | null;
  nombre_usuario: string;
  codigo_usuario: string;
  email_usuario: string;
}
```

### AsistenciaList

Extiende `AsistenciaBase` - Usada para listados

### AsistenciaDetails

Extiende `AsistenciaBase` - Usada para detalles individuales

### AsistenciaUpdate

```typescript
interface AsistenciaUpdate {
  hora_entrada: string;
  hora_salida: string;
  estado: string;
  observaciones: string;
}
```

---

## 🔐 Control de Acceso

| Operación   | Usuario | Admin |
| ----------- | ------- | ----- |
| list()      | ✅      | —     |
| listAdmin() | —       | ✅    |
| getDetail() | ✅\*    | ✅    |
| getByUser() | ✅\*    | ✅    |
| update()    | —       | ✅    |
| delete\_()  | —       | ✅    |

\*Solo puede ver sus propias asistencias

---

## 📦 Componentes Utilizados

### UI Components (shadcn/ui)

- `Button` - Botones con variantes
- `Card` - Contenedores de información
- `Badge` - Indicadores de estado
- `Alert` - Mensajes de error/éxito
- `Table` - Tablas de datos
- `Select` - Dropdowns de filtros/formularios
- `Input` - Campos de entrada
- `Textarea` - Áreas de texto
- `Label` - Etiquetas de formularios

### Custom Components

- `DataTable` - Tabla avanzada con paginación
- `TableActionsMenu` - Menú de acciones contextual
- `DeleteConfirmationDialog` - Diálogo de confirmación
- `SortableHeader` - Encabezados ordenables

### Icons (lucide-react)

- Calendar, Clock, Eye, Loader, AlertTriangle
- Edit, Trash2, Save, ArrowLeft, etc.

---

## 🚀 Flujos de Trabajo

### Flujo Usuario - Ver Asistencias

1. Usuario accede a `/client/asistencias`
2. Se cargan sus asistencias del mes actual
3. Puede filtrar por fechas y estado
4. Click en "Ver" → Detalle en `/client/asistencias/{id}`
5. Ve información completa incluyendo justificación (si aplica)

### Flujo Admin - Gestionar Asistencias

1. Admin accede a `/admin/asistencias`
2. Ve tabla completa de todos los usuarios
3. Puede buscar por usuario/ID
4. Acciones disponibles:
   - 👁️ Ver → `/admin/asistencias/{id}`
   - ✏️ Editar → `/admin/asistencias/{id}/edit`
   - 🗑️ Eliminar → Confirmación + DELETE

### Flujo Admin - Editar Asistencia

1. Admin hace click en ✏️ Editar
2. Se abre formulario en `/admin/asistencias/{id}/edit`
3. Puede cambiar: horarios, estado, observaciones
4. Valida y guarda
5. Redirecciona a detalle `/admin/asistencias/{id}`

---

## ⚠️ Notas Importantes

### Rutas No Implementadas (Manejadas Separadamente)

Las siguientes rutas fueron excluidas del alcance de esta integración:

1. **POST `/asistencia/registrar-manual`**

   - Registro manual de asistencias
   - Requiere implementación separada

2. **POST `/asistencia/registro-facial`**

   - Reconocimiento facial con upload de imagen
   - Requiere implementación separada con soporte de archivos

3. **PUT `/asistencia/actualizar-manual`**
   - Actualización manual automática
   - Requiere implementación separada

### Limitaciones Actuales

- No se pueden registrar asistencias directamente desde el cliente
- Solo lectura y edición por admin de registros existentes
- La fecha de asistencia se genera automáticamente en backend

---

## 🔄 Estado de Desarrollo

| Componente             | Estado      | Notas                       |
| ---------------------- | ----------- | --------------------------- |
| Hook useAsistenciasApi | ✅ Completo | 6 funciones implementadas   |
| Página listado cliente | ✅ Completo | Con filtros y paginación    |
| Página detalle cliente | ✅ Completo | Información completa        |
| Página listado admin   | ✅ Existía  | Tabla con acciones          |
| Página detalle admin   | ✅ Completo | Con botones editar/eliminar |
| Página editar admin    | ✅ Completo | Formulario validado         |

---

## 📚 Archivos Involucrados

```
client/
├── src/
│   ├── hooks/
│   │   └── useAsistenciasApi.hook.ts          # ✅ NUEVO
│   ├── app/
│   │   ├── client/
│   │   │   └── asistencias/
│   │   │       ├── page.tsx                    # ✅ MODIFICADO
│   │   │       └── [id]/
│   │   │           └── page.tsx                # ✅ NUEVO
│   │   └── admin/
│   │       └── asistencias/
│   │           ├── page.tsx                    # ✅ YA EXISTÍA
│   │           └── [id]/
│   │               ├── page.tsx                # ✅ NUEVO
│   │               └── edit/
│   │                   └── page.tsx            # ✅ NUEVO
```

---

## 🎓 Resumen de Cambios

### Nuevos Archivos: 5

1. `/client/src/hooks/useAsistenciasApi.hook.ts`
2. `/client/src/app/client/asistencias/[id]/page.tsx`
3. `/client/src/app/admin/asistencias/[id]/page.tsx`
4. `/client/src/app/admin/asistencias/[id]/edit/page.tsx`

### Archivos Modificados: 1

1. `/client/src/app/client/asistencias/page.tsx` - Reemplazado stub por implementación completa

### Archivos Existentes Aprovechados: 1

1. `/client/src/app/admin/asistencias/page.tsx` - Reutilizado con sus acciones ya implementadas

---

## 🎯 Próximos Pasos

Para completar el módulo de asistencias, se recomienda implementar:

1. **Página de Registro Manual** - Para crear asistencias manualmente
2. **Integración de Reconocimiento Facial** - Para captura de asistencias
3. **Reportes de Asistencias** - Dashboard con estadísticas
4. **Notificaciones** - Alertas de tardanzas o faltas
5. **Exportación de Datos** - Descargar reportes en CSV/PDF

---

**Fecha de Finalización:** 2024
**Versión:** 1.0
**Estado:** ✅ COMPLETADO
