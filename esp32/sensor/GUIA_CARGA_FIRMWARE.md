## Guía: cómo cargar el firmware (configuración + sensor) sin perder datos

Esta guía explica, en español, las formas seguras de trabajar con los dos sketches que tienes en `esp32/sensor`:

- `config_bluetooth.ino` — firmware para configurar WiFi/WebSocket vía Bluetooth y guardarlo en memoria (Preferences/NVS).
- `sensor.ino` — firmware operativo que gestiona el sensor de huellas, WebSocket y funcionamiento normal.

Resumen rápido:

- Método recomendado: Flashear `config_bluetooth.ino` una vez para guardar la configuración en NVS (Preferences). Usar la interfaz Bluetooth/Web para establecer SSID/host/puerto. Luego flashear `sensor.ino` (la configuración persiste).
- Alternativa: Unificar ambos códigos en un solo firmware (recomendado a medio plazo). Instrucciones abajo.

---

## 1) Entendiendo por qué no se "sobrescriben" los datos

`config_bluetooth.ino` utiliza la biblioteca `Preferences` (namespace `esp32-config`) para guardar keys como `wifi_ssid`, `wifi_pass`, `ws_host` y `ws_port`. Ese almacenamiento persiste en la memoria NVS del ESP32 entre reinicios y también entre flasheos.

Si configuras los valores con `config_bluetooth.ino` y luego flasheas `sensor.ino`, los datos permanecerán en NVS y podrán ser leídos por `sensor.ino` siempre que éste esté preparado para leer desde la misma clave/namespace. Si `sensor.ino` no lee NVS, tendrás que integrarlo o modificarlo para que lo haga (ver sección 3).

---

## 2) Método recomendado (rápido, sin modificar código fuente)

Objetivo: usar `config_bluetooth.ino` para escribir la configuración, luego usar `sensor.ino` como firmware operativo.

Pasos:

1. Preparar el entorno

   - Instala las librerías necesarias (Arduino IDE / PlatformIO):
     - `BluetoothSerial` (incluido en el core ESP32)
     - `Preferences` (incluido en el core ESP32)
     - `Adafruit Fingerprint Sensor Library`
     - `ArduinoJson`
     - `WebSockets` (links2004/WebSockets o similar)

2. Crear proyecto y flashear `config_bluetooth.ino`

   - En Arduino IDE: crea una carpeta nueva llamada `config_bluetooth` y coloca `config_bluetooth.ino` dentro. Abre el sketch.
   - Selecciona la placa correcta (ej. "ESP32 Dev Module"), puerto COM y velocidad de subida.
   - Compila y sube el sketch al ESP32.

3. Entrar en modo configuración

   - Sigue la guía incluida: presiona el botón BOOT antes de encender el dispositivo para que entre en modo configuración (ver `README_CONFIGURACION_BLUETOOTH.md`).
   - Conéctate por Bluetooth usando el nombre `ESP32-Huella-Config` o usa el `configurador_web_bluetooth.html` en Chrome/Edge para enviar `SET:` con los parámetros.

4. Guardar configuración

   - Envía el comando por Bluetooth: `SET:SSID|PASSWORD|HOST|PUERTO` (ejemplo: `SET:ronald|ronald2004|192.168.178.194|8000`).
   - El firmware responde `OK:Configuración guardada. Reiniciando en 3s...` y llama a `ESP.restart()`.

5. Verificar

   - Opcional: antes de flashear `sensor.ino`, conecta de nuevo con `STATUS` y confirma que las claves se han guardado.

6. Flashear `sensor.ino`
   - Ahora abre el proyecto `sensor` en Arduino IDE (coloca `sensor.ino` en su propia carpeta). Compila y sube.
   - Si `sensor.ino` está implementado para leer `Preferences` con el mismo namespace (`esp32-config`) leerá y usará la configuración guardada. Si no, ver sección 3.

Ventajas de este método:

- Rápido y sin tocar el código del firmware operativo.
- La configuración persiste entre flasheos.

Limitaciones:

- Requiere que `sensor.ino` lea desde NVS/Preferences. Si no lo hace, la configuración guardada no será utilizada automáticamente.

---

## 3) Alternativa: Unificar ambos sketches en un único firmware (recomendado a medio plazo)

