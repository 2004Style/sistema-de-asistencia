# Asistencias - Quick Reference Guide

## 🎯 Guía Rápida de Uso

### Para Usuarios

#### Acceder a mis asistencias

```
→ /client/asistencias
```

#### Ver detalle de asistencia

```
→ /client/asistencias/{id}
```

#### Filtrar asistencias

```
- Fecha inicio (date picker)
- Fecha fin (date picker)
- Estado (Presente, Ausente, Tarde, Justificado, Permiso)
- Botón "Limpiar" para resetear filtros
```

---

### Para Administradores

#### Acceder al listado completo

```
→ /admin/asistencias
```

#### Ver detalle de asistencia

```
→ /admin/asistencias/{id}
```

#### Editar asistencia

```
→ /admin/asistencias/{id}/edit
```

#### Campos editables

```
- Hora de entrada (time input)
- Hora de salida (time input)
- Estado (select: presente, ausente, tarde, justificado, permiso)
- Observaciones (textarea)
```

#### Eliminar asistencia

```
1. Click botón rojo "Eliminar" en detalle
2. Confirmar en diálogo
3. Se elimina y retorna a listado
```

---

## 📊 Hook: useAsistenciasApi

### Funciones Disponibles

```typescript
const {
  list, // Listar mis asistencias
  listAdmin, // Listar todas (admin)
  getDetail, // Obtener detalle
  getByUser, // Asistencias de usuario
  update, // Actualizar
  delete_, // Eliminar
  state, // Estado del hook
} = useAsistenciasApi();
```

### Ejemplos de Uso

```typescript
// Listar mis asistencias
const response = await list(1, 10, {
  fecha_inicio: "2024-01-01",
  fecha_fin: "2024-01-31",
  estado: "tarde",
});

// Listar todas (admin)
const response = await listAdmin(1, 15, {
  user_id: 5,
  estado: "ausente",
});

// Obtener detalle
const response = await getDetail(42);

// Actualizar
const response = await update(42, {
  hora_entrada: "08:30",
  hora_salida: "17:00",
  estado: "presente",
  observaciones: "Justificación pendiente",
});

// Eliminar
const response = await delete_(42);
```

---

## 🎨 Estados y Colores

| Estado      | Color    | Badge |
| ----------- | -------- | ----- |
| Presente    | Verde    | ✓     |
| Ausente     | Rojo     | ✗     |
| Tarde       | Amarillo | ⏰    |
| Justificado | Azul     | ✓     |
| Permiso     | Púrpura  | 🔷    |

---

## 📋 Interfaz AsistenciaList

```typescript
{
  id: number;
  user_id: number;
  horario_id: number;
  fecha: string; // "2024-01-15"
  hora_entrada: string; // "08:30"
  hora_salida: string | null; // "17:00"
  metodo_entrada: "facial" | "manual" | "huella";
  metodo_salida: "facial" | "manual" | "huella" | null;
  estado: "presente" | "ausente" | "tarde" | "justificado" | "permiso";
  tardanza: boolean;
  minutos_tardanza: number; // 15
  minutos_trabajados: number; // 465
  horas_trabajadas_formato: string; // "7:45"
  justificacion_id: number | null; // Link a justificación
  observaciones: string; // Notas
  created_at: string; // Timestamp
  updated_at: string | null; // Timestamp
  nombre_usuario: string; // "Juan Pérez"
  codigo_usuario: string; // "JMP-001"
  email_usuario: string; // "juan@example.com"
}
```

---

## 🔄 Respuesta del Hook

```typescript
interface ApiResponse<T> {
  alert: "success" | "error" | "warning" | "info";
  data?: T;
  message?: string;
  statusCode?: number;
}
```

### Manejo de Respuestas

```typescript
const response = await list(1, 10);

if (response.alert === "success" && response.data) {
  console.log("Records:", response.data.records);
  console.log("Total:", response.data.total);
} else {
  console.error("Error:", response.message);
}
```

---

