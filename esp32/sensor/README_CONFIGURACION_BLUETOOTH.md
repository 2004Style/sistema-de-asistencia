# 📱 Configuración via Bluetooth

## 🎯 Objetivo

Permite configurar WiFi y WebSocket sin necesidad de recompilar el código cada vez que cambias de red o servidor.

## 🔧 Características

- ✅ Configuración via **Bluetooth Serial**
- ✅ Almacenamiento **persistente en EEPROM**
- ✅ Interfaz de comandos simple
- ✅ Activación mediante **botón físico** (BOOT)
- ✅ Timeout de seguridad (5 minutos)
- ✅ Valores por defecto en el código

## 📋 Modo de Uso

### 1️⃣ Entrar en Modo Configuración

**Opción A: Botón Físico (Recomendado)**

1. Desconecta el ESP32
2. Mantén presionado el botón **BOOT** (GPIO0)
3. Conecta el ESP32 (USB o alimentación)
4. Espera 2 segundos (mantén presionado)
5. Suelta el botón
6. El LED debería parpadear y verás en el monitor serial:
   ```
   [CONFIG] 🔵 Botón presionado - entrando en modo configuración...
   [BT] ✓ Bluetooth iniciado - esperando conexión...
   ```

**Opción B: Comando Serial (Avanzado)**

- Envía el comando `CONFIG` por el monitor serial

### 2️⃣ Conectar via Bluetooth

#### En Android:

1. Abre **Configuración → Bluetooth**
2. Busca el dispositivo: **ESP32-Huella-Config**
3. Conéctate (no requiere PIN)
4. Abre una app de **Terminal Bluetooth** (Serial Bluetooth Terminal, Bluefruit, etc.)
5. Conéctate al dispositivo

#### En PC (Linux/Windows):

```bash
# Linux
sudo rfcomm bind /dev/rfcomm0 <MAC_ADDRESS> 1
screen /dev/rfcomm0 115200

# Windows (con Tera Term o PuTTY)
# Emparejar el dispositivo primero en Configuración de Windows
# Luego usar COM virtual asignado
```

#### En iOS:

- Usa apps como **BLE Scanner** o **LightBlue**

### 3️⃣ Comandos Disponibles

Una vez conectado via Bluetooth, puedes enviar estos comandos:

#### 📊 Ver configuración actual

```
STATUS
```

**Respuesta:**

```
WiFi SSID: ronald
WS Host: 192.168.178.194
WS Port: 8000
Configured: YES
```

#### 💾 Guardar nueva configuración

```
SET:MiWiFi|MiPassword|192.168.1.100|8080
```

**Formato:**

```
SET:<SSID>|<PASSWORD>|<HOST>|<PUERTO>
```

**Ejemplo 1:** Cambiar solo el servidor

```
SET:ronald|ronald2004|192.168.1.50|3000
```

**Ejemplo 2:** Nueva red WiFi completa

```
SET:OficinaWiFi|ClaveSegura123|10.0.0.5|8000
```

**Respuesta:**

```
OK:Configuración guardada. Reiniciando en 3s...
```

#### 🗑️ Borrar configuración

```
RESET
```

Elimina toda la configuración guardada y vuelve a los valores del código.

**Respuesta:**

```
OK:Configuración borrada. Reiniciando en 3s...
```

#### 📄 Ver interfaz HTML

```
HTML
```

Muestra la interfaz web (útil para apps que renderizan HTML).

## 🔄 Flujo Completo de Ejemplo

```
1. Presionar BOOT al encender
   → ESP32 entra en modo configuración

2. Conectar Bluetooth desde celular
   → Dispositivo: ESP32-Huella-Config

3. Abrir terminal Bluetooth

4. Ver configuración actual:
   > STATUS
   < WiFi SSID: ronald
   < WS Host: 192.168.178.194
   < WS Port: 8000

5. Cambiar servidor:
   > SET:ronald|ronald2004|192.168.1.100|8000
   < OK:Configuración guardada. Reiniciando en 3s...

6. ESP32 se reinicia automáticamente
   → Conecta con la nueva configuración
```

## 🛡️ Seguridad

### ⏱️ Timeout Automático

- El modo configuración se cierra después de **5 minutos** de inactividad
- Esto evita que alguien configure tu dispositivo si olvidas salir del modo

### 🔒 Protección de Datos

- La contraseña WiFi se guarda en EEPROM (no en código plano)
- Solo accesible cuando el dispositivo está en modo configuración
- Requiere presionar botón físico para entrar

### 🚫 Desactivar Bluetooth en Operación Normal

- Bluetooth se apaga automáticamente al salir del modo configuración
- No consume recursos durante operación normal

## 📱 Apps Recomendadas

### Android

- **Serial Bluetooth Terminal** (gratis, sin ads)
  - [Google Play](https://play.google.com/store/apps/details?id=de.kai_morich.serial_bluetooth_terminal)
- **BlueTerm** (simple y efectiva)
- **Arduino Bluetooth Controller** (visual)

### iOS

- **BLE Terminal**
- **LightBlue** (herramienta profesional)

### PC

- **PuTTY** (Windows)
- **Tera Term** (Windows)
- **screen** o **minicom** (Linux)

## ⚙️ Configuración en platformio.ini

Si usas PlatformIO, asegúrate de incluir la librería BluetoothSerial:

```ini
[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino
lib_deps =
    adafruit/Adafruit Fingerprint Sensor Library
    bblanchon/ArduinoJson
    links2004/WebSockets
monitor_speed = 115200
```

## 🐛 Troubleshooting

### No aparece el dispositivo Bluetooth

- ✅ Verifica que presionaste BOOT al menos 2 segundos
- ✅ Revisa el monitor serial: debe decir "Bluetooth iniciado"
- ✅ Desactiva/activa Bluetooth en tu dispositivo
- ✅ Prueba con otra app de terminal Bluetooth

### Error al guardar configuración

- ✅ Verifica el formato: `SET:ssid|pass|host|port`
- ✅ No uses caracteres especiales en la contraseña (| \_ : espacio)
- ✅ El puerto debe ser un número válido

### ESP32 no conecta tras configurar

- ✅ Verifica SSID y contraseña (sensible a mayúsculas)
- ✅ Revisa que el servidor esté corriendo en el host/puerto especificado
- ✅ Comprueba que estén en la misma red

### Olvidé mi configuración

- Envía el comando `STATUS` para verla
- O envía `RESET` para volver a los valores del código

## 🔄 Actualizar el Código sin Perder Configuración

La configuración se guarda en EEPROM, así que puedes:

1. Actualizar el firmware
2. La configuración persiste automáticamente
3. No necesitas reconfigurar cada vez

Para **forzar valores nuevos**:

1. Cambia los valores por defecto en el código
2. Envía `RESET` via Bluetooth
3. Los nuevos valores del código se cargarán

## 📝 Notas Adicionales

- La configuración se guarda en el **namespace** `esp32-config`
- Usa el **partition scheme** por defecto (no requiere partición especial)
- Compatible con ESP32, ESP32-S2, ESP32-S3, ESP32-C3
- No requiere librerías adicionales (BluetoothSerial está incluida en el core)

## 🚀 Características Avanzadas (Futuras)

- [ ] Interfaz web completa via Bluetooth Web API
- [ ] Escaneo de redes WiFi disponibles
- [ ] Test de conexión antes de guardar
- [ ] Configuración de múltiples perfiles
- [ ] App móvil nativa (Flutter/React Native)
- [ ] Backup/restore de configuración via JSON

---

💡 **Tip:** Guarda tu configuración en un archivo de texto por si necesitas reconfigurar múltiples dispositivos.