Motivo: mayor robustez y evitar tener que flashear dos binarios diferentes.

Opciones de integración:

- a) Incluir `config_bluetooth.ino` como módulo dentro de `sensor.ino`:

  - Extrae las funciones relacionadas con Bluetooth/Preferences en un archivo separado `config_bluetooth.h` / `config_bluetooth.cpp` y llámalas desde `setup()` de `sensor.ino`.
  - Mantén la lógica: al detectar botón BOOT presionado, arrancar modo configuración; al salir, continuar con la lógica normal.

- b) Usar múltiples archivos `.ino` en la misma carpeta (NO recomendable tal cual): Arduino concatena `.ino` del mismo folder; si ambos tienen `setup()`/`loop()` provocará conflicto. Prefiere extraer funcionalidades a `.h/.cpp`.

Consejos para refactorizar (pasos mínimos):

1. Crear `config_bluetooth.h` con las funciones públicas: `initConfig()`, `startConfigMode()`, `handleBluetoothCommands()`, `checkConfigModeTimeout()`.
2. Crear `config_bluetooth.cpp` con la implementación y `#include <Preferences.h>` y `#include <BluetoothSerial.h>`.
3. Incluir `#include "config_bluetooth.h"` en `sensor.ino` y llamar a `initConfig()` en `setup()`; dentro del loop o en una tarea, llamar a `handleBluetoothCommands()`.

Beneficio: un único binario que puede entrar en modo configuración o trabajar normalmente según el botón.

---

## 4) Cómo hacerlo con PlatformIO

Si usas PlatformIO, crea dos entornos o dos proyectos separados:

- `platformio.ini` ejemplo mínimo (env:esp32dev):

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

Para subir `config_bluetooth`:

```bash
pio run -e esp32dev -t upload --project-dir path/to/config_bluetooth
```

Para subir `sensor`:

```bash
pio run -e esp32dev -t upload --project-dir path/to/sensor
```

---

## 5) Buenas prácticas y comprobaciones

- Antes de flashear, abre el Monitor Serial a 115200 para ver logs.
- Verifica que `config_bluetooth.ino` confirme `OK:Configuración guardada...` y que `STATUS` devuelve las claves.
- Si la configuración no parece aplicarse, abre `sensor.ino` y busca si hay código que lea `Preferences` (namespace `esp32-config`)—si no existe, integra la lectura o refactoriza como en la sección 3.
- Haz copia de seguridad de tu código antes de refactorizar.

---

## 6) Solución de problemas comunes

- El dispositivo no aparece via Bluetooth: asegúrate de entrar en modo configuración presionando BOOT antes de encender y revisa el Monitor Serial por mensajes `[BT] ✓ Bluetooth iniciado`.
- `STATUS` devuelve valores vacíos: la configuración no fue guardada o se usó otro namespace/keys. Abre `config_bluetooth.ino` y revisa las keys usadas (`wifi_ssid`, `wifi_pass`, `ws_host`, `ws_port`).
- Después de flashear `sensor.ino` la red no conecta: revisa que `sensor.ino` efectivamente utilice valores guardados; si no, copia las variables desde NVS o modifica `sensor.ino`.

---

## 7) Resumen y recomendación final

- Para empezar rápido: flashea `config_bluetooth.ino`, configura vía Bluetooth, luego flashea `sensor.ino`.
- A medio plazo, integra el módulo de configuración dentro de `sensor.ino` como `config_bluetooth.h/.cpp` para un sólo binario que soporte ambos modos.

---

## 8) Archivos y ubicación sugerida en este repo

- `esp32/sensor/config_bluetooth.ino` → firmware de configuración (ya en el repo).
- `esp32/sensor/sensor.ino` → firmware principal (ya en el repo).
- `esp32/sensor/GUIA_CARGA_FIRMWARE.md` → este archivo (creado ahora).

Si quieres, puedo:

- 1. Generar automáticamente una versión modular (`config_bluetooth.h`/`.cpp`) y actualizar `sensor.ino` para leer Preferences, o
- 2. Crear instrucciones paso a paso para Arduino IDE/PlatformIO más adaptadas a tu entorno (con capturas/console commands).

Indícame qué prefieres y lo hago.
