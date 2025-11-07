# Plan de Seguridad - Sistema de Asistencia

## Introducción

Este documento describe la estrategia integral de seguridad implementada en el sistema de asistencia con reconocimiento facial, cubriendo tres pilares fundamentales: **Base de Datos**, **Aplicación** e **Infraestructura de Dispositivos**.

El sistema está compuesto por tres capas principales:

- **Servidor Backend**: API REST con FastAPI en Python
- **Cliente Frontend**: Aplicación web con Next.js en TypeScript
- **Dispositivo IoT (ESP32)**: Lector biométrico con sensor de huella dactilar

---

## 1. SEGURIDAD DE BASE DE DATOS

### 1.1 Arquitectura y Almacenamiento de Datos

#### Base de datos relacional (PostgreSQL)

- **Modelo de Datos**: El sistema utiliza SQLAlchemy ORM con modelos relacionales que aseguran integridad referencial
- **Datos Sensibles Almacenados**:
  - Credenciales de usuario (contraseñas)
  - Datos biométricos (huellas dactilares, embeddings faciales)
  - Registros de asistencia con timestamps
  - Justificaciones y documentación de ausencias
  - Roles y permisos de usuarios

#### Protección de Contraseñas

- **Algoritmo de Hash**: Bcrypt con salt generado automáticamente
- **Función de Hashing**: `hash_password()` convierte cada contraseña en un hash irreversible
- **Verificación**: `verify_password()` realiza comparación segura sin almacenar texto plano
- **Validación Mínima**: Las contraseñas requieren mínimo 8 caracteres
- **No hay reversibilidad**: Las contraseñas hashadas con Bcrypt no pueden recuperarse en texto plano

### 1.2 Almacenamiento de Datos Biométricos

#### Huella Dactilar (Fingerprint)

- **Formato de Almacenamiento**: Base64 encriptado en formato `<slot>|<datos_encriptados>`
- **Método de Encriptación**: AES-256-GCM (Galois/Counter Mode)
- **Componentes de Encriptación**:
  - **IV (Initialization Vector)**: 12 bytes generados aleatoriamente por cada registro
  - **Clave de Dispositivo**: 32 bytes hardcodeados en el ESP32 (compartida entre dispositivo y servidor)
  - **Validación de Integridad**: GCM proporciona autenticación (GCM Tag de 16 bytes)
- **Ubicación de Almacenamiento**: Campo `huella` en tabla `users` como `TEXT`
- **Ciclo de vida**: Se carga en registro del usuario mediante imágenes faciales y validación

#### Embeddings Faciales

- **Formato**: Arrays numéricos de alta dimensión (embeddings vectoriales)
- **Almacenamiento**: Sistema de ficheros en `recognize/data` con serialización pickle
- **Estructura**: Base de datos en memoria con caché del archivo `embeddings.pickle`
- **No Reversible**: Los embeddings son representaciones matemáticas que no pueden revertir a imagen original
- **Acceso Controlado**: Solo el módulo de reconocimiento facial puede acceder

### 1.3 Control de Acceso a la Base de Datos

#### Conexión Segura

- **Cadena de Conexión**: PostgreSQL con autenticación usuario/contraseña
- **Pool de Conexiones**: Tamaño máximo de 10 conexiones, overflow máximo de 20
- **Pre-ping**: Validación de conexión antes de usar (detecta conexiones muertas)
- **Credenciales**: Almacenadas en variable de entorno `DATABASE_URL`

#### Inyección SQL

- **ORM SQLAlchemy**: Previene inyección SQL mediante prepared statements
- **Validación con Pydantic**: Todos los inputs se validan contra esquemas Pydantic antes de consultas
- **Parametrización**: Las consultas nunca construyen strings concatenados

### 1.4 Integridad de Datos

#### Restricciones de Integridad

- **Foreign Keys**: Todas las tablas relacionales tienen restricciones FK con `ondelete` definidos
- **Índices**: Campos críticos (email, codigo_user, user_id) tienen índices para búsquedas seguras
- **Unicidad**: Campos email y codigo_user tienen restricción UNIQUE a nivel BD
- **Valores por Defecto**: Estados enumerados tienen valores por defecto seguros

