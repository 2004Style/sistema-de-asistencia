# Referencia Rápida - Justificaciones

## 🚀 Rutas Disponibles

### Cliente (Usuario)

| Ruta                             | Descripción                  |
| -------------------------------- | ---------------------------- |
| `/client/justificaciones`        | Listar mis justificaciones   |
| `/client/justificaciones/create` | Crear nueva justificación    |
| `/client/justificaciones/[id]`   | Ver detalle de justificación |

### Admin

| Ruta                               | Descripción                |
| ---------------------------------- | -------------------------- |
| `/admin/justificaciones`           | Listar todas + acciones    |
| `/admin/justificaciones/[id]`      | Detalle + aprobar/rechazar |
| `/admin/justificaciones/[id]/edit` | Editar justificación       |

---

## 🔧 Hook: useJustificacionesApi

### Funciones Disponibles

```typescript
const {
  create, // Crear nueva justificación
  list, // Listar mis justificaciones
  listAdmin, // Listar todas (ADMIN)
  getDetail, // Obtener detalle por ID
  getByUser, // Obtener de usuario específico
  getPendientesByUser, // Obtener pendientes del usuario
  getPendientesAll, // Obtener todas pendientes (ADMIN)
  update, // Actualizar justificación
  approve, // Aprobar (ADMIN)
  reject, // Rechazar (ADMIN)
  delete_, // Eliminar (ADMIN)
  getEstadisticas, // Estadísticas (ADMIN/RRHH)
} = useJustificacionesApi();
```

### Ejemplos de Uso

#### Crear Justificación

```typescript
const response = await create({
  user_id: 1,
  tipo: "medica",
  fecha_inicio: "2025-01-10",
  fecha_fin: "2025-01-12",
  motivo: "Consulta médica requerida",
  documento_url: "https://...",
});
```

#### Listar Mis Justificaciones

```typescript
const response = await list(1, 10, {
  estado: "pendiente",
  tipo: "medica",
});
```

#### Aprobar Justificación

```typescript
const response = await approve(justificacionId, revisor_id, "Aprobado");
```

#### Rechazar Justificación

```typescript
const response = await reject(justificacionId, revisor_id, "Motivo del rechazo");
```

---

## 📊 Estados de Justificación

```
PENDIENTE
  ├─→ APROBADA (Admin aprobó)
  └─→ RECHAZADA (Admin rechazó)
```

---

## 🎨 Componentes Nuevos

### ActionsDialog

Componente para aprobar o rechazar justificaciones.

```typescript
<ActionsDialog
  justificacion={justificacion}
  action="approve" | "reject"
  isOpen={isOpen}
  onOpenChange={setIsOpen}
  onSuccess={() => refresh()}
/>
```

---

## 📋 Tipos de Justificación

- 🏥 Médica
- 👥 Personal
- 👨‍👩‍👧 Familiar
- 📚 Académica
- ✅ Permiso Autorizado
- 🏖️ Vacaciones
- 📄 Licencia
- 📌 Otro

---

## ✅ Checklist para Implementación

- [ ] Hook creado en `/src/hooks/useJustificacionesApi.hook.ts`
- [ ] Componentes de cliente funcionales
- [ ] Componentes de admin funcionales
- [ ] Diálogo de acciones integrado
- [ ] Validaciones en todos los formularios
- [ ] Manejo de errores
- [ ] Confirmaciones visuales
- [ ] Búsqueda y filtros funcionando
- [ ] Paginación funcionando
- [ ] Pruebas en navegador

---

## 🐛 Solución de Problemas

### No aparecen las justificaciones

- Verificar que el usuario esté autenticado
- Revisar que el backend esté corriendo
- Mirar la consola del navegador

### No se puede aprobar/rechazar

- Verificar que sea un usuario con permisos (ADMIN/SUPERVISOR/RRHH)
- Revisar que la justificación esté en estado PENDIENTE
- Revisar logs del backend

### Validaciones fallan

- Revisar que todos los campos obligatorios estén completos
- El motivo debe tener al menos 10 caracteres
- Las fechas deben ser válidas (inicio ≤ fin)

---

## 🔐 Permisos Requeridos

| Operación                     | Permiso Requerido            |
| ----------------------------- | ---------------------------- |
| Ver mis justificaciones       | Usuario logueado             |
| Crear justificación           | Usuario logueado             |
| Editar justificación          | Usuario logueado + PENDIENTE |
| Ver todas las justificaciones | ADMIN                        |
| Aprobar/Rechazar              | ADMIN, SUPERVISOR, RRHH      |
| Eliminar                      | ADMIN                        |
| Ver estadísticas              | ADMIN, RRHH                  |

---

## 📱 Responsive Design

Todas las páginas están optimizadas para:

- Mobile (< 640px)
- Tablet (640px - 1024px)
- Desktop (> 1024px)

---

## 🎯 Notas Importantes

1. **Autenticación**: Todas las rutas requieren Next-Auth
2. **Base de datos**: Sincroniza con backend automáticamente
3. **Actualizaciones**: La tabla se actualiza después de cada acción
4. **Timestamps**: Todos los registros tienen fecha de creación/actualización
5. **Validación de servidor**: Además del cliente, el backend valida todo

---

## 📞 Recursos

- **Documentación completa**: `INTEGRACION_JUSTIFICACIONES.md`
- **Controlador backend**: `servidor/src/justificaciones/controller.py`
- **Interfaces**: `client/src/interfaces/justificaciones.interface.ts`
- **Hook API**: `client/src/hooks/useJustificacionesApi.hook.ts`

---

**Última actualización:** 5 de Noviembre de 2025
**Estado:** ✅ Completado
