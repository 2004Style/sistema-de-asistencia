// ============================================================================
// MÓDULO DE CONFIGURACIÓN BLUETOOTH
// Permite configurar WiFi y WebSocket via Bluetooth Serial
// ============================================================================

#include "BluetoothSerial.h"
#include <Preferences.h>

BluetoothSerial SerialBT;
Preferences preferences;

// Variables de configuración (se cargan desde EEPROM al inicio)
struct Config {
    char wifi_ssid[64];
    char wifi_password[64];
    char ws_host[64];
    uint16_t ws_port;
    bool configured;
};

Config config;

// Estado del modo configuración
volatile bool configMode = false;
unsigned long configModeTimeout = 0;
const unsigned long CONFIG_MODE_DURATION = 300000; // 5 minutos

// ============================================================================
// FUNCIONES DE CONFIGURACIÓN
// ============================================================================

void initConfig() {
    preferences.begin("esp32-config", false);
    
    // Cargar configuración desde EEPROM
    config.configured = preferences.getBool("configured", false);
    
    if (config.configured) {
        preferences.getString("wifi_ssid", config.wifi_ssid, sizeof(config.wifi_ssid));
        preferences.getString("wifi_pass", config.wifi_password, sizeof(config.wifi_password));
        preferences.getString("ws_host", config.ws_host, sizeof(config.ws_host));
        config.ws_port = preferences.getUInt("ws_port", 8000);
        
        Serial.println("[CONFIG] ✓ Configuración cargada desde memoria:");
        Serial.printf("  WiFi SSID: %s\n", config.wifi_ssid);
        Serial.printf("  WS Host: %s:%d\n", config.ws_host, config.ws_port);
    } else {
        // Usar valores por defecto del código
        strncpy(config.wifi_ssid, WIFI_SSID, sizeof(config.wifi_ssid));
        strncpy(config.wifi_password, WIFI_PASSWORD, sizeof(config.wifi_password));
        strncpy(config.ws_host, WS_HOST, sizeof(config.ws_host));
        config.ws_port = WS_PORT;
        
        Serial.println("[CONFIG] ⚠️ Primera ejecución - usando valores por defecto");
    }
}

void saveConfig() {
    preferences.putBool("configured", true);
    preferences.putString("wifi_ssid", config.wifi_ssid);
    preferences.putString("wifi_pass", config.wifi_password);
    preferences.putString("ws_host", config.ws_host);
    preferences.putUInt("ws_port", config.ws_port);
    
    config.configured = true;
    
    Serial.println("[CONFIG] ✓ Configuración guardada en memoria");
}

void resetConfig() {
    preferences.clear();
    config.configured = false;
    Serial.println("[CONFIG] ⚠️ Configuración borrada - reinicie el dispositivo");
}

// ============================================================================
// MODO CONFIGURACIÓN BLUETOOTH
// ============================================================================

void startConfigMode() {
    if (configMode) return;
    
    configMode = true;
    configModeTimeout = millis() + CONFIG_MODE_DURATION;
    
    Serial.println("\n╔════════════════════════════════════════════════╗");
    Serial.println("║   MODO CONFIGURACIÓN BLUETOOTH ACTIVADO       ║");
    Serial.println("║   Conecte via Bluetooth Serial                ║");
    Serial.println("║   Nombre: ESP32-Huella-Config                 ║");
    Serial.println("╚════════════════════════════════════════════════╝\n");
    
    if (!SerialBT.begin("ESP32-Huella-Config")) {
        Serial.println("[BT] ✗ Error iniciando Bluetooth");
        configMode = false;
        return;
    }
    
    Serial.println("[BT] ✓ Bluetooth iniciado - esperando conexión...");
    
    // Enviar interfaz HTML al conectar
    sendHTMLInterface();
}

void stopConfigMode() {
    if (!configMode) return;
    
    configMode = false;
    SerialBT.end();
    Serial.println("[BT] Modo configuración finalizado");
}

