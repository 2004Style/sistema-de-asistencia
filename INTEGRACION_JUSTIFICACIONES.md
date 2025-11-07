# Integración Completa del Controlador de Justificaciones

## 📋 Resumen

Se ha realizado la integración completa del controlador de justificaciones del backend con el cliente Next.js/React. Se incluyen todas las funcionalidades: CRUD, aprobación, rechazo, listado para admin y cliente.

---

## 🗂️ Estructura de Carpetas Creadas

### Cliente (Usuario Regular)

```
client/src/app/client/justificaciones/
├── page.tsx                          # Listado de mis justificaciones
├── create/
│   └── page.tsx                      # Crear nueva justificación
└── [id]/
    └── page.tsx                      # Detalle de justificación
```

### Admin (Administrador)

```
client/src/app/admin/justificaciones/
├── page.tsx                          # Listado completo (con aprobación/rechazo)
├── actions-dialog.tsx                # Componente de diálogo para aprobar/rechazar
├── [id]/
│   ├── page.tsx                      # Detalle con acciones
│   └── edit/
│       └── page.tsx                  # Editar justificación pendiente
```

---

## 🔧 Archivos Creados/Modificados

### 1. Hook Principal: `useJustificacionesApi.hook.ts`

**Ubicación:** `/client/src/hooks/useJustificacionesApi.hook.ts`

**Funcionalidades:**

- ✅ `create()` - Crear justificación (PUBLIC)
- ✅ `list()` - Listar mis justificaciones (PROTECTED)
- ✅ `listAdmin()` - Listar todas (ADMIN)
- ✅ `getDetail()` - Obtener detalle por ID
- ✅ `getByUser()` - Obtener justificaciones de un usuario
- ✅ `getPendientesByUser()` - Obtener pendientes de usuario
- ✅ `getPendientesAll()` - Obtener todas las pendientes (ADMIN)
- ✅ `update()` - Actualizar justificación
- ✅ `approve()` - Aprobar justificación (ADMIN/SUPERVISOR/RRHH)
- ✅ `reject()` - Rechazar justificación (ADMIN/SUPERVISOR/RRHH)
- ✅ `delete_()` - Eliminar justificación (ADMIN)
- ✅ `getEstadisticas()` - Obtener estadísticas (ADMIN/RRHH)

---

## 📄 Páginas del Cliente (Usuario)

### 1. Listado: `client/justificaciones/page.tsx`

**Características:**

- Listado paginado de mis justificaciones
- Búsqueda por tipo y motivo
- Filtro por estado (Pendiente, Aprobada, Rechazada)
- Tarjetas informativas con datos clave
- Botón para crear nueva justificación
- Acceso a detalle de cada justificación

**Estados Mostrados:**

- 🟡 Pendiente
- 🟢 Aprobada
- 🔴 Rechazada

---

### 2. Crear Justificación: `client/justificaciones/create/page.tsx`

**Características:**

- Formulario completo con validaciones
- Tipos de justificación (Médica, Personal, Familiar, Académica, etc.)
- Fechas con validación de rango
- Campo de motivo con validación de longitud mínima (10 caracteres)
- URL opcional del documento
- Confirmación de éxito con redirección

**Validaciones:**

- ✅ Todos los campos obligatorios completados
- ✅ Motivo mínimo 10 caracteres
- ✅ Fecha inicio no puede ser mayor que fecha fin
- ✅ Usuario autenticado

---

### 3. Detalle de Justificación: `client/justificaciones/[id]/page.tsx`

**Características:**

- Vista completa de la justificación
- Información del usuario que la solicitó
- Fechas en formato legible
- Días justificados
- Documento adjunto (si existe)
- Información de revisión (si está aprobada/rechazada)
- Comentarios del revisor
- Historial de fechas

---

## 👨‍💼 Páginas del Admin

### 1. Listado Admin: `admin/justificaciones/page.tsx`

**Características:**