#### Migraciones y Versionado

- **Sistema Alembic**: Gestiona migraciones de esquema con historial completo
- **Auditoría de Cambios**: Cada migración se registra en tabla `_prisma_migrations`
- **Reversibilidad**: Las migraciones pueden revertirse para recuperarse de cambios

---

## 2. SEGURIDAD DE APLICACIÓN

### 2.1 Autenticación y Autorización

#### Sistema de Tokens JWT

**Flujo de Autenticación**:

1. Usuario proporciona email y contraseña
2. Sistema verifica contraseña contra hash en BD usando Bcrypt
3. Si válida, genera par de tokens JWT:
   - **Access Token**: Durabilidad corta (50 minutos)
   - **Refresh Token**: Durabilidad larga (7 días)

**Estructura del JWT**:

- **Header**: Especifica algoritmo (HS256)
- **Payload**: Contiene:
  - `sub` (subject): user_id
  - `email`: correo del usuario
  - `type`: tipo de token (access/refresh)
  - `exp`: timestamp de expiración
- **Signature**: Firmado con JWT_SECRET_KEY usando HMAC-SHA256

**Almacenamiento de Tokens**:

- **Cliente (NextAuth)**: Access token en sesión del navegador, refresh token en cookie httpOnly
- **Validación**: Cada request verifica token contra JWT_SECRET_KEY

#### Dependencias de Autenticación

- **`get_current_user()`**: Dependencia FastAPI que verifica token y retorna usuario autenticado
- **`get_token_from_header()`**: Extrae token del header Authorization en formato `Bearer <token>`
- **Validación de Token**: `verify_token()` decodifica y valida firma

#### Sistema de Roles y Permisos

**Roles Definidos**:

1. **ADMINISTRADOR** (`es_admin=True`)

   - Acceso total al sistema
   - Gestión de usuarios
   - Aprobación de justificaciones
   - Visualización de reportes

2. **SUPERVISOR** (`puede_aprobar=True`)

   - Aprobación de justificaciones
   - Visualización de reportes
   - Gestión limitada de equipo

3. **COLABORADOR** (rol por defecto)

   - Registro de asistencia propia
   - Visualización de registros personales
   - Presentación de justificaciones

4. **RRHH** (`puede_ver_reportes=True`)
   - Acceso a reportes detallados
   - Análisis de asistencia

**Modelo de Permisos**:

```
Tabla roles:
- es_admin: Boolean
- puede_aprobar: Boolean
- puede_ver_reportes: Boolean
- puede_gestionar_usuarios: Boolean
```

**Control de Acceso en Endpoints**:

- **`require_admin`**: Valida `current_user.es_admin == True`
- **`require_can_approve`**: Valida `current_user.puede_aprobar == True`
- **`require_can_view_reports`**: Valida `current_user.puede_ver_reportes == True`
- **`require_can_manage_users`**: Valida `current_user.puede_gestionar_usuarios == True`

#### Validación de Usuario Activo

- **Estado `is_active`**: Cada usuario tiene bandera de activación
- **Verificación**: Antes de procesar cualquier request, se valida que usuario esté activo
- **Desactivación**: Usuarios inactivos reciben HTTP 403 Forbidden

### 2.2 Validación de Datos de Entrada

#### Esquemas Pydantic

Todos los endpoints utilizan esquemas Pydantic que validan:

**UserCreate**:

- Email válido (formato RFC 5321)
- Contraseña mínimo 8 caracteres
- Confirmación de contraseña coincide
- codigo_user único

**UserUpdate**:

- Todos los campos opcionales
- Validación condicionada si campo presente

**LoginRequest**:

- Email válido
- Password no vacío

**Asistencia/Justificación**:

- Fechas válidas
- Enums válidos (TipoRegistro, EstadoAsistencia, TipoJustificacion)
- IDs referenciados existen en BD

#### Validación de Archivos

- **Imágenes de Registro**: Exactamente 10 imágenes por usuario
- **Extensiones Permitidas**: `.jpg, .jpeg, .png, .gif, .webp`
- **Tamaño Máximo**: 10MB por archivo
- **Validación MIME**: Se verifica extensión y contenido

