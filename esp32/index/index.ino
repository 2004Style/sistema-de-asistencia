/*
 * ESP32 - WebSocket Client para Sistema de Asistencia
 * Características:
 * - Conexión WiFi con reconexión automática
 * - Cliente WebSocket para comunicación bidireccional
 * - Tres modos: inactivo, asistencia, registro
 * - LEDs indicadores para cada modo
 * - Escucha en canal "sensor-huella" y responde en "sensor-response"
 */

#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>

// ==================== CONFIGURACIÓN ====================

// Pines de LEDs para modos
#define LED_INACTIVO 2
#define LED_ASISTENCIA 4
#define LED_REGISTRO 5

// Modos
enum Modo {
    INACTIVO,
    ASISTENCIA,
    REGISTRO
};

// WiFi
const char *WIFI_SSID = "ronald";
const char *WIFI_PASSWORD = "ronald2004";

// Servidor WebSocket
const char *WS_HOST = "192.168.169.194"; // IP o dominio del servidor
const uint16_t WS_PORT = 3000;           // Puerto del WebSocket
const char *WS_PATH = "/";               // Ruta del WebSocket

// Configuración de tareas
#define STACK_SIZE_WS 8192
#define STACK_SIZE_MONITOR 4096

// ==================== OBJETOS GLOBALES ====================
WebSocketsClient webSocket;

// Handles de tareas
TaskHandle_t taskWebSocketHandle = NULL;
TaskHandle_t taskMonitorHandle = NULL;

// Variables de estado
bool wifiConnected = false;
bool wsConnected = false;
Modo currentModo = INACTIVO;
unsigned long lastReconnectAttempt = 0;
const unsigned long reconnectInterval = 5000; // 5 segundos

// ==================== FUNCIONES DE CONEXIÓN ====================

void setupWiFi()
{
    Serial.println("\n[WiFi] Conectando a WiFi...");
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20)
    {
        delay(500);
        Serial.print(".");
        attempts++;
    }

    if (WiFi.status() == WL_CONNECTED)
    {
        wifiConnected = true;
        Serial.println("\n[WiFi] ✓ Conectado");
        Serial.print("[WiFi] IP: ");
        Serial.println(WiFi.localIP());
    }
    else
    {
        Serial.println("\n[WiFi] ✗ Error de conexión");
    }
}

void reconnectWiFi()
{
    if (WiFi.status() != WL_CONNECTED)
    {
        wifiConnected = false;
        wsConnected = false;
        Serial.println("[WiFi] Reconectando...");
        WiFi.disconnect();
        WiFi.reconnect();
        delay(5000);
    }
}

// ==================== FUNCIONES DE MODOS ====================

void setModo(Modo modo)
{
    currentModo = modo;
    // Apagar todos los LEDs
    digitalWrite(LED_INACTIVO, LOW);
    digitalWrite(LED_ASISTENCIA, LOW);
    digitalWrite(LED_REGISTRO, LOW);

    // Encender el LED correspondiente
    switch (modo)
    {
    case INACTIVO:
        digitalWrite(LED_INACTIVO, HIGH);
        Serial.println("[Modo] Cambiado a INACTIVO");
        break;
    case ASISTENCIA:
        digitalWrite(LED_ASISTENCIA, HIGH);
        Serial.println("[Modo] Cambiado a ASISTENCIA");
        break;
    case REGISTRO:
        digitalWrite(LED_REGISTRO, HIGH);
        Serial.println("[Modo] Cambiado a REGISTRO");
        break;
    }
}

// ==================== CALLBACKS WEBSOCKET ====================

void webSocketEvent(WStype_t type, uint8_t *payload, size_t length)
{
    switch (type)
    {
    case WStype_DISCONNECTED:
        Serial.println("[WS] ✗ Desconectado");
        wsConnected = false;
        break;

    case WStype_CONNECTED:
        Serial.println("[WS] ✓ Conectado al servidor");
        wsConnected = true;
        // Enviar mensaje de conexión inicial
        webSocket.sendTXT("{\"event\":\"client_connected\",\"data\":\"ESP32\"}");
        break;

    case WStype_TEXT:
        Serial.printf("[WS] ← Mensaje recibido: %s\n", payload);
        // Parsear y procesar el mensaje
        processWebSocketMessage((char *)payload);
        break;

    case WStype_BIN:
        Serial.printf("[WS] ← Datos binarios recibidos: %u bytes\n", length);
        break;

    case WStype_ERROR:
        Serial.println("[WS] ✗ Error");
        break;

    case WStype_PING:
        Serial.println("[WS] ← Ping");
        break;

    case WStype_PONG:
        Serial.println("[WS] ← Pong");
        break;
    }
}