void sendHTMLInterface() {
    // Enviar mini interfaz HTML via Bluetooth Serial
    SerialBT.println("HTTP/1.1 200 OK");
    SerialBT.println("Content-Type: text/html; charset=utf-8");
    SerialBT.println("Connection: close");
    SerialBT.println();
    
    SerialBT.println("<!DOCTYPE html>");
    SerialBT.println("<html lang='es'>");
    SerialBT.println("<head>");
    SerialBT.println("<meta charset='UTF-8'>");
    SerialBT.println("<meta name='viewport' content='width=device-width, initial-scale=1.0'>");
    SerialBT.println("<title>Configuración ESP32</title>");
    SerialBT.println("<style>");
    SerialBT.println("body{font-family:Arial;max-width:500px;margin:20px auto;padding:20px;background:#f0f0f0}");
    SerialBT.println(".card{background:white;padding:20px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);margin-bottom:20px}");
    SerialBT.println("h1{color:#333;margin-top:0}");
    SerialBT.println("label{display:block;margin:10px 0 5px;color:#555;font-weight:bold}");
    SerialBT.println("input{width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;box-sizing:border-box}");
    SerialBT.println("button{background:#4CAF50;color:white;padding:10px 20px;border:none;border-radius:4px;cursor:pointer;width:100%;margin-top:10px}");
    SerialBT.println("button:hover{background:#45a049}");
    SerialBT.println(".info{background:#e3f2fd;padding:10px;border-radius:4px;margin:10px 0;font-size:14px}");
    SerialBT.println(".danger{background:#ffebee;color:#c62828}");
    SerialBT.println("</style>");
    SerialBT.println("</head>");
    SerialBT.println("<body>");
    
    SerialBT.println("<div class='card'>");
    SerialBT.println("<h1>⚙️ Configuración ESP32</h1>");
    SerialBT.println("<div class='info'>Configuración actual guardada en memoria</div>");
    SerialBT.println("</div>");
    
    SerialBT.println("<div class='card'>");
    SerialBT.println("<h2>📡 WiFi</h2>");
    SerialBT.printf("<label>SSID:</label><input id='ssid' value='%s'><br>", config.wifi_ssid);
    SerialBT.printf("<label>Password:</label><input id='pass' type='password' value='%s'><br>", config.wifi_password);
    SerialBT.println("</div>");
    
    SerialBT.println("<div class='card'>");
    SerialBT.println("<h2>🔌 WebSocket</h2>");
    SerialBT.printf("<label>Host/IP:</label><input id='host' value='%s'><br>", config.ws_host);
    SerialBT.printf("<label>Puerto:</label><input id='port' type='number' value='%d'><br>", config.ws_port);
    SerialBT.println("</div>");
    
    SerialBT.println("<div class='card'>");
    SerialBT.println("<button onclick='save()'>💾 Guardar y Reiniciar</button>");
    SerialBT.println("<button onclick='reset()' style='background:#f44336;margin-top:10px'>🗑️ Borrar Configuración</button>");
    SerialBT.println("<div class='info danger' style='margin-top:10px'>⚠️ Envíe comandos por Serial Bluetooth</div>");
    SerialBT.println("</div>");
    
    SerialBT.println("<script>");
    SerialBT.println("function save(){");
    SerialBT.println("  var cmd='SET:'+document.getElementById('ssid').value+'|'");
    SerialBT.println("    +document.getElementById('pass').value+'|'");
    SerialBT.println("    +document.getElementById('host').value+'|'");
    SerialBT.println("    +document.getElementById('port').value;");
    SerialBT.println("  alert('Comando:\\n'+cmd+'\\n\\nEnvíelo via Bluetooth Serial');");
    SerialBT.println("}");
    SerialBT.println("function reset(){");
    SerialBT.println("  if(confirm('¿Borrar toda la configuración?')){");
    SerialBT.println("    alert('Envíe: RESET\\n\\nvia Bluetooth Serial');");
    SerialBT.println("  }");
    SerialBT.println("}");
    SerialBT.println("</script>");
    
    SerialBT.println("</body></html>");
    
    Serial.println("[BT] ✓ Interfaz HTML enviada");
}

void handleBluetoothCommands() {
    if (!configMode || !SerialBT.available()) return;
    
    String command = SerialBT.readStringUntil('\n');
    command.trim();
    
    Serial.printf("[BT] Comando recibido: %s\n", command.c_str());
    
    // Comando: SET:ssid|password|host|port
    if (command.startsWith("SET:")) {
        String data = command.substring(4);
        int idx1 = data.indexOf('|');
        int idx2 = data.indexOf('|', idx1 + 1);
        int idx3 = data.indexOf('|', idx2 + 1);
        
        if (idx1 > 0 && idx2 > 0 && idx3 > 0) {
            String ssid = data.substring(0, idx1);
            String pass = data.substring(idx1 + 1, idx2);
            String host = data.substring(idx2 + 1, idx3);
            String port = data.substring(idx3 + 1);
            
            // Validar y guardar
            if (ssid.length() > 0 && host.length() > 0) {
                strncpy(config.wifi_ssid, ssid.c_str(), sizeof(config.wifi_ssid));
                strncpy(config.wifi_password, pass.c_str(), sizeof(config.wifi_password));
                strncpy(config.ws_host, host.c_str(), sizeof(config.ws_host));
                config.ws_port = port.toInt();
                
                saveConfig();
                
                SerialBT.println("OK:Configuración guardada. Reiniciando en 3s...");
                Serial.println("[BT] ✓ Nueva configuración guardada:");
                Serial.printf("  WiFi: %s\n", config.wifi_ssid);
                Serial.printf("  WebSocket: %s:%d\n", config.ws_host, config.ws_port);
                
                delay(3000);
                ESP.restart();
            } else {
                SerialBT.println("ERROR:Datos inválidos");
                Serial.println("[BT] ✗ Datos inválidos recibidos");
            }
        } else {
            SerialBT.println("ERROR:Formato incorrecto. Use: SET:ssid|pass|host|port");
        }
    }
    // Comando: RESET (borrar configuración)
    else if (command == "RESET") {
        resetConfig();
        SerialBT.println("OK:Configuración borrada. Reiniciando en 3s...");
        delay(3000);
        ESP.restart();
    }
    // Comando: STATUS (ver configuración actual)
    else if (command == "STATUS") {
        SerialBT.printf("WiFi SSID: %s\n", config.wifi_ssid);
        SerialBT.printf("WS Host: %s\n", config.ws_host);
        SerialBT.printf("WS Port: %d\n", config.ws_port);
        SerialBT.printf("Configured: %s\n", config.configured ? "YES" : "NO");
    }
    // Comando: HTML (reenviar interfaz)
    else if (command == "HTML") {
        sendHTMLInterface();
    }
    // Comando desconocido
    else {
        SerialBT.println("COMANDOS DISPONIBLES:");
        SerialBT.println("  SET:ssid|pass|host|port - Guardar configuración");
        SerialBT.println("  STATUS - Ver configuración actual");
        SerialBT.println("  RESET - Borrar configuración");
        SerialBT.println("  HTML - Mostrar interfaz web");
    }
    
    // Resetear timeout
    configModeTimeout = millis() + CONFIG_MODE_DURATION;
}

void checkConfigModeTimeout() {
    if (configMode && millis() > configModeTimeout) {
        Serial.println("[BT] ⏱️ Timeout - saliendo del modo configuración");
        stopConfigMode();
    }
}