### 2.3 Gestión de Sesiones

#### NextAuth (Cliente)

- **Proveedor**: CredentialsProvider con backend API
- **Callbacks JWT**:
  - Al login: almacena user y tokens
  - Refresh automático si token expiró
- **Callbacks Session**: Mantiene user y tokens en sesión
- **Páginas Personalizadas**: Redirect a login si no autenticado

#### FastAPI (Servidor)

- **Stateless**: No mantiene sesiones en servidor
- **Basado en JWT**: Cada request trae su token
- **Validación por Token**: No hay sesiones de servidor, cada JWT es auto-contenido

### 2.4 CORS (Cross-Origin Resource Sharing)

#### Configuración

```python
CORSMiddleware:
- allow_origins: ["*"]  # Actualmente permite todos
- allow_credentials: True
- allow_methods: ["*"]
- allow_headers: ["*"]
```

**Nota**: En producción, should be restrictive:

- Especificar dominios permitidos
- NO usar wildcards con credentials

### 2.5 Cifrado de Datos en Tránsito

#### Protocolo de Comunicación

- **Cliente-Servidor**: Requiere HTTPS (gestionado por infraestructura de hosting)
- **WebSocket (Socket.IO)**: WSS (WebSocket Secure) cuando en HTTPS
- **Encriptación TLS/SSL**: Cifra headers y payloads en tránsito

#### Contenido de Comunicación

- **Headers Authorization**: Token JWT se envía en header `Authorization: Bearer <token>`
- **Body de Requests**: JSON encriptado a nivel TLS
- **Respuestas**: Incluyen tokens nuevos si refresh fue necesario

### 2.6 Manejo de Datos Sensibles

#### Información No Enviada al Cliente

- **Contraseñas**: Nunca se retornan en responses
- **Hashes de Contraseña**: No se incluyen en schemas de respuesta
- **Huella Dactilar Raw**: Solo se envía cuando se registra usuario (validación)
- **Embeddings Faciales**: Se almacenan solo en servidor, nunca se envían a cliente

#### Información Limitada en Logs

- **Datos Sensibles Excluidos**: Las contraseñas no se loguean
- **Tokens en Debug**: Si DEBUG=True, logs pueden contener info sensible
- **Recomendación**: DEBUG=False en producción

### 2.7 Manejo de Errores

#### Respuestas de Error Genéricas

- **HTTP 401 Unauthorized**: Token inválido/expirado (no revela detalles)
- **HTTP 403 Forbidden**: Permisos insuficientes
- **HTTP 404 Not Found**: Recurso no existe (no revela si user existe)
- **HTTP 400 Bad Request**: Validación falló

#### Evita Information Disclosure

- No revela si usuario existe en validaciones
- No expone detalles de estructura de BD
- No muestra stack traces en producción (cuando DEBUG=False)

---

## 3. SEGURIDAD DE DISPOSITIVO ESP32

### 3.1 Conectividad y Comunicación

#### Conexión WiFi

- **Credenciales**: SSID y contraseña almacenadas en código (VULNERABILITY - debe ser config)
- **Validación**: Verifica conexión antes de intentar WebSocket
- **Reconexión**: Implementa exponential backoff para reconexiones (1s → 30s máx)

#### WebSocket (Socket.IO)

- **Protocolo**: WebSocket + Socket.IO para comunicación bidireccional
- **Autenticación**:
  - Sin autenticación explícita en WebSocket
  - Se asume que cliente ya fue autenticado via HTTP Login
  - **RECOMENDACIÓN**: Implementar token en handshake

#### Encriptación de Huella Dactilar en Tránsito

- **Método**: AES-256-GCM
- **Flujo**:
  1. ESP32 captura huella del sensor
  2. Encripta con DEVICE_KEY (32 bytes) + IV aleatorio (12 bytes)
  3. Genera GCM Tag (16 bytes) para autenticación
  4. Serializa como Base64
  5. Envía por WebSocket (encriptado a nivel TLS/WSS)

**Estructura del Mensaje**:

```
{
  "tipo": "registro_huella",
  "codigo_user": "<codigo>",
  "huella_encriptada": "<base64>",  // Contiene IV + datos + tag
  "timestamp": "<millis>"
}
```

### 3.2 Autenticación del Dispositivo

#### Identidad del Dispositivo

- **DEVICE_KEY**: Clave compartida de 32 bytes entre ESP32 y servidor
- **Hardcodeado**: En código del ESP32 (NO es seguro para producción)
- **Uso**: Encriptación/desencriptación de huellas

#### Validación de Mensajes

- **GCM Tag**: Valida integridad del mensaje encriptado
- **Timestamp**: Previene replay attacks
- **Validación de Token**: Cada usuario debe estar autenticado antes de registrar

### 3.3 Manejo de Buffer de Mensajes

#### Persistencia en Desconexiones

- **Queue en Memoria**: Almacena hasta 10 mensajes si desconectado
- **Durabilidad**: 60 segundos máximo (mensajes más antiguos se descartan)
- **Reenvío**: Al reconectar, reenvía mensajes pendientes
- **Límite**: NO persiste a nivel EEPROM (se pierden con reinicio)

**Propósito**: Asegurar que registros de asistencia no se pierdan en desconexiones temporales

### 3.4 Control de Capturas Biométricas

#### Cancelación en Tiempo Real

- **Flag `cancelarCaptura`**: Se puede cancelar captura desde WebSocket
- **Verificación Agresiva**: Cada 20ms durante captura
- **Client SID**: Evita cancelar capturas de otro cliente
- **Seguridad**: Previene capturas forzadas o spam

#### Indicadores de Estado (LEDs)

- **LED Registro (Azul)**: Indica modo de registro de nuevas personas
- **LED Asistencia (Verde)**: Indica modo de registro de asistencia
- **Feedback Visual**: Usuario sabe qué tipo de captura se espera

### 3.5 Sensor de Huella Dactilar

#### Comunicación con Sensor

- **Interfaz Serial**: UART a 57600 baud
- **Librería**: Adafruit_Fingerprint
- **Slots de Almacenamiento**: Sensor tiene memoria local (generalmente 162 o 256 slots)
- **Templates**: Datos de huella se almacenan en slots del sensor

#### Registro de Huella

- **Proceso Multi-Captura**: Requiere 3-5 capturas de misma huella para crear template
- **Validación**: Sistema verifica que todas las capturas sean del mismo dedo
- **Template Size**: Máximo 2048 bytes por template
- **Encriptación**: Template se encripta antes de enviarse

### 3.6 Dual-Core Processing

#### Task Separation

- **Core 0**: Task WebSocket (comunicación con servidor)
- **Core 1**: Task Sensor (lectura de huella, validación)
- **Ventaja**: No bloquea comunicación durante captura
- **Sincronización**: Flags volatiles compartidas entre cores

#### Race Conditions Prevenidas

- **Volatile Flags**: `wsConnected`, `capturaEnProgreso`, `cancelarCaptura`
- **Mutex Implícito**: Operaciones de 32 bits son atómicas en ESP32
- **Sincronización**: Buffer de mensajes es thread-safe (queue, no lista)

### 3.7 Keep-Alive y Healthcheck

#### Ping/Pong (Protocolo Socket.IO)

- **Ping Interval**: Cada 10 segundos
- **Pong Timeout**: 15 segundos para respuesta
- **Inactivity Timeout**: Si no hay actividad en 20 segundos, reconecta
- **Propósito**: Detectar conexiones muertas y reconectar automáticamente

#### Exponential Backoff

- **Intentos Máximos**: 6 intentos
- **Intervalos**: 1s, 2s, 4s, 8s, 16s, 30s
- **Reset**: Se resetea en reconexión exitosa

---

## 4. ARQUITECTURA DE SEGURIDAD A NIVEL APLICACIÓN

### 4.1 Flujo de Registro de Asistencia por Huella

**Flujo Completo**:

1. Usuario se acerca a ESP32 y selecciona tipo de registro (entrada/salida)
2. ESP32 se conecta a WebSocket del servidor
3. Cliente envía evento con `codigo_user` y `tipo_registro`
4. ESP32 captura huella mediante sensor biométrico
5. Encripta huella con AES-256-GCM
6. Envía por WebSocket al servidor
7. Servidor recibe, desencripta, valida usuario
8. Verifica si hay turno activo para el usuario
9. Registra asistencia en BD con:
   - `user_id`: Identificador único del usuario
   - `fecha`: Fecha actual
   - `hora_entrada`/`hora_salida`: Timestamp exacto
   - `metodo_entrada`/`metodo_salida`: "huella"
   - `estado`: Calcula si es PRESENTE, TARDE, etc.
10. Notifica al cliente via WebSocket
11. Envía notificación por email si aplica

### 4.2 Flujo de Autenticación de Usuario

**Secuencia**:

1. Usuario accede a `/auth/signin`
2. Ingresa email y contraseña
3. Cliente envía POST a `/api/users/login/credentials`
4. Servidor verifica:
   - Usuario existe (email en BD)
   - Contraseña correcta (Bcrypt verify)
   - Usuario activo (`is_active == True`)
5. Si válida, genera JWT tokens:
   - Access Token: 50 minutos
   - Refresh Token: 7 días
6. Retorna en response: `{ user, backendTokens: { accessToken, refreshToken, expiresIn } }`
7. Cliente (NextAuth) almacena:
   - Access token: Sesión
   - Refresh token: Cookie httpOnly
8. Incluye access token en header Authorization para requests posteriores

### 4.3 Flujo de Reconocimiento Facial en Registro

**Secuencia**:

1. Durante POST `/api/users/register`, cliente envía 10 imágenes
2. Servidor recibe, valida:
   - Exactamente 10 imágenes
   - Cada imagen es válida (JPEG/PNG, <10MB)
   - Mismo usuario en todas las imágenes
3. Procesa imágenes:
   - Detecta rostros con librería de detección
   - Extrae embeddings faciales
   - Preprocesa (ajusta iluminación, rotación)
4. Almacena:
   - Imágenes: `recognize/data/<username>/image_*.jpg`
   - Embeddings: `recognize/embeddings.pickle`
   - Metadata: `recognize/metadata.json`
5. Registra usuario en BD con `is_active=True`
6. Retorna UserResponse con datos del usuario

### 4.4 Control de Acceso por Endpoint

**Rutas Públicas** (sin autenticación):

- POST `/api/users/register` - Registro de nuevo usuario
- POST `/api/users/login/credentials` - Login

**Rutas Protegidas** (requieren authentication):

- GET `/api/users/{user_id}` - Ver usuario (cualquiera puede ver su propio perfil)
- PUT `/api/users/{user_id}` - Actualizar usuario (solo admin o propietario)
- GET `/api/asistencia/` - Listar asistencias (requiere permisos)
- POST `/api/justificaciones/` - Crear justificación

**Rutas Admin-Only** (requieren `es_admin=True`):

- GET `/api/users/` - Listar todos los usuarios
- DELETE `/api/users/{user_id}` - Eliminar usuario
- POST `/api/usuarios/{user_id}/update_huella` - Actualizar huella

**Rutas Supervisor/Aprobador** (requieren `puede_aprobar=True`):

- PUT `/api/justificaciones/{justif_id}/aprobar` - Aprobar justificación

### 4.5 Auditoría y Logging

#### Eventos Registrados

- **Login**: Usuario, hora, exitoso/fallido
- **Cambios de Rol**: Usuario, rol anterior, rol nuevo, quién cambió
- **Aprobaciones**: Justificación aprobada/rechazada, quién, cuándo
- **Registro de Asistencia**: Usuario, tipo, hora, método
- **Acceso a Reportes**: Usuario, tipo, período

#### Ubicación de Logs

- **Servidor**: `src/recognize/logs/`
- **Aplicación**: Logs de FastAPI en consola y archivo
- **Nivel**: DEBUG en desarrollo, WARNING en producción

---

## 5. SEGURIDAD DE INFRAESTRUCTURA DE CLIENTE (NEXT.JS)

### 5.1 Manejo de Sesión NextAuth

#### Almacenamiento de Credenciales

