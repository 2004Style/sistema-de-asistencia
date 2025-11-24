# 🚀 GUÍA RÁPIDA - Configuración Bluetooth ESP32

## ✨ ¿Qué hace este sistema?

Permite cambiar la configuración de WiFi y WebSocket **SIN recompilar el código**, usando Bluetooth desde tu celular o PC.

---

## 📱 MÉTODO 1: Terminal Bluetooth (Más Simple)

### Paso 1: Activar Modo Configuración

1. **Apaga** el ESP32
2. **Mantén presionado** el botón **BOOT**
3. **Enciende** el ESP32 (sin soltar BOOT)
4. Espera **2 segundos**
5. **Suelta** el botón

### Paso 2: Conectar via Bluetooth

- **Nombre del dispositivo:** `ESP32-Huella-Config`
- Conéctate desde tu celular (Configuración → Bluetooth)

### Paso 3: Abrir App de Terminal

Apps recomendadas (Android):

- **Serial Bluetooth Terminal** ⭐ (recomendada)
- BlueTerm
- Arduino Bluetooth Controller

### Paso 4: Enviar Comandos

#### Ver configuración actual:

```
STATUS
```

#### Cambiar configuración:

```
SET:MiWiFi|MiPassword|192.168.1.100|8000
```

Formato: `SET:SSID|PASSWORD|HOST|PUERTO`

#### Ejemplo real:

```
SET:ronald|ronald2004|192.168.1.50|3000
```

¡Listo! El ESP32 se reinicia automáticamente con la nueva configuración.

---

## 💻 MÉTODO 2: Interfaz Web (Chrome/Edge)

### Paso 1: Activar Modo Configuración

(Igual que arriba: mantén BOOT 2 segundos al encender)

### Paso 2: Abrir Interfaz Web

1. Abre `configurador_web_bluetooth.html` en **Chrome** o **Edge**
2. Click en **"Conectar via Bluetooth"**
3. Selecciona **ESP32-Huella-Config**

### Paso 3: Configurar

- Rellena los campos:
  - WiFi SSID
  - WiFi Password
  - WebSocket Host (IP)
  - WebSocket Puerto
- Click en **"Guardar y Reiniciar"**

¡Listo! El ESP32 se configura automáticamente.

---

## 🔧 Comandos Disponibles

| Comando   | Descripción                 | Ejemplo                             |
| --------- | --------------------------- | ----------------------------------- |
| `STATUS`  | Ver configuración actual    | `STATUS`                            |
| `SET:...` | Guardar nueva configuración | `SET:WiFi\|Pass\|192.168.1.1\|8000` |
| `RESET`   | Borrar configuración        | `RESET`                             |
| `HTML`    | Ver interfaz HTML           | `HTML`                              |

---

## ⚡ Ejemplos de Uso

### Cambiar solo la IP del servidor:

```
SET:ronald|ronald2004|192.168.1.200|8000
```

### Cambiar a otra red WiFi:

```
SET:OficinaWiFi|ClaveOficina123|10.0.0.5|8000
```

### Cambiar el puerto del servidor:

```
SET:ronald|ronald2004|192.168.178.194|3000
```

### Volver a valores por defecto:

```
RESET
```

---

## 🐛 Solución de Problemas

### ❌ No aparece el dispositivo Bluetooth

- ✅ Presiona BOOT por **2 segundos completos**
- ✅ Verifica que el monitor serial diga: `[BT] ✓ Bluetooth iniciado`
- ✅ Reinicia el Bluetooth de tu celular

### ❌ Error al guardar

- ✅ Usa el formato correcto: `SET:ssid|pass|host|port`
- ✅ No uses caracteres raros (`|` `:` espacios extras)
- ✅ El puerto debe ser número

### ❌ No conecta después de configurar

- ✅ Revisa SSID y contraseña (sensible a mayúsculas)
- ✅ Verifica que el servidor esté corriendo
- ✅ Ambos deben estar en la misma red

---

## 🎯 Casos de Uso Comunes

### 🏠 Desarrollo en casa

```
SET:WiFi-Casa|password123|192.168.1.100|8000
```

### 🏢 Oficina/Universidad

```
SET:WiFi-Oficina|claveOficina|10.0.0.50|8000
```

### ☁️ Servidor en la nube

```
SET:MiWiFi|password|miservidsor.com|8000
```

### 🔄 Volver a desarrollo local

```
SET:ronald|ronald2004|192.168.178.194|8000
```

---

## 💡 Tips

- 📝 **Anota tu configuración** en un archivo de texto por si la olvidas
- 🔄 La configuración **persiste** entre reinicios
- ⚡ Puedes actualizar el firmware **sin perder** la configuración
- 🔒 El modo configuración se cierra **automáticamente** tras 5 minutos
- 🔴 Para entrar en modo configuración, el botón BOOT **debe estar presionado ANTES de encender**

---

## 📦 Requisitos

### Hardware:

- ESP32 (cualquier modelo)
- Botón BOOT (ya viene en la placa)

### Software:

- **Android:** Serial Bluetooth Terminal (app gratuita)
- **PC/Mac:** Chrome o Edge + `configurador_web_bluetooth.html`

---

## 🆘 Ayuda Rápida

**¿Olvidé mi configuración?**
→ Envía `STATUS` por Bluetooth

**¿Quiero valores por defecto?**
→ Envía `RESET` por Bluetooth

**¿No funciona el Bluetooth?**
→ Verifica monitor serial: `[BT] ✓ Bluetooth iniciado`

**¿Navegador no compatible?**
→ Usa Chrome, Edge u Opera (Firefox/Safari no soportan Web Bluetooth)

---

## 🎉 ¡Eso es Todo!

Ya no necesitas recompilar cada vez que cambies de red o servidor.

**Flujo normal:**

1. Presiona BOOT al encender → Modo configuración
2. Conecta Bluetooth
3. Envía `SET:...` con nueva configuración
4. ESP32 se reinicia automáticamente
5. ¡Listo!

---

📄 Para más detalles, lee: `README_CONFIGURACION_BLUETOOTH.md`