- Tabla completa con todos los registros
- Columnas: ID, Usuario, Tipo, Motivo, Estado, Documento, etc.
- Búsqueda global
- Paginación
- Ordenamiento por columnas
- **Botones de acción directa:**
  - 🟢 Aprobar (solo si está pendiente)
  - 🔴 Rechazar (solo si está pendiente)
  - 📋 Ver detalles
  - ✏️ Editar
  - 🗑️ Eliminar

**Tabla Completa:**

- ID
- Usuario + Email
- ID Usuario
- Fecha inicio
- Fecha fin
- Tipo
- Motivo
- Documento
- Días justificados
- Estado (con icono)
- Aprobado por
- Fecha revisión
- Comentario revisor
- Revisor
- Creado
- Actualizado

---

### 2. Diálogo de Aprobación/Rechazo: `admin/justificaciones/actions-dialog.tsx`

**Características:**

- Componente reutilizable
- Modo aprobación (comentario opcional)
- Modo rechazo (comentario obligatorio)
- Manejo de errores
- Carga del estado
- Actualización automática después de la acción

---

### 3. Detalle Admin: `admin/justificaciones/[id]/page.tsx`

**Características:**

- Vista completa con toda la información
- Información del usuario solicitante
- Fechas del rango
- Tipo y motivo
- Documento adjunto
- Info de revisión (si aplica)
- **Botones de acción:**
  - 🟢 Aprobar
  - 🔴 Rechazar
  - ✏️ Editar (si está pendiente)

---

### 4. Edición Admin: `admin/justificaciones/[id]/edit/page.tsx`

**Características:**

- Edición completa de justificación pendiente
- Validaciones idénticas a la creación
- Solo permite editar si está en estado "pendiente"
- Redirección al detalle después de guardar
- Confirmación visual de éxito

---

## 🔐 Seguridad y Permisos

### Rutas Públicas

- `POST /justificaciones` - Crear (Sin autenticación)

### Rutas Protegidas (Usuario logueado)

- `GET /justificaciones` - Listar mis justificaciones
- `GET /justificaciones/{id}` - Ver mi justificación
- `GET /justificaciones/usuario/{user_id}` - Ver justificaciones de usuario
- `GET /justificaciones/pendientes/usuario/{user_id}` - Ver mis pendientes
- `PUT /justificaciones/{id}` - Actualizar mi justificación

### Rutas Admin (ADMIN/SUPERVISOR/RRHH)

- `GET /justificaciones/admin/todas` - Listar todas
- `GET /justificaciones/pendientes/todas` - Listar todas pendientes
- `POST /justificaciones/{id}/aprobar` - Aprobar
- `POST /justificaciones/{id}/rechazar` - Rechazar
- `DELETE /justificaciones/{id}` - Eliminar

### Rutas Reportes (ADMIN/RRHH)

- `GET /justificaciones/estadisticas/general` - Ver estadísticas

---

## 🎨 Componentes UI Utilizados

### Shadcn/UI Components

- `Button` - Botones con variantes
- `Card/CardContent/CardDescription/CardHeader/CardTitle` - Contenedores
- `Badge` - Etiquetas de estado
- `Input` - Campos de entrada
- `Label` - Etiquetas de formulario
- `Textarea` - Áreas de texto
- `Select/SelectContent/SelectItem/SelectTrigger/SelectValue` - Selectores
- `Alert/AlertDescription` - Alertas
- `Dialog/DialogContent/DialogDescription/DialogFooter/DialogHeader/DialogTitle` - Diálogos
- `DataTable` - Tabla de datos
- `TableActionsMenu` - Menú de acciones
- `DeleteConfirmationDialog` - Confirmación de eliminación

### Iconos (lucide-react)

- 📋 FileText
- ✅ CheckCircle2
- ❌ XCircle
- ➕ Plus
- ⬅️ ArrowLeft
- 📥 Download
- ✏️ Edit
- ⚙️ Loader2
- ⚠️ AlertCircle

---

## 📊 Flujo de Datos

### Crear Justificación

```
Usuario → Formulario → Hook (create) → Backend → Suceso → Redirección
```