- **Access Token**: Almacenado en sesión (NO en localStorage)
- **Refresh Token**: Cookie httpOnly (no accesible via JavaScript)
- **Session Object**: Disponible en `getServerSession()` en servidor

#### Protección contra Ataques

- **CSRF**: NextAuth maneja automáticamente CSRF tokens
- **XSS**: Tokens en httpOnly cookies no accesibles via JavaScript
- **Token Expiry**: Access token expira en 50 minutos

### 5.2 Refresh de Tokens

#### Flujo Automático

1. Cliente realiza request con token expirado
2. JWT callback detecta expiración
3. Llama a `refreshToken()` que envía Refresh Token
4. Servidor valida refresh token
5. Genera nuevo access token
6. Actualiza sesión con nuevo token
7. Request original se reintenta con nuevo token

#### Manejo de Fallos

- Si refresh falla, se retorna token anterior
- Usuario permanece autenticado (pero con token vencido)
- Próxima navegación a login si token es inválido

### 5.3 Rutas Protegidas

#### Middlewares de Autenticación

- `/admin/*`: Requiere `isAdmin=True`
- `/dashboard/*`: Requiere sesión activa
- `/api/*`: Valida token JWT

#### Redirecciones

- No autenticado: Redirige a `/auth/signin`
- Permisos insuficientes: Muestra error 403

### 5.4 Comunicación Segura

#### Requests al Backend

```typescript
// Header Authorization incluido automáticamente
fetch(URL, {
  headers: {
    Authorization: `Bearer ${session.backendTokens.accessToken}`,
  },
});
```

#### WebSocket (Socket.IO)

- Desconectado de autenticación HTTP
- Se asume conexión ya autenticada
- **MEJORA PENDIENTE**: Implementar handshake con token

### 5.5 Variables de Entorno

#### Secretos del Cliente

- `.env`: Variables expuestas al cliente (públicas)
- `BACKEND_ROUTES`: URLs del backend
- **Nunca incluir secretos**: API keys, JWT secrets

#### Secretos del Servidor

- `.env.local`: Variables solo en servidor
- `NEXTAUTH_SECRET`: Secreto para firmar JWT de NextAuth
- `JWT_SECRET`: Validar tokens del backend

---

## 6. MATRIZ DE SEGURIDAD

### 6.1 Amenazas y Mitigaciones

| Amenaza                      | Impacto | Mitigación                        | Estado             |
| ---------------------------- | ------- | --------------------------------- | ------------------ |
| Fuerza Bruta (Login)         | Alto    | Bcrypt, sin rate limit            | ⚠️ Pendiente       |
| Inyección SQL                | Alto    | SQLAlchemy ORM, Pydantic          | ✅ Implementado    |
| XSS                          | Medio   | httpOnly cookies, sanitización    | ✅ Implementado    |
| CSRF                         | Medio   | NextAuth CSRF tokens              | ✅ Implementado    |
| Replay Attack                | Medio   | IV aleatorio, GCM Tag, timestamp  | ✅ Implementado    |
| Acceso Rogue a Huellas       | Alto    | Encriptación AES-256-GCM          | ✅ Implementado    |
| Escalación de Privilegios    | Alto    | RBAC por rol, permisos granulares | ✅ Implementado    |
| Token Expirado No Refrescado | Medio   | Callback JWT auto-refresh         | ✅ Implementado    |
| Datos en Tránsito Sin TLS    | Crítico | Requiere HTTPS/WSS                | ⚠️ Infraestructura |
| Contraseña Débil             | Medio   | Validación mínimo 8 caracteres    | ⚠️ Pendiente       |

### 6.2 Checklists de Seguridad

#### Antes de Producción

**Base de Datos**:

- [ ] Cambiar `DATABASE_URL` de default
- [ ] Habilitar SSL en conexión PostgreSQL
- [ ] Configurar backups automáticos
- [ ] Validar restricciones de acceso a BD

**Aplicación**:

- [ ] Cambiar `SECRET_KEY` y `JWT_SECRET_KEY`
- [ ] Establecer `DEBUG=False`
- [ ] Configurar CORS con dominios específicos
- [ ] Implementar rate limiting en endpoints sensibles
- [ ] Validar validaciones de entrada

