# 🎯 HORARIOS - GUÍA RÁPIDA DE REFERENCIA

## 📂 Estructura de Archivos

```
cliente/
├── src/
│   ├── hooks/
│   │   └── useHorariosApi.hook.ts          ✅ 10 funciones
│   │
│   └── app/
│       ├── client/
│       │   └── horarios/
│       │       ├── page.tsx                ✅ Listado
│       │       └── [id]/
│       │           └── page.tsx            ✅ Detalle
│       │
│       └── admin/
│           └── horarios/
│               ├── page.tsx                📄 Preexistente
│               ├── create/
│               │   └── page.tsx            📄 Preexistente
│               ├── [id]/
│               │   ├── page.tsx            ✅ Detalle
│               │   └── edit/
│               │       └── page.tsx        ✅ Edición
│
└── docs/
    ├── INTEGRACION_HORARIOS_STATUS.md      📋 Detalles técnicos
    ├── GUIA_HORARIOS.md                    👥 Manual de uso
    ├── RESUMEN_INTEGRACION_HORARIOS.md     📊 Resumen general
    ├── VERIFICACION_HORARIOS.md            ✅ Checklist
    └── INTEGRACION_COMPLETA.md             🎉 Resumen final
```

---

## 🔌 Hook - Funciones Disponibles

```typescript
import { useHorariosApi } from "@/hooks/useHorariosApi.hook";

const {
  // Lectura
  list, // Mis horarios (PROTECTED)
  listAdmin, // Todos los horarios (ADMIN)
  getDetail, // Detalle por ID
  getByUser, // Horarios de usuario
  detectarTurnoActivo, // Turno activo actual

  // Escritura
  create, // Crear nuevo (PUBLIC)
  createBulk, // Crear múltiples (ADMIN)
  update, // Actualizar (ADMIN)
  delete_, // Eliminar (ADMIN)
  deleteByUser, // Eliminar por usuario (ADMIN)

  // Estado
  state: { loading, error, alert },
} = useHorariosApi();
```

---

## 🛣️ Rutas - Mapeo Completo

### Cliente (Usuario Autenticado)

```
/client/horarios                    → Listado de mis horarios
/client/horarios/[id]               → Detalle del horario
```

### Admin (Administrador)

```
/admin/horarios                     → Listado de todos los horarios
/admin/horarios/[id]                → Detalle del horario
/admin/horarios/[id]/edit           → Editar horario
/admin/horarios/create              → Crear nuevo horario
```

---

## 📊 Matriz de Operaciones

```
┌─────────────────┬──────────┬───────┬────────┐
│ Operación       │ Usuario  │ Admin │ Public │
├─────────────────┼──────────┼───────┼────────┤
│ Listar propio   │ ✅       │ ✅    │ ❌     │
│ Listar todos    │ ❌       │ ✅    │ ❌     │
│ Ver detalle     │ ✅       │ ✅    │ ❌     │
│ Crear           │ ❌       │ ✅    │ ✅     │
│ Editar          │ ❌       │ ✅    │ ❌     │
│ Eliminar        │ ❌       │ ✅    │ ❌     │
│ Eliminar x user │ ❌       │ ✅    │ ❌     │
└─────────────────┴──────────┴───────┴────────┘
```

---

## 🔄 Flujos Principales

### 1. Ver Mis Horarios (Usuario)

```
/client/horarios
    ↓
Carga list()
    ↓
Muestra tabla con filtros
    ↓
Selecciona horario
    ↓
/client/horarios/[id]
    ↓
Muestra detalle completo
```

### 2. Editar Horario (Admin)

```
/admin/horarios
    ↓
Selecciona horario
    ↓
/admin/horarios/[id]
    ↓
Click "Editar"
    ↓
/admin/horarios/[id]/edit
    ↓
Modifica campos
    ↓
Guardar
    ↓
Redirige a /admin/horarios/[id]
```

### 3. Eliminar Horario (Admin)

```
/admin/horarios/[id]
    ↓
Click "Eliminar"
    ↓
Diálogo de confirmación
    ↓
Click "Eliminar"
    ↓
delete_(id)
    ↓
Redirige a /admin/horarios
```

---

## 💾 Interfaces TypeScript

```typescript
// Base
interface CrearHorario {
  user_id: number;
  dia_semana: "lunes" | "martes" | "miercoles" | "jueves" | "viernes" | "sabado" | "domingo";
  turno_id: number;
  hora_entrada: string; // "HH:MM:SS"
  hora_salida: string; // "HH:MM:SS"
  horas_requeridas: number; // Minutos
  tolerancia_entrada: number; // Minutos
  tolerancia_salida: number; // Minutos
  activo: boolean;
  descripcion?: string;
}

// Listado
interface HorariosList extends CrearHorario {
  id: number;
  created_at: string;
  updated_at: string | null;
  usuario_nombre: string;
  usuario_email: string;
  turno_nombre: string;
}

// Detalle (same as HorariosList)
type HorarioDetails = HorariosList;

// Actualización (sin user_id, turno_id, dia_semana)
interface ActualizarHorario {
  hora_entrada: string;
  hora_salida: string;
  horas_requeridas: number;
  tolerancia_entrada: number;
  tolerancia_salida: number;
  activo: boolean;
}
```