void processWebSocketMessage(char *payload)
{
    // Crear documento JSON
    StaticJsonDocument<1024> doc;
    DeserializationError error = deserializeJson(doc, payload);

    if (error)
    {
        Serial.print("[WS] Error parseando JSON: ");
        Serial.println(error.c_str());
        return;
    }

    // Extraer evento
    const char *event = doc["event"] | "unknown";
    Serial.printf("[WS] Evento: %s\n", event);

    // Manejar evento sensor-huella
    if (strcmp(event, "sensor-huella") == 0)
    {
        // Extraer datos
        int user_id = doc["data"]["user_id"];
        const char *tipo = doc["data"]["tipo"];
        const char *huella = doc["data"]["huella"];

        Serial.printf("[WS] Procesando huella - ID: %d, Tipo: %s\n", user_id, tipo);

        // Cambiar modo según tipo
        if (strcmp(tipo, "asistencia") == 0)
        {
            setModo(ASISTENCIA);
        }
        else if (strcmp(tipo, "registro") == 0)
        {
            setModo(REGISTRO);
        }
        else
        {
            Serial.println("[WS] Tipo desconocido, ignorando");
            return;
        }

        // Simular procesamiento (aquí iría la lógica real del sensor de huella)
        delay(2000); // Simular tiempo de procesamiento

        // Preparar respuesta
        StaticJsonDocument<512> responseDoc;
        responseDoc["event"] = "sensor-response";
        responseDoc["data"]["user_id"] = user_id;
        responseDoc["data"]["tipo"] = tipo;
        responseDoc["data"]["status"] = "processed"; // O el resultado real
        responseDoc["data"]["timestamp"] = millis();

        String output;
        serializeJson(responseDoc, output);
        webSocket.sendTXT(output);
        Serial.printf("[WS] → Respuesta enviada: %s\n", output.c_str());

        // Volver a modo inactivo
        setModo(INACTIVO);
    }
    else
    {
        Serial.printf("[WS] Evento no manejado: %s\n", event);
    }
}

// ==================== TAREAS FREERTOS ====================

// Tarea 1: Gestión de WebSocket (Core 1)
void taskWebSocket(void *parameter)
{
    Serial.println("[Task] WebSocket iniciado en Core 1");

    // Configurar WebSocket
    webSocket.begin(WS_HOST, WS_PORT, WS_PATH);
    webSocket.onEvent(webSocketEvent);
    webSocket.setReconnectInterval(5000);
    webSocket.enableHeartbeat(15000, 3000, 2); // ping cada 15s, timeout 3s, 2 reintentos

    while (true)
    {
        if (wifiConnected)
        {
            webSocket.loop();

            // Enviar heartbeat cada 30 segundos si está conectado
            static unsigned long lastHeartbeat = 0;
            if (wsConnected && millis() - lastHeartbeat > 30000)
            {
                StaticJsonDocument<128> doc;
                doc["event"] = "heartbeat";
                doc["data"]["uptime"] = millis() / 1000;

                String output;
                serializeJson(doc, output);
                webSocket.sendTXT(output);

                lastHeartbeat = millis();
            }
        }

        vTaskDelay(10 / portTICK_PERIOD_MS); // Delay de 10ms
    }
}

// Tarea 2: Monitor del sistema (Core 1)
void taskMonitor(void *parameter)
{
    Serial.println("[Task] Monitor iniciado en Core 1");

    while (true)
    {
        // Verificar estado de WiFi
        if (WiFi.status() != WL_CONNECTED && wifiConnected)
        {
            Serial.println("[Monitor] WiFi desconectado, intentando reconectar...");
            reconnectWiFi();
        }

        // Mostrar estadísticas cada 30 segundos
        static unsigned long lastStats = 0;
        if (millis() - lastStats > 30000)
        {
            Serial.println("\n========== ESTADO DEL SISTEMA ==========");
            Serial.printf("WiFi: %s\n", wifiConnected ? "✓ Conectado" : "✗ Desconectado");
            Serial.printf("WebSocket: %s\n", wsConnected ? "✓ Conectado" : "✗ Desconectado");
            Serial.printf("Modo actual: %s\n", currentModo == INACTIVO ? "INACTIVO" : currentModo == ASISTENCIA ? "ASISTENCIA" : "REGISTRO");
            Serial.printf("Heap libre: %d bytes\n", ESP.getFreeHeap());
            Serial.printf("Uptime: %lu segundos\n", millis() / 1000);
            Serial.println("========================================\n");
            lastStats = millis();
        }

        vTaskDelay(5000 / portTICK_PERIOD_MS); // Delay de 5 segundos
    }
}

// ==================== SETUP Y LOOP ====================

void setup()
{
    Serial.begin(115200);
    delay(1000);

    Serial.println("\n\n================================");
    Serial.println("ESP32 - Sistema de Asistencia");
    Serial.println("================================\n");

    // Configurar LEDs
    pinMode(LED_INACTIVO, OUTPUT);
    pinMode(LED_ASISTENCIA, OUTPUT);
    pinMode(LED_REGISTRO, OUTPUT);

    // Iniciar en modo inactivo
    setModo(INACTIVO);

    // Conectar a WiFi
    setupWiFi();

    if (!wifiConnected)
    {
        Serial.println("Error: No se pudo conectar a WiFi. Reiniciando...");
        delay(5000);
        ESP.restart();
    }

    // Crear tareas en diferentes núcleos
    xTaskCreatePinnedToCore(
        taskWebSocket,        // Función de la tarea
        "WebSocket",          // Nombre
        STACK_SIZE_WS,        // Stack size
        NULL,                 // Parámetros
        2,                    // Prioridad (2 = alta)
        &taskWebSocketHandle, // Handle
        1                     // Core 1
    );

    xTaskCreatePinnedToCore(
        taskMonitor,
        "Monitor",
        STACK_SIZE_MONITOR,
        NULL,
        1, // Prioridad (1 = media)
        &taskMonitorHandle,
        1 // Core 1
    );

    Serial.println("\n[Setup] ✓ Tareas creadas correctamente");
    Serial.println("[Setup] Sistema iniciado\n");
}

void loop()
{
    // El loop principal puede estar vacío
    // Las tareas FreeRTOS se ejecutan en paralelo
    delay(100); // Pequeño delay para no saturar
}