**Dispositivo ESP32**:

- [ ] NO hardcodear WiFi credentials (usar configuración)
- [ ] NO hardcodear DEVICE_KEY (usar provisioning seguro)
- [ ] Implementar autenticación en WebSocket handshake
- [ ] Validar integridad de firmware

**Cliente**:

- [ ] Verificar `NEXTAUTH_SECRET` configurado
- [ ] Validar CORS permite solo dominios propios
- [ ] Revisión de librerías (vulnerabilidades conocidas)

#### Operación Continua

- [ ] Monitorear logs de seguridad
- [ ] Revisar accesos a reportes sensibles
- [ ] Validar permisos de usuarios regularmente
- [ ] Actualizar dependencias mensualmente
- [ ] Revisar cambios en estructuras de datos sensibles

---

## 7. CONSIDERACIONES Y RECOMENDACIONES

### 7.1 Problemas de Seguridad Identificados

1. **WiFi Credentials Hardcodeado** (ESP32)

   - Ubicación: `sensor.ino` SSID y WIFI_PASSWORD constantes
   - Riesgo: Si código es comprometido, credenciales expuestas
   - Solución: Usar provisioning vía BLE o QR code

2. **DEVICE_KEY Hardcodeado** (ESP32)

   - Ubicación: Array de 32 bytes en `sensor.ino`
   - Riesgo: Clave compartida con servidor
   - Solución: Generar por dispositivo, almacenar en eFuse

3. **CORS Permisivo** (Servidor)

   - Ubicación: `main.py` `allow_origins=["*"]`
   - Riesgo: Permite requests desde cualquier sitio
   - Solución: Especificar dominios permitidos

4. **Sin Rate Limiting** (API)

   - Riesgo: Susceptible a fuerza bruta en login
   - Solución: Implementar rate limiting por IP/email

5. **Sin Validación en Handshake WebSocket**
   - Ubicación: `socketio_app.py` no valida token
   - Riesgo: Conexiones no autenticadas
   - Solución: Requerir token en query param o header

### 7.2 Mejoras Futuras

1. **Autenticación de Dos Factores (2FA)**

   - Implementar TOTP (Time-based OTP)
   - Usar email o app authenticator

2. **Provisioning Seguro de ESP32**

   - NVS Encryption para WiFi credentials
   - Certificate-based authentication

3. **Auditoría Avanzada**

   - Tabla de auditoría con todos los eventos
   - Alertas en tiempo real para acciones sospechosas

4. **Análisis de Comportamiento**

   - Detectar patrones anormales de asistencia
   - Alertar sobre cambios inusuales de rol

5. **Cifrado End-to-End**

   - Encriptación cliente-servidor para datos sensibles
   - Certificados SSL Client Side

6. **Backup Encriptado**
   - Backups de BD con encriptación AES
   - Almacenamiento en ubicación segura

---

## 8. REFERENCIAS Y ESTÁNDARES

### Estándares Implementados

- **Bcrypt**: OWASP recomendado para hashing de contraseñas
- **JWT (HS256/RS256)**: RFC 7519 para autenticación stateless
- **AES-256-GCM**: NIST SP 800-38D para encriptación authenticated
- **OAuth 2.0**: NextAuth implementa flujo Credentials

### Librerías de Seguridad Utilizadas

- `bcrypt`: Hashing de contraseñas
- `python-jose`: Generación y validación de JWT
- `mbedtls`: Encriptación en ESP32
- `next-auth`: Gestión de sesiones en cliente
- `pydantic`: Validación de datos

---

## Conclusión

El sistema de asistencia implementa múltiples capas de seguridad en sus tres componentes principales:

- **Base de Datos**: Encriptación de datos biométricos, hashing de contraseñas, validación de integridad
- **Aplicación**: Autenticación JWT, autorización por roles, validación de entrada, manejo seguro de sesiones
- **Dispositivo**: Encriptación AES-256-GCM de huellas, comunicación segura por WebSocket, control de acceso

Las mejoras identificadas (rate limiting, 2FA, provisioning seguro) permitirán fortalecer aún más la postura de seguridad según el entorno de despliegue.