### Listar Justificaciones

```
Cliente carga página → Hook (list) → Backend → Tabla con paginación
```

### Aprobar/Rechazar (Admin)

```
Admin → Click botón → Dialog modal → Hook (approve/reject) → Backend → Actualización tabla
```

### Editar Justificación

```
Admin → Click Editar → Formulario → Hook (update) → Backend → Detalle actualizado
```

---

## 🚀 Cómo Usar

### Para Usuarios

1. Ir a `/client/justificaciones`
2. Ver todas mis justificaciones
3. Click en "Nueva Justificación"
4. Completar formulario
5. Ver estado de la solicitud

### Para Admin

1. Ir a `/admin/justificaciones`
2. Ver todas las justificaciones
3. Click en botón verde (✅) para aprobar o rojo (❌) para rechazar
4. Completar comentario y enviar
5. O click en el nombre para ver detalles
6. Editar si está pendiente

---

## 🔄 Estado de Justificaciones

```
Creación
   ↓
PENDIENTE (Esperando revisión)
   ↓
   ├─→ APROBADA (Admin aprobó)
   │
   └─→ RECHAZADA (Admin rechazó)
```

---

## 📝 Validaciones Implementadas

### Cliente

- ✅ Todos los campos obligatorios
- ✅ Motivo mínimo 10 caracteres
- ✅ Fecha inicio ≤ Fecha fin
- ✅ Usuario autenticado
- ✅ URL válida (si se proporciona)

### Admin

- ✅ Idénticas a cliente
- ✅ Solo editar si está pendiente
- ✅ Comentario obligatorio para rechazar
- ✅ ID de revisor válido

---

## 📦 Dependencias Utilizadas

```typescript
import { useClientApi } from "@/hooks/useClientApi.hook";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useServerTable } from "@/hooks/use-server-table.hook";
import { useTableActions } from "@/hooks/use-table-actions.hook";
import { BACKEND_ROUTES } from "@/routes/backend.routes";
```

---

## ✨ Características Adicionales

### Notificaciones

- Feedback visual en cada acción
- Alerts de error con detalles
- Confirmación de éxito
- Carga automática después de cambios

### Responsivo

- Diseño mobile-first
- Adaptable a todos los tamaños
- Tablas con scroll horizontal

### Accesibilidad

- Labels asociados a inputs
- Botones claramente identificados
- Navegación intuitiva
- Mensajes descriptivos

---

## 🎯 Próximas Mejoras (Opcionales)

- [ ] Exportar justificaciones a PDF/Excel
- [ ] Filtros avanzados en tabla admin
- [ ] Búsqueda por fecha rango
- [ ] Notificaciones por email
- [ ] Historial de cambios
- [ ] Archivos adjuntos (upload directo)
- [ ] Gráficos de estadísticas

---

## ✅ Checklist de Implementación

- ✅ Hook `useJustificacionesApi` completamente funcional
- ✅ Páginas cliente (listado, crear, detalle)
- ✅ Páginas admin (listado, detalle, editar)
- ✅ Componente de diálogo para aprobar/rechazar
- ✅ Validaciones completas
- ✅ Manejo de errores
- ✅ Carga de datos
- ✅ Interfaz UI/UX consistente
- ✅ Responsivo
- ✅ Sin errores de TypeScript

---

## 🔗 Rutas del Sistema

### Cliente

- `/client/justificaciones` - Listado
- `/client/justificaciones/create` - Crear
- `/client/justificaciones/[id]` - Detalle

### Admin

- `/admin/justificaciones` - Listado con acciones
- `/admin/justificaciones/[id]` - Detalle con acciones
- `/admin/justificaciones/[id]/edit` - Editar

---

## 📞 Soporte

Para cualquier duda o problema, revisa:

1. La consola del navegador (errores)
2. El archivo de controlador backend
3. Las interfaces TypeScript en `@/interfaces`
4. Los hooks en `@/hooks`

---

**Integración completada exitosamente** ✨