## 🎯 Componentes Clave

### Cliente - Listado

**Archivo:** `client/asistencias/page.tsx`

**Props:**

- Paginación automática
- Filtros reactivos
- Tabla responsive
- Links a detalle

**Ejemplo de Acceso:**

```
/client/asistencias?page=1&estado=tarde
```

### Admin - Editar

**Archivo:** `admin/asistencias/[id]/edit/page.tsx`

**Validaciones:**

- Hora entrada requerida
- Hora salida requerida
- Estado requerido
- Feedback de errores inline

---

## 🔐 Permisos y Protección

| Ruta                         | Usuario | Admin | Público |
| ---------------------------- | ------- | ----- | ------- |
| /client/asistencias          | ✅      | —     | —       |
| /client/asistencias/{id}     | ✅\*    | —     | —       |
| /admin/asistencias           | —       | ✅    | —       |
| /admin/asistencias/{id}      | —       | ✅    | —       |
| /admin/asistencias/{id}/edit | —       | ✅    | —       |

\*Solo ver propias asistencias

---

## 🚀 Integración Backend

### URLs Base

```typescript
// En routes/backend.routes.ts
BACKEND_ROUTES.urlAsistencias = "/asistencia";
```

### Endpoints Consumidos

```
GET    /asistencia/                    # Mis asistencias
GET    /asistencia/admin/todas         # Todas (admin)
GET    /asistencia/{id}                # Detalle
GET    /asistencia/usuario/{user_id}   # Por usuario
PUT    /asistencia/{id}                # Actualizar
DELETE /asistencia/{id}                # Eliminar
```

### Query Parameters

```
page=1
page_size=10
fecha_inicio=2024-01-01
fecha_fin=2024-01-31
estado=tarde
user_id=5
```

---

## ⚠️ Rutas Excluidas

Las siguientes no están implementadas en esta integración:

```
❌ POST /asistencia/registrar-manual
❌ POST /asistencia/registro-facial
❌ PUT  /asistencia/actualizar-manual
```

Estas rutas requieren implementación separada.

---

## 📝 Tips y Trucos

### Debugging

```typescript
// Ver estado del hook
console.log(state.loading); // boolean
console.log(state.error); // string | null
console.log(state.alert); // "error" | "success" | etc
```

### Validación de Entrada

```typescript
// Validar fecha antes de filtrar
if (new Date(fechaInicio) > new Date(fechaFin)) {
  // Mostrar error
}
```

### Manejo de Errores

```typescript
const response = await update(id, data);

if (response.statusCode === 401) {
  // Usuario no autorizado
} else if (response.statusCode === 404) {
  // Asistencia no encontrada
} else if (response.alert === "error") {
  // Otro error
  alert(response.message);
}
```

---

## 🎓 Ejemplos Completos

### Listar asistencias filtradas

```typescript
"use client";

import { useAsistenciasApi } from "@/hooks/useAsistenciasApi.hook";
import { useState, useEffect } from "react";

export default function MyComponent() {
  const { list, state } = useAsistenciasApi();
  const [asistencias, setAsistencias] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const response = await list(1, 10, {
      estado: "tarde",
      fecha_inicio: "2024-01-01",
    });

    if (response.alert === "success" && response.data) {
      setAsistencias(response.data.records);
    }
  };

  return (
    <div>
      {state.loading && <p>Cargando...</p>}
      {state.error && <p>Error: {state.error}</p>}
      <ul>
        {asistencias.map((a) => (
          <li key={a.id}>
            {a.fecha} - {a.estado}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Actualizar asistencia (Admin)

```typescript
const handleUpdate = async (id: number) => {
  const response = await update(id, {
    estado: "justificado",
    observaciones: "Médico",
  });

  if (response.alert === "success") {
    alert("Actualizado correctamente");
    router.refresh();
  } else {
    alert("Error: " + response.message);
  }
};
```

---

**Última actualización:** 2024
**Versión:** 1.0 - Completa
**Status:** ✅ Production Ready
