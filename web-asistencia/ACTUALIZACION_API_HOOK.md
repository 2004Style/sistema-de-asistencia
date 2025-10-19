# Actualización del Hook useClientApi - Next-Auth Integration

## ✅ Cambios Realizados

El hook `useClientApi` ha sido actualizado para obtener los tokens **directamente de Next-Auth** en lugar del localStorage.

### 🔄 Cambios principales:

1. **`getStoredTokens()` → `getSessionTokens()`**

   - Ahora obtiene los tokens de `/api/auth/session`
   - Los tokens se manejan automáticamente por Next-Auth
   - No requiere localStorage

2. **`saveTokens()` es opcional**

   - Next-Auth maneja el almacenamiento automáticamente
   - La función se mantiene por compatibilidad

3. **`refreshAuthToken()` simplificado**

   - Next-Auth maneja automáticamente el refresh
   - Solo obtenemos el token de la sesión actual

4. **`clearSession()` simplificado**
   - Next-Auth maneja la limpieza automáticamente

## 📝 Cómo usar el Hook

### Ejemplo básico:

```typescript
"use client";

import { useClientApi } from "@/hooks/useClientApi.hook";

export function MyComponent() {
  const api = useClientApi(true); // requiresAuth = true (por defecto)

  const handleFetch = async () => {
    // GET request
    const response = await api.get("/api/users");

    if (response.alert === "success") {
      console.log("Usuarios:", response.data);
    } else {
      console.error("Error:", response.message);
    }
  };

  return (
    <div>
      {api.loading && <p>Cargando...</p>}
      {api.error && <p>Error: {api.error}</p>}
      <button onClick={handleFetch}>Obtener Usuarios</button>
    </div>
  );
}
```

### POST request:

```typescript
const response = await api.post("/api/users", {
  name: "Juan",
  email: "juan@example.com",
});

if (response.alert === "success") {
  console.log("Usuario creado:", response.data);
}
```

### POST con FormData:

```typescript
const formData = new FormData();
formData.append("file", file);
formData.append("name", "Mi documento");

const response = await api.post("/api/upload", formData, { contentType: "form-data" });
```

### Métodos disponibles:

```typescript
const api = useClientApi();

// Métodos HTTP
await api.get(url, config);
await api.post(url, body, config);
await api.put(url, body, config);
await api.patch(url, body, config);
await api.del(url, config);

// Estado
api.data; // Datos retornados
api.loading; // true mientras se realiza la petición
api.error; // Mensaje de error (si hay)
api.alert; // Tipo de alerta: "success" | "error" | "warning" | "info"

// Utilidades
api.reset(); // Limpia el estado
await api.getTokens(); // Obtiene tokens de la sesión
```

## 🔐 Autenticación

Los tokens se obtienen automáticamente de Next-Auth:

1. **En cada petición**, el hook:

   - Obtiene la sesión actual
   - Extrae el `accessToken`
   - Lo envía en el header `Authorization: Bearer {token}`

2. **Si el token expira (401)**:

   - Next-Auth maneja automáticamente el refresh
   - Se obtiene el nuevo token de la sesión
   - Se reintenta la petición

3. **Si no hay sesión**:
   - La petición retorna error: "No se ha autenticado el usuario"

## 🛠️ Configuración

### Sin autenticación:

```typescript
const api = useClientApi(false); // No requiere autenticación
await api.get("/api/public-data");
```

### Con URL base personalizada:

```typescript
const api = useClientApi(true, "https://api.example.com");
```

### Con timeout personalizado:

```typescript
await api.get("/api/users", { timeout: 60000 }); // 60 segundos
```

## 📌 Notas importantes

- Los tokens se obtienen de forma **síncrona desde la sesión de Next-Auth**
- El hook es **client-side only** (usa `"use client"`)
- La autenticación se maneja completamente con **Next-Auth**
- No hay necesidad de manejar tokens manualmente en localStorage
