# 🎯 Guía de Uso - Módulo de Horarios

## Para Usuarios (Cliente)

### 1. Acceder a Mis Horarios

1. Navega a `/client/horarios`
2. Verás una lista de tus horarios asignados
3. Cada horario muestra:
   - Día de la semana
   - Nombre del turno
   - Horario (entrada - salida)
   - Horas requeridas
   - Estado (Activo/Inactivo)

### 2. Filtrar Horarios

- **Por Día**: Selecciona un día específico en el selector
- **Por Estado**: Filtra entre Activo e Inactivo
- Deja los campos vacíos para ver todos

### 3. Ver Detalle de un Horario

1. Haz click en "Ver Detalle" de cualquier horario
2. Verás información completa:
   - Horarios (entrada, salida)
   - Tolerancias de entrada y salida
   - Horas requeridas
   - Información del usuario
   - Descripción (si existe)
   - Fechas de creación y actualización

### 4. ¿Cómo Cambiar mi Horario?

- Contacta con un administrador
- Los usuarios no pueden modificar sus horarios directamente
- El cambio debe hacerse desde la sección de administración

---

## Para Administradores (Admin)

### 1. Ver Todos los Horarios

1. Navega a `/admin/horarios`
2. Verás una tabla con todos los horarios del sistema
3. Tabla incluye:
   - ID del horario
   - Nombre del usuario
   - Email del usuario
   - Día de la semana
   - Turno asignado
   - Horarios (entrada - salida)
   - Tolerancias
   - Estado activo
   - Timestamps

### 2. Crear un Nuevo Horario

1. Haz click en "Crear Horario" o navega a `/admin/horarios/create`
2. Completa el formulario:
   - **Usuario**: Busca y selecciona el usuario (UserCombobox)
   - **Día de la Semana**: Selecciona el día (lunes-domingo)
   - **Turno**: Busca el turno disponible
   - **Hora de Entrada**: Selecciona con time picker (HH:MM:SS)
   - **Hora de Salida**: Selecciona con time picker (HH:MM:SS)
   - **Tiempo Requerido**: Ingresa en horas o minutos
   - **Tolerancia de Entrada**: Minutos de gracia (default: 15)
   - **Tolerancia de Salida**: Minutos de gracia (default: 15)
   - **Descripción**: Notas adicionales (opcional)
   - **Horario Activo**: Marca si debe estar vigente inmediatamente
3. Haz click en "Crear Horario"

### 3. Ver Detalle de un Horario

1. Desde la tabla, haz click en la fila del horario
2. O navega a `/admin/horarios/{id}`
3. Verás:
   - Información completa del horario
   - Datos del usuario asignado
   - Botones de acción (Editar, Eliminar)

### 4. Editar un Horario

1. En la página de detalle, haz click en "Editar"
2. O navega a `/admin/horarios/{id}/edit`
3. Puedes modificar:
   - Hora de entrada
   - Hora de salida
   - Horas requeridas
   - Tolerancia de entrada
   - Tolerancia de salida
   - Estado activo/inactivo
4. Haz click en "Guardar Cambios"
5. Se redirige a la página de detalle tras guardar

### 5. Eliminar un Horario

1. En la página de detalle, haz click en "Eliminar"
2. Se abrirá un diálogo de confirmación
3. Haz click en "Eliminar" para confirmar
4. Se redirige a la lista de horarios

### 6. Acciones Especiales

- **Crear múltiples horarios**: Usa el endpoint `/horarios/bulk` (desde backend)
- **Detectar turno activo**: Útil para validar asistencias
- **Eliminar por usuario**: Elimina todos los horarios de un usuario

---

## 🔑 Niveles de Acceso

```
USUARIO (Cliente):
├── Ver mis horarios (/client/horarios)
├── Filtrar horarios
├── Ver detalle (/client/horarios/[id])
└── ❌ No puede crear/editar/eliminar

ADMINISTRADOR (Admin):
├── Ver todos los horarios (/admin/horarios)
├── Crear nuevo (/admin/horarios/create)
├── Ver detalle (/admin/horarios/[id])
├── Editar (/admin/horarios/[id]/edit)
├── Eliminar individual
├── Crear en lote (/horarios/bulk)
└── Detectar turno activo
```

---

## 📋 Estados de Validación

### Al Crear:

- ✅ Usuario requerido
- ✅ Día de la semana requerido
- ✅ Turno requerido
- ✅ Hora entrada formato HH:MM:SS
- ✅ Hora salida formato HH:MM:SS
- ✅ Hora salida > hora entrada (o turno nocturno)
- ✅ Tiempo requerido 1-1440 minutos (1 min - 24 horas)
- ✅ Tolerancias 0-120 minutos

### Al Editar:

- ✅ Formato de hora validado
- ✅ Valores numéricos positivos
- ✅ Tolerancias máximo 120 minutos
- ✅ Cambio de estado activo/inactivo

---

## 🚨 Casos de Error Comunes

### "Error al cargar horarios"

- Verificar conexión a internet
- Verificar que el servidor esté en línea
- Revisar permisos de acceso

### "Formato HH:MM requerido"

- El time picker debe tener datos completos
- Usa el selector de hora del navegador

### "Usuario no encontrado"

- Verifica que el ID de usuario sea válido
- El usuario debe existir en el sistema

### "Turno no encontrado"

- Verifica que el turno esté creado
- El turno debe estar asignado

---

## 💡 Tips Útiles

### Para Usuarios:

1. Guarda tu horario para referencia
2. Anota las tolerancias para llegar a tiempo
3. Contacta admin si hay cambios requeridos

### Para Administradores:

1. Crea horarios después de crear turnos
2. Define tolerancias consistentes en la empresa
3. Usa descripciones para notas de excepciones
4. Marca como inactivo cuando termina el período
5. Realiza cambios masivos si es posible

---

## 🔄 Flujos Principales

### Flujo de Creación:

```
Crear → Seleccionar Usuario → Elegir Día y Turno →
Definir Horarios → Establecer Tolerancias →
Confirmar → Redirigir a Lista
```

### Flujo de Edición:

```
Ver Detalle → Botón Editar → Modificar Campos →
Validar → Guardar → Redirigir a Detalle
```

### Flujo de Eliminación:

```
Ver Detalle → Botón Eliminar → Confirmar en Diálogo →
Eliminar → Redirigir a Lista
```

---

## 📞 Soporte

Si encuentras problemas:

1. Verifica que estés autenticado
2. Comprueba tus permisos (usuario vs admin)
3. Revisa la consola del navegador para errores
4. Contacta al administrador del sistema
5. Consulta logs del servidor backend

---

**Última actualización**: 2024
**Versión**: 1.0