---

## 🎨 Componentes UI Utilizados

```
✅ Button            (shadcn/ui)
✅ Card              (shadcn/ui)
✅ Alert             (shadcn/ui)
✅ Badge             (shadcn/ui)
✅ Table             (shadcn/ui)
✅ Input             (shadcn/ui)
✅ Select            (shadcn/ui)
✅ Checkbox          (shadcn/ui)
✅ Dialog            (shadcn/ui)
✅ Loader2           (lucide-react)
✅ ArrowLeft         (lucide-react)
✅ Trash2            (lucide-react)
✅ Edit              (lucide-react)
```

---

## 📋 Validaciones

### Campos Requeridos

```
✅ user_id          (número > 0)
✅ dia_semana       (enum: lunes-domingo)
✅ turno_id         (número > 0)
✅ hora_entrada     (formato HH:MM:SS)
✅ hora_salida      (formato HH:MM:SS)
✅ horas_requeridas (número > 0)
✅ tolerancia_*     (número >= 0)
✅ activo           (booleano)
```

### Validaciones Especiales

```
✅ hora_salida > hora_entrada (excepto turnos nocturnos)
✅ tiempo_requerido 1-1440 minutos (1 min - 24h)
✅ tolerancias máximo 120 minutos
✅ Formato HH:MM:SS consistente
```

---

## 📡 Endpoints Backend

### GET

```
/horarios                              Mi lista
/horarios/admin/todos                  Todas (admin)
/horarios/{id}                         Detalle
/horarios/usuario/{user_id}            Por usuario
/horarios/usuario/{user_id}/turno-activo  Turno activo
```

### POST

```
/horarios                              Crear uno
/horarios/bulk                         Crear múltiples (admin)
```

### PUT

```
/horarios/{id}                         Actualizar (admin)
```

### DELETE

```
/horarios/{id}                         Eliminar (admin)
/horarios/usuario/{user_id}            Eliminar x usuario (admin)
```

---

## 🔐 Seguridad

```
🔓 PUBLIC
   └─ POST /horarios

🔒 PROTECTED (Auth requerida)
   ├─ GET  /horarios
   ├─ GET  /horarios/{id}
   ├─ GET  /horarios/usuario/*
   └─ GET  /horarios/*/turno-activo

🔐 ADMIN (Solo admin)
   ├─ GET  /horarios/admin/todos
   ├─ POST /horarios/bulk
   ├─ PUT  /horarios/{id}
   ├─ DELETE /horarios/{id}
   └─ DELETE /horarios/usuario/{user_id}
```

---

## ⚡ Ejemplos de Uso

### Listar mis horarios

```typescript
const { list } = useHorariosApi();

const response = await list({
  dia_semana: "lunes",
  activo: true,
});

if (response.alert === "success") {
  console.log(response.data); // HorariosList[]
}
```

### Obtener detalle

```typescript
const { getDetail } = useHorariosApi();

const response = await getDetail(123);

if (response.alert === "success") {
  console.log(response.data); // HorarioDetails
}
```

### Editar horario (admin)

```typescript
const { update } = useHorariosApi();

const response = await update(123, {
  hora_entrada: "09:00:00",
  hora_salida: "18:00:00",
  activo: true,
});
```

### Eliminar horario (admin)

```typescript
const { delete_ } = useHorariosApi();

const response = await delete_(123);

if (response.alert === "success") {
  // Horario eliminado
}
```

---

## 🐛 Troubleshooting

```
Problema: "No se encuentra el horario"
Solución: Verificar que el ID exista en la BD

Problema: "Error al cargar horarios"
Solución: Revisar conexión a internet y backend

Problema: "No tienes permisos"
Solución: Verificar role (ADMIN vs USER)

Problema: "Formato HH:MM requerido"
Solución: Usar time picker o formato correcto

Problema: "Usuario no encontrado"
Solución: Verificar ID de usuario válido
```

---

## ✅ Checklist para Usar

```
Antes de usar en producción:
□ Verificar Backend API disponible
□ Verificar DB migrada correctamente
□ Verificar permisos de usuarios
□ Probar flujo completo (CRUD)
□ Revisar logs de errores
□ Validar datos en BD
□ Revisar documentación
□ Entrenar a usuarios
□ Monitorear uso
□ Tener backup de datos
```

---

## 📞 Contacto y Soporte

**Para Issues**:

1. Revisar console del navegador (F12)
2. Revisar logs del servidor
3. Verificar base de datos
4. Contactar equipo dev

**Para Requests**:

1. Crear issue en repo
2. Describir feature
3. Discutir con equipo
4. Implementar en rama feature
5. PR y merge

---

**Última actualización**: 2024
**Versión**: 1.0
**Estado**: ✅ Production Ready
