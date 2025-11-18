#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <Adafruit_Fingerprint.h>
#include "mbedtls/gcm.h"
#include "mbedtls/base64.h"
#include <queue>

// ============================================================================
// CONFIGURACIÓN
// ============================================================================
const char *WIFI_SSID = "ronald";
const char *WIFI_PASSWORD = "ronald2004";
const char *WS_HOST = "192.168.67.194";
const uint16_t WS_PORT = 8000;

#define FINGER_RX_PIN 16
#define FINGER_TX_PIN 17
#define FINGER_BAUD 57600

#define LED_REGISTRO_PIN 2
#define LED_ASISTENCIA_PIN 4
// Pin opcional para RESET del módulo de huella (conectar al pin RST del sensor si está disponible)
#define FINGER_RESET_PIN 15

#define MAX_TEMPLATE_SIZE 2048
#define GCM_TAG_LEN 16
#define GCM_IV_LEN 12

const uint8_t DEVICE_KEY[32] = {
    0x00,0x01,0x02,0x03,0x04,0x05,0x06,0x07,0x08,0x09,0x0A,0x0B,0x0C,0x0D,0x0E,0x0F,
    0x10,0x11,0x12,0x13,0x14,0x15,0x16,0x17,0x18,0x19,0x1A,0x1B,0x1C,0x1D,0x1E,0x1F
};

// ============================================================================
// OBJETOS GLOBALES
// ============================================================================
HardwareSerial FingerSerial(2);
Adafruit_Fingerprint finger = Adafruit_Fingerprint(&FingerSerial);
WebSocketsClient webSocket;

// === ESTADO WEBSOCKET (VOLATILE PARA ACCESO INTER-CORE) ===
volatile bool wsConnected = false;
volatile bool wsReconnecting = false;
volatile unsigned long lastPingTime = 0;
volatile unsigned long lastMessageTime = 0;
unsigned long lastConnectionAttempt = 0;

// === EXPONENTIAL BACKOFF ===
uint8_t reconnectAttempt = 0;
const uint8_t MAX_RECONNECT_ATTEMPTS = 6;
const unsigned long RECONNECT_INTERVALS[] = {1000, 2000, 4000, 8000, 16000, 30000};

// === KEEP-ALIVE AGRESIVO (SOCKET.IO STYLE) ===
const unsigned long PING_INTERVAL = 10000;    // Ping cada 10s
const unsigned long PONG_TIMEOUT = 15000;     // Timeout en 15s
const unsigned long INACTIVITY_TIMEOUT = 20000; // Reconectar si no hay actividad en 20s

// === BUFFER DE MENSAJES ===
struct Message {
    String json;
    unsigned long timestamp;
};
std::queue<Message> messageBuffer;
const size_t MAX_BUFFER_SIZE = 10;

// === DATOS DE HUELLA ===
uint8_t templateBuf[MAX_TEMPLATE_SIZE];
uint8_t cipherBuf[MAX_TEMPLATE_SIZE + GCM_TAG_LEN];
char b64Buf[2732];

// === ESTADOS DE LED ===
volatile bool ledRegistroActivo = false;
volatile bool ledAsistenciaActivo = false;

// === CONTROL DE CAPTURA (CANCELACIÓN EN TIEMPO REAL) ===
volatile bool capturaEnProgreso = false;  // ¿Está capturando?
volatile bool cancelarCaptura = false;     // ¿Cancelar ahora?
char clientSidActual[64] = "";             // SID del cliente actual (buffer simple, NO volatile)
const unsigned long CANCEL_CHECK_INTERVAL = 20; // ✅ Verificar cancelación cada 20ms (MÁS AGRESIVO)

// === TASK HANDLES PARA DUAL-CORE ===
TaskHandle_t webSocketTaskHandle = NULL;
TaskHandle_t sensorTaskHandle = NULL;
// Worker task handle (persistente)
TaskHandle_t sensorWorkerHandle = NULL;

// Job struct para pasar datos al worker (tamaño fijo para evitar problemas de heap dinámico excesivo)
typedef struct {
    char tipo[16];
    int user_id;
    char codigo[64];
    char huella[2800];
    char client_sid[64];
    char message_id[64];
    char operation_id[128];  // 🔑 ID único de operación del cliente
} SensorJob;

// Cola de jobs para el worker (capacidad 1: solo un job a la vez)
QueueHandle_t jobQueue = NULL;

// Prototipo del worker
void sensorWorker(void* pvParameters);

// ============================================================================
// FUNCIONES DE LED
// ============================================================================
void apagarTodosLEDs() {
    digitalWrite(LED_REGISTRO_PIN, LOW);
    digitalWrite(LED_ASISTENCIA_PIN, LOW);
    ledRegistroActivo = false;
    ledAsistenciaActivo = false;
}

void encenderLEDRegistro() {
    digitalWrite(LED_REGISTRO_PIN, HIGH);
    digitalWrite(LED_ASISTENCIA_PIN, LOW);
    ledRegistroActivo = true;
    ledAsistenciaActivo = false;
    Serial.println("[LED] 🔵 REGISTRO activado");
}

void encenderLEDAsistencia() {
    digitalWrite(LED_REGISTRO_PIN, LOW);
    digitalWrite(LED_ASISTENCIA_PIN, HIGH);
    ledRegistroActivo = false;
    ledAsistenciaActivo = true;
    Serial.println("[LED] 🟢 ASISTENCIA activado");
}

// ============================================================================
// BUFFER DE MENSAJES (PERSISTEN A DESCONEXIONES)
// ============================================================================
void bufferMessage(const String& msg) {
    if (messageBuffer.size() < MAX_BUFFER_SIZE) {
        Message m;
        m.json = msg;
        m.timestamp = millis();
        messageBuffer.push(m);
        Serial.printf("[BUFFER] ✓ Mensaje encolado (queue: %d/%d)\n", messageBuffer.size(), MAX_BUFFER_SIZE);
    } else {
        Serial.println("[BUFFER] ⚠️ Queue llena, mensaje descartado");
    }
}

void flushMessageBuffer() {
    if (messageBuffer.empty()) return;
    
    Serial.printf("[BUFFER] Reenviando %d mensajes encolados...\n", messageBuffer.size());
    
    while (!messageBuffer.empty()) {
        Message m = messageBuffer.front();
        messageBuffer.pop();
        
        unsigned long bufferAge = millis() - m.timestamp;
        
        // Descartar mensajes con más de 60s de antigüedad
        if (bufferAge > 60000) {
            Serial.printf("[BUFFER] ✗ Mensaje expirado (edad: %lums), descartado\n", bufferAge);
            continue;
        }
        
        if (wsConnected) {
            webSocket.sendTXT(m.json);
            Serial.printf("[BUFFER] ✓ Reenviado (edad: %lums, queue: %d)\n", bufferAge, messageBuffer.size());
            delay(100);  // Pequeña pausa entre reenvíos
        } else {
            // Volver a encolar si se desconectó
            messageBuffer.push(m);
            Serial.println("[BUFFER] WebSocket desconectado, reteniendo mensaje");
            break;
        }
    }
}

// ============================================================================
// CONTROL DE CANCELACIÓN (INTERRUMPIR CAPTURAS EN PROGRESO)
// ============================================================================
void iniciarCaptura(const char* client_sid) {
    capturaEnProgreso = true;
    cancelarCaptura = false;
    strncpy(clientSidActual, client_sid ? client_sid : "", sizeof(clientSidActual) - 1);
    clientSidActual[sizeof(clientSidActual) - 1] = '\0';
    Serial.printf("[CANCEL] Captura iniciada para cliente: %s\n", client_sid);
}

void detenerCaptura() {
    capturaEnProgreso = false;
    cancelarCaptura = false;
    clientSidActual[0] = '\0';
    Serial.println("[CANCEL] Captura detenida - estado limpiado");
}

void solicitarCancelacion(const String& motivo) {
    if (capturaEnProgreso) {
        cancelarCaptura = true;
        Serial.printf("[CANCEL] ⚠️ CANCELACIÓN SOLICITADA: %s\n", motivo.c_str());
        // Intentar resetear el módulo de huella para abortar llamadas bloqueantes
        // (requiere cablear el pin RST del sensor al FINGER_RESET_PIN)
        Serial.println("[CANCEL] Pulsando RESET del módulo de huella para abortar operaciones bloqueantes...");
        digitalWrite(FINGER_RESET_PIN, LOW);
        delay(50);
        digitalWrite(FINGER_RESET_PIN, HIGH);
        delay(200);
        // Re-inicializar la comunicación con el sensor
        if (initFingerprint()) {
            Serial.println("[CANCEL] ✓ Módulo de huella reiniciado");
        } else {
            Serial.println("[CANCEL] ⚠️ Falló reinicio del módulo de huella");
        }
    }
}

// Verificar cada 100ms si fue solicitada cancelación
bool verificarCancelacion() {
    if (cancelarCaptura && capturaEnProgreso) {
        Serial.println("[CANCEL] ✗ CAPTURA CANCELADA POR USUARIO");
        return true;
    }
    return false;
}

// ============================================================================
// CRIPTOGRAFÍA
// ============================================================================
static void generate_random_iv(uint8_t *iv, size_t len) {
    for (size_t i = 0; i < len; i++) {
        iv[i] = random(256);
    }
}

static bool aes_gcm_encrypt(const uint8_t *key, const uint8_t *iv, 
                            const uint8_t *plaintext, size_t plaintext_len,
                            uint8_t *ciphertext, uint8_t *tag) {
    mbedtls_gcm_context gcm;
    mbedtls_gcm_init(&gcm);
    
    if (mbedtls_gcm_setkey(&gcm, MBEDTLS_CIPHER_ID_AES, key, 256) != 0) {
        mbedtls_gcm_free(&gcm);
        return false;
    }
    
    int rc = mbedtls_gcm_crypt_and_tag(&gcm, MBEDTLS_GCM_ENCRYPT, plaintext_len, 
                                       iv, GCM_IV_LEN, NULL, 0, plaintext, 
                                       ciphertext, GCM_TAG_LEN, tag);
    mbedtls_gcm_free(&gcm);
    return rc == 0;
}

static bool base64_encode(const uint8_t *in, size_t in_len, char *out, size_t out_cap) {
    size_t olen = 0;
    if (mbedtls_base64_encode(NULL, 0, &olen, in, in_len) != MBEDTLS_ERR_BASE64_BUFFER_TOO_SMALL)
        return false;
    if (olen + 1 > out_cap)
        return false;
    if (mbedtls_base64_encode((unsigned char*)out, out_cap - 1, &olen, in, in_len) != 0)
        return false;
    out[olen] = '\0';
    return true;
}

// ============================================================================
// SENSOR
// ============================================================================
bool initFingerprint() {
    Serial.println("[FINGER] Iniciando sensor...");
    FingerSerial.begin(FINGER_BAUD, SERIAL_8N1, FINGER_RX_PIN, FINGER_TX_PIN);
    delay(200);
    finger.begin(FINGER_BAUD);
    
    if (finger.verifyPassword()) {
        Serial.println("[FINGER] ✓ Sensor OK");
        return true;
    }
    
    Serial.println("[FINGER] ✗ Error: No se encontró sensor");
    return false;
}

int findAvailableSlot() {
    for (int i = 1; i <= 127; i++) {
        uint8_t r = finger.loadModel(i);
        if (r != FINGERPRINT_OK) {
            Serial.printf("[FINGER] Slot disponible: %d\n", i);
            return i;
        }
    }
    Serial.println("[FINGER] ✗ No hay slots disponibles");
    return -1;
}

uint8_t waitForImage() {
    uint8_t p;
    int attempts = 0;
    unsigned long lastCheck = millis();
    
    while ((p = finger.getImage()) == FINGERPRINT_NOFINGER && attempts < 100) {
        // ✅ VERIFICAR CANCELACIÓN EN INTERVALOS CORTOS
        if ((millis() - lastCheck) > CANCEL_CHECK_INTERVAL) {
            if (verificarCancelacion()) {
                Serial.println("[FINGER] ✗ CANCELACIÓN: Interrumpiendo espera de imagen");
                return FINGERPRINT_NOFINGER;
            }
            lastCheck = millis();
        }
        // ✅ Delays cortos para mayor responsividad
        delay(CANCEL_CHECK_INTERVAL);  // Usa el mismo intervalo en lugar de 100ms
        attempts++;
    }
    return p;
}

void waitNoFinger() {
    int attempts = 0;
    unsigned long lastCheck = millis();
    
    while (finger.getImage() != FINGERPRINT_NOFINGER && attempts < 50) {
        // ✅ VERIFICAR CANCELACIÓN EN INTERVALOS CORTOS
        if ((millis() - lastCheck) > CANCEL_CHECK_INTERVAL) {
            if (verificarCancelacion()) {
                Serial.println("[FINGER] ✗ CANCELACIÓN: Interrumpiendo espera de retirada");
                return;
            }
            lastCheck = millis();
        }
        delay(CANCEL_CHECK_INTERVAL);  // Usa el mismo intervalo
        attempts++;
    }
}

bool captureAndStore(int &slot, String &huellaB64, String client_sid = "") {
    iniciarCaptura(client_sid.c_str());  // ✅ Convertir String a const char*
    
    slot = findAvailableSlot();
    if (slot == -1) {
        Serial.println("[FINGER] ✗ Error: Sin slots disponibles");
        detenerCaptura();
        return false;
    }
    
    Serial.printf("[FINGER] Capturando para slot %d...\n", slot);
    
    // ========== CAPTURA 1 ==========
    Serial.println("[FINGER] Captura 1 - Coloque el dedo...");
    if (verificarCancelacion()) {
        Serial.println("[FINGER] ✗ CANCELACIÓN: Abortando registro en paso 1");
        detenerCaptura();
        return false;
    }
    
    if (wsConnected && !client_sid.isEmpty()) {
        DynamicJsonDocument prog(256);
        prog["tipo"] = "registro";
        prog["status"] = "progress";
        prog["step"] = 1;
        prog["message"] = "Coloque el dedo en el sensor";
        prog["client_sid"] = client_sid;
        char buf[256];
        serializeJson(prog, buf);
        String frame = "42[\"sensor-progress\"," + String(buf) + "]";
        webSocket.sendTXT(frame);
    }
    
    uint8_t p = waitForImage();
    if (p != FINGERPRINT_OK || verificarCancelacion()) {
        if (verificarCancelacion()) {
            Serial.println("[FINGER] ✗ CANCELACIÓN: Usuario canceló en paso 1");
        } else {
            Serial.println("[FINGER] ✗ Error esperando primer dedo");
        }
        detenerCaptura();
        return false;
    }
    
    p = finger.image2Tz(1);
    if (p != FINGERPRINT_OK) {
        Serial.println("[FINGER] ✗ Error procesando captura 1");
        detenerCaptura();
        return false;
    }
    Serial.println("[FINGER] ✓ Captura 1 OK");
    
    // ========== ESPERAR RETIRADA ==========
    Serial.println("[FINGER] Retire el dedo...");
    if (verificarCancelacion()) {
        Serial.println("[FINGER] ✗ CANCELACIÓN: Abortando en paso 2");
        detenerCaptura();
        return false;
    }
    
    if (wsConnected && !client_sid.isEmpty()) {
        DynamicJsonDocument prog(256);
        prog["tipo"] = "registro";
        prog["status"] = "progress";
        prog["step"] = 2;
        prog["message"] = "Retire el dedo del sensor";
        prog["client_sid"] = client_sid;
        char buf[256];
        serializeJson(prog, buf);
        String frame = "42[\"sensor-progress\"," + String(buf) + "]";
        webSocket.sendTXT(frame);
    }
    waitNoFinger();
    
    if (verificarCancelacion()) {
        Serial.println("[FINGER] ✗ CANCELACIÓN: Usuario canceló en paso 2");
        detenerCaptura();
        return false;
    }
    
    // ========== CAPTURA 2 ==========
    Serial.println("[FINGER] Captura 2 - Coloque el dedo nuevamente...");
    if (verificarCancelacion()) {
        Serial.println("[FINGER] ✗ CANCELACIÓN: Abortando en paso 3");
        detenerCaptura();
        return false;
    }
    
    if (wsConnected && !client_sid.isEmpty()) {
        DynamicJsonDocument prog(256);
        prog["tipo"] = "registro";
        prog["status"] = "progress";
        prog["step"] = 3;
        prog["message"] = "Coloque el dedo nuevamente";
        prog["client_sid"] = client_sid;
        char buf[256];
        serializeJson(prog, buf);
        String frame = "42[\"sensor-progress\"," + String(buf) + "]";
        webSocket.sendTXT(frame);
    }
    
    p = waitForImage();
    if (p != FINGERPRINT_OK || verificarCancelacion()) {
        if (verificarCancelacion()) {
            Serial.println("[FINGER] ✗ CANCELACIÓN: Usuario canceló en paso 3");
        } else {
            Serial.println("[FINGER] ✗ Error esperando segundo dedo");
        }
        detenerCaptura();
        return false;
    }
    
    p = finger.image2Tz(2);
    if (p != FINGERPRINT_OK) {
        Serial.println("[FINGER] ✗ Error procesando captura 2");
        detenerCaptura();
        return false;
    }
    Serial.println("[FINGER] ✓ Captura 2 OK");
    
    if (verificarCancelacion()) {
        Serial.println("[FINGER] ✗ CANCELACIÓN: Abortando en paso 4");
        detenerCaptura();
        return false;
    }
    
    p = finger.createModel();
    if (p != FINGERPRINT_OK) {
        Serial.println("[FINGER] ✗ Error creando modelo");
        detenerCaptura();
        return false;
    }
    
    p = finger.storeModel(slot);
    if (p != FINGERPRINT_OK) {
        Serial.println("[FINGER] ✗ Error guardando en sensor");
        detenerCaptura();
        return false;
    }
    
    Serial.printf("[FINGER] ✓ Guardado en slot %d OK\n", slot);
    
    // Enviar progreso: Procesando
    if (wsConnected && !client_sid.isEmpty()) {
        DynamicJsonDocument prog(256);
        prog["tipo"] = "registro";
        prog["status"] = "progress";
        prog["step"] = 4;
        prog["message"] = "Procesando huella...";
        prog["client_sid"] = client_sid;
        char buf[256];
        serializeJson(prog, buf);
        String frame = "42[\"sensor-progress\"," + String(buf) + "]";
        webSocket.sendTXT(frame);
    }
    
    // Extraer template
    if (finger.getModel() != FINGERPRINT_OK) {
        Serial.println("[FINGER] ⚠️ No se pudo extraer template");
        detenerCaptura();
        return true;
    }
    
    // Descargar (código omitido por brevedad, es idéntico al anterior)
    size_t len = MAX_TEMPLATE_SIZE;
    int idx = 0;
    unsigned long start = millis();
    
    while (idx < len && (millis() - start) < 5000) {
        if (FingerSerial.available() >= 9) {
            uint8_t header[9];
            for (int i = 0; i < 9; i++) {
                header[i] = FingerSerial.read();
            }
            
            if (header[0] == 0xEF && header[1] == 0x01) {
                uint8_t ptype = header[6];
                uint16_t plen = (header[7] << 8) | header[8];
                
                for (int i = 0; i < plen && idx < len; i++) {
                    templateBuf[idx++] = FingerSerial.read();
                }
                
                if (ptype == FINGERPRINT_ENDDATAPACKET) {
                    break;
                }
            }
        }
        // Small delay to yield — comprobar cancelación para abortar rápidamente
        if (verificarCancelacion()) {
            Serial.println("[FINGER] ✗ CANCELACIÓN detectada durante descarga de template");
            detenerCaptura();
            return false;
        }
        delay(10);
    }
    
    if (idx > 0) {
        uint8_t iv[GCM_IV_LEN];
        generate_random_iv(iv, GCM_IV_LEN);
        uint8_t tag[GCM_TAG_LEN];
        
        // Antes de cifrar, comprobar si hubo una solicitud de cancelación
        if (verificarCancelacion()) {
            Serial.println("[FINGER] ✗ CANCELACIÓN detectada antes de cifrado");
            detenerCaptura();
            return false;
        }

        if (aes_gcm_encrypt(DEVICE_KEY, iv, templateBuf, idx, cipherBuf, tag)) {
            memcpy(cipherBuf + idx, tag, GCM_TAG_LEN);
            
            // Tras cifrar, volver a comprobar cancelación (cifrado puede tardar algo)
            if (verificarCancelacion()) {
                Serial.println("[FINGER] ✗ CANCELACIÓN detectada tras cifrado");
                detenerCaptura();
                return false;
            }

            if (base64_encode(cipherBuf, idx + GCM_TAG_LEN, b64Buf, 2732)) {
                char slotAndData[2800];
                snprintf(slotAndData, sizeof(slotAndData), "%d|%s", slot, b64Buf);
                huellaB64 = String(slotAndData);
                Serial.printf("[FINGER] ✓ Backup creado (slot: %d)\n", slot);
            }
        }
    }
    
    detenerCaptura();  // ✅ MARCAR CAPTURA COMPLETADA
    return true;
}

bool captureAndMatch(int slot, bool &matched, String client_sid = "") {
    iniciarCaptura(client_sid.c_str());  // ✅ PASAR client_sid DIRECTAMENTE (no usar clientSidActual)
    
    Serial.printf("[FINGER] Capturando para comparación con slot %d...\n", slot);
    
    if (slot < 1 || slot > 127) {
        Serial.println("[FINGER] ✗ Slot inválido");
        matched = false;
        detenerCaptura();
        return false;
    }
    
    uint8_t p = waitForImage();
    if (p != FINGERPRINT_OK || verificarCancelacion()) {
        if (verificarCancelacion()) {
            Serial.println("[FINGER] ✗ CANCELACIÓN: Usuario canceló comparación");
        } else {
            Serial.println("[FINGER] ✗ Error capturando imagen");
        }
        matched = false;
        detenerCaptura();
        return false;
    }
    
    p = finger.image2Tz(1);
    if (p != FINGERPRINT_OK) {
        Serial.println("[FINGER] ✗ Error procesando imagen");
        matched = false;
        detenerCaptura();
        return false;
    }
    Serial.println("[FINGER] ✓ Captura OK");
    
    p = finger.loadModel(slot);
    if (p != FINGERPRINT_OK) {
        Serial.printf("[FINGER] ⚠️ Slot %d no existe\n", slot);
        matched = false;
        detenerCaptura();
        return false;
    }
    
    p = finger.fingerFastSearch();
    if (p == FINGERPRINT_OK) {
        Serial.printf("[FINGER] ✓ MATCH - Confianza: %d\n", finger.confidence);
        matched = true;
    } else {
        Serial.println("[FINGER] ✗ No coincide");
        matched = false;
    }
    
    detenerCaptura();  // ✅ MARCAR CAPTURA COMPLETADA
    return true;
}

// ============================================================================
// WEBSOCKET - KEEP-ALIVE AGRESIVO Y RECONEXIÓN INTELIGENTE
// ============================================================================
void webSocketEvent(WStype_t type, uint8_t *payload, size_t length) {
    switch(type) {
        case WStype_DISCONNECTED: {
            Serial.println("[WS] 🔴 DESCONECTADO");
            wsConnected = false;
            wsReconnecting = true;
            apagarTodosLEDs();
            
            if (reconnectAttempt < MAX_RECONNECT_ATTEMPTS) {
                unsigned long nextInterval = RECONNECT_INTERVALS[reconnectAttempt];
                Serial.printf("[WS] 🔄 Exponential backoff: +%lums (intento %d/%d)\n", 
                              nextInterval, reconnectAttempt + 1, MAX_RECONNECT_ATTEMPTS);
                reconnectAttempt++;
            } else {
                Serial.printf("[WS] 🔄 Reconexión fija: 30s (intento max alcanzado)\n");
            }
            lastConnectionAttempt = millis();
            break;
        }
        
        case WStype_CONNECTED: {
            Serial.println("[WS] 🟢🟢🟢 CONECTADO EXITOSAMENTE");
            wsConnected = true;
            wsReconnecting = false;
            reconnectAttempt = 0;
            lastPingTime = millis();
            lastMessageTime = millis();
            
            // Identificarse
            webSocket.sendTXT("40");
            delay(50);
            webSocket.sendTXT("42[\"identify\",{\"role\":\"sensor\",\"sensor_id\":\"esp32-1\"}]");
            
            // CRÍTICO: Reenviar todos los mensajes en buffer
            flushMessageBuffer();
            break;
        }
        
        case WStype_TEXT: {
            String msg = String((const char*)payload).substring(0, length);
            
            // ✅ DEBUG: Log de TODOS los mensajes para diagnosticar
            if (!msg.startsWith("2") && !msg.startsWith("3")) {
                Serial.printf("[WS-DEBUG] Mensaje recibido (%d bytes): %.100s\n", length, msg.c_str());
            }
            
            // Manejar PONG (keep-alive)
            if (msg == "3") {
                Serial.println("[WS] ♥️ PONG recibido");
                lastMessageTime = millis();  // ✅ CRITICAL: Resetear timeout inactividad al recibir PONG
                break;
            }
            
            // ✅ Actualizar lastMessageTime para cualquier mensaje válido
            lastMessageTime = millis();
            
            // ========== CANCELACIÓN EN TIEMPO REAL ==========
            if (msg.indexOf("sensor-cancel") >= 0 && msg.startsWith("42[")) {
                Serial.println("[WS] ⚠️ SOLICITUD DE CANCELACIÓN RECIBIDA (formato flexible)");
                int start = msg.indexOf('{');
                int end = msg.lastIndexOf('}');
                
                if (start >= 0 && end > start) {
                    String jsonStr = msg.substring(start, end + 1);
                    StaticJsonDocument<256> cancelDoc;
                    
                    if (!deserializeJson(cancelDoc, jsonStr)) {
                        String cancel_client_sid = cancelDoc["client_sid"] | "";
                        String cancel_operation_id = cancelDoc["operation_id"] | "";  // 🔑 Extraer operation_id
                        
                        Serial.printf("[CANCEL] DEBUG - clientSidActual: '%s' | Recibido: '%s' | EnProgreso: %d | op_id: %.12s...\n", 
                                    clientSidActual, cancel_client_sid.c_str(), capturaEnProgreso, cancel_operation_id.c_str());
                        
                        // Validar que el client_sid no esté vacío y comparar
                        if (!cancel_client_sid.isEmpty() && capturaEnProgreso) {
                            if (cancel_client_sid.equals(clientSidActual)) {
                                solicitarCancelacion("Cancelación del cliente");
                                Serial.printf("[CANCEL] ✓ CANCELACIÓN INMEDIATA para cliente: %s\n", cancel_client_sid.c_str());
                                
                                // ✅ ENVIAR CONFIRMACIÓN INMEDIATA AL SERVIDOR
                                if (wsConnected) {
                                    DynamicJsonDocument ack(256);
                                    ack["tipo"] = "cancelacion_ack";
                                    ack["client_sid"] = cancel_client_sid;
                                    ack["operation_id"] = cancel_operation_id;  // 🔑 Incluir operation_id
                                    ack["status"] = "procesada";
                                    ack["timestamp"] = millis();
                                    char buf[256];
                                    serializeJson(ack, buf);
                                    String frame = "42[\"sensor-cancel-ack\"," + String(buf) + "]";
                                    webSocket.sendTXT(frame);
                                    Serial.println("[CANCEL] ✓ ACK enviado al servidor");
                                }
                            } else {
                                Serial.printf("[CANCEL] ⚠️ client_sid NO coincide (esperado: '%s', recibido: '%s')\n", 
                                            clientSidActual, cancel_client_sid.c_str());
                            }
                        } else {
                            if (cancel_client_sid.isEmpty()) {
                                Serial.println("[CANCEL] ⚠️ client_sid vacío en solicitud de cancelación");
                            }
                            if (!capturaEnProgreso) {
                                Serial.println("[CANCEL] ⚠️ No hay captura en progreso");
                            }
                        }
                    } else {
                        Serial.println("[CANCEL] ⚠️ Error al parsear JSON de cancelación");
                    }
                }
                return;  // ✅ Cambiar a return para no seguir procesando
            }
            
            if (!msg.startsWith("42[\"sensor-huella\",")) {
                return;
            }
            
            int start = msg.indexOf('{');
            int end = msg.lastIndexOf('}');
            
            if (start < 0 || end <= start) {
                Serial.println("[WS] JSON inválido");
                return;
            }
            
            String jsonStr = msg.substring(start, end + 1);
            StaticJsonDocument<512> doc;
            
            if (deserializeJson(doc, jsonStr)) {
                Serial.println("[WS] Parse error");
                return;
            }
            
            String tipo = doc["tipo"];
            int user_id = doc["user_id"];
            String codigo = doc["codigo"];
            String client_sid = doc["client_sid"];
            String message_id = doc["message_id"] | "";  // ID único del mensaje
            String operation_id = doc["operation_id"] | "";  // 🔑 ID único de operación del cliente
            
            Serial.printf("[WS] ✓ Comando: %s | user_id: %d | client: %.8s | msg_id: %s | op_id: %.12s...\n", 
                          tipo.c_str(), user_id, client_sid.c_str(), message_id.c_str(), operation_id.c_str());
            
            // ✅ ENVIAR ACK INMEDIATO AL SERVIDOR (confirmación de recepción)
            if (wsConnected && !message_id.isEmpty()) {
                DynamicJsonDocument ackDoc(256);
                ackDoc["tipo"] = "sensor-ack";
                ackDoc["message_id"] = message_id;
                ackDoc["client_sid"] = client_sid;
                ackDoc["status"] = "recibido";
                ackDoc["timestamp"] = millis();
                
                char ackBuf[256];
                serializeJson(ackDoc, ackBuf);
                String ackFrame = "42[\"sensor-ack\"," + String(ackBuf) + "]";
                webSocket.sendTXT(ackFrame);
                Serial.printf("[ACK] ✓ Confirmación enviada al servidor - message_id: %s\n", message_id.c_str());
            }
            
            // ========== REGISTRO / ASISTENCIA: delegar a worker en Core 1 ==========
            if (tipo == String("registro") || tipo == String("asistencia")) {
                // Si ya hay una captura en progreso, rechazar inmediatamente
                if (capturaEnProgreso) {
                    Serial.println("[WS] ✗ Ya hay captura en progreso, rechazando nueva solicitud");
                    DynamicJsonDocument resp(256);
                    resp["tipo"] = tipo;
                    resp["user_id"] = user_id;
                    resp["codigo"] = codigo;
                    resp["asistencia"] = "denied";
                    resp["message"] = "Sensor ocupado";
                    resp["timestamp"] = millis();
                    char buf[256];
                    serializeJson(resp, buf);
                    String frame = "42[\"sensor-response\"," + String(buf) + "]";
                    if (wsConnected) webSocket.sendTXT(frame); else bufferMessage(frame);
                } else {
                    // Crear job y enviarlo a la cola del worker
                    SensorJob job;
                    memset(&job, 0, sizeof(SensorJob));
                    strncpy(job.tipo, tipo.c_str(), sizeof(job.tipo)-1);
                    job.user_id = user_id;
                    strncpy(job.codigo, codigo.c_str(), sizeof(job.codigo)-1);
                    String huellaStr = doc["huella"];
                    strncpy(job.huella, huellaStr.c_str(), sizeof(job.huella)-1);
                    strncpy(job.client_sid, client_sid.c_str(), sizeof(job.client_sid)-1);
                    strncpy(job.message_id, message_id.c_str(), sizeof(job.message_id)-1);
                    strncpy(job.operation_id, operation_id.c_str(), sizeof(job.operation_id)-1);  // 🔑 Copiar operation_id

                    // Enviar job a la cola (sin bloqueo, si está llena rechazar)
                    if (xQueueSend(jobQueue, &job, 0) != pdTRUE) {
                        Serial.println("[WS] ✗ Cola de jobs llena, rechazando solicitud");
                        DynamicJsonDocument resp(256);
                        resp["tipo"] = tipo;
                        resp["user_id"] = user_id;
                        resp["codigo"] = codigo;
                        resp["asistencia"] = "denied";
                        resp["message"] = "Sensor ocupado (cola llena)";
                        resp["timestamp"] = millis();
                        char buf[256];
                        serializeJson(resp, buf);
                        String frame = "42[\"sensor-response\"," + String(buf) + "]";
                        if (wsConnected) webSocket.sendTXT(frame); else bufferMessage(frame);
                    } else {
                        Serial.println("[WS] ✓ Job enviado al worker en Core 1");
                    }
                }
            }
            
            break;
        }
    }
}

// ============================================================================
// TASK: WEBSOCKET LOOP (CORE 0) - NUNCA SE CAE
// ============================================================================
void webSocketTask(void *pvParameters) {
    Serial.println("[TASK-WS] Iniciado en Core 0");
    
    for(;;) {
        // === LOOP PRINCIPAL ===
        webSocket.loop();
        
        // === KEEP-ALIVE: PING CADA 10s ===
        if (wsConnected && (millis() - lastPingTime) > PING_INTERVAL) {
            webSocket.sendTXT("2");  // PING en Socket.IO
            lastPingTime = millis();
            Serial.println("[WS] 🔵 PING enviado (keep-alive)");
        }
        
        // === DETECCIÓN DE INACTIVIDAD ===
        if (wsConnected && (millis() - lastMessageTime) > INACTIVITY_TIMEOUT) {
            Serial.println("[WS] ⚠️ Sin actividad en 20s, reconectando proactivamente...");
            webSocket.disconnect();
            wsConnected = false;
            wsReconnecting = true;
        }
        
        // === RECONEXIÓN AUTOMÁTICA CON EXPONENTIAL BACKOFF ===
        if (!wsConnected && !wsReconnecting) {
            unsigned long timeSinceAttempt = millis() - lastConnectionAttempt;
            unsigned long nextInterval = (reconnectAttempt < MAX_RECONNECT_ATTEMPTS) 
                ? RECONNECT_INTERVALS[reconnectAttempt] 
                : RECONNECT_INTERVALS[MAX_RECONNECT_ATTEMPTS - 1];
            
            if (timeSinceAttempt > nextInterval) {
                Serial.printf("[WS] 🔄 Intentando reconexión (intento %d)...\n", reconnectAttempt + 1);
                webSocket.begin(WS_HOST, WS_PORT, "/socket.io/?EIO=4&transport=websocket");
                wsReconnecting = true;
                lastConnectionAttempt = millis();
            }
        }
        
        vTaskDelay(pdMS_TO_TICKS(10));  // Yield a otros tasks
    }
}

// ============================================================================
// TASK: SENSOR LOOP (CORE 1) - SIN BLOQUEAR WEBSOCKET
// ============================================================================
void sensorTask(void *pvParameters) {
    Serial.println("[TASK-SENSOR] Iniciado en Core 1");
    
    for(;;) {
        // Este task simplemente yield, el procesamiento está en el handler WebSocket
        vTaskDelay(pdMS_TO_TICKS(100));
    }
}

// Worker que procesa una solicitud de captura en Core 1
// Este worker es PERSISTENTE: espera jobs en la cola en lugar de destruirse
void sensorWorker(void* pvParameters) {
    Serial.println("[WORKER] Iniciado en Core 1 (persistente)");
    
    for(;;) {
        SensorJob job;
        // Esperar job de la cola (bloqueante)
        if (xQueueReceive(jobQueue, &job, portMAX_DELAY) != pdTRUE) {
            vTaskDelay(pdMS_TO_TICKS(10));
            continue;
        }

        String tipo(job.tipo);
        int user_id = job.user_id;
        String codigo(job.codigo);
        String huellaStr(job.huella);
        String client_sid(job.client_sid);
        String message_id(job.message_id);
        String operation_id(job.operation_id);  // 🔑 ID de operación del cliente

        Serial.printf("[WORKER] Procesando job tipo=%s user_id=%d client=%s op_id=%.12s...\n", 
                      tipo.c_str(), user_id, client_sid.c_str(), operation_id.c_str());

        if (tipo == "registro") {
            encenderLEDRegistro();
            int slotUsed = -1;
            String huellaB64;
            
            bool success = captureAndStore(slotUsed, huellaB64, client_sid);
            
            // Verificar si fue cancelado
            if (cancelarCaptura) {
                Serial.println("[WORKER] Job fue cancelado durante registro");
                DynamicJsonDocument resp(512);
                resp["tipo"] = "registro";
                resp["user_id"] = user_id;
                resp["codigo"] = codigo;
                resp["asistencia"] = "cancelled";
                resp["message"] = "Registro cancelado por usuario";
                resp["client_sid"] = client_sid;
                resp["operation_id"] = operation_id;  // 🔑 Incluir operation_id

                char buf[512];
                serializeJson(resp, buf);
                String frame = "42[\"sensor-response\"," + String(buf) + "]";
                if (wsConnected) {
                    webSocket.sendTXT(frame);
                } else {
                    bufferMessage(frame);
                }
            } else if (success) {
                DynamicJsonDocument resp(1024);
                resp["tipo"] = "registro";
                resp["user_id"] = user_id;
                resp["codigo"] = codigo;
                resp["asistencia"] = "success";
                resp["huella"] = huellaB64;
                resp["client_sid"] = client_sid;
                resp["operation_id"] = operation_id;  // 🔑 Incluir operation_id

                char buf[1024];
                serializeJson(resp, buf);
                String frame = "42[\"sensor-response\"," + String(buf) + "]";
                if (wsConnected) {
                    webSocket.sendTXT(frame);
                    Serial.printf("[WORKER] ✓ REGISTRO exitoso (slot: %d)\n", slotUsed);
                } else {
                    bufferMessage(frame);
                }
            } else {
                DynamicJsonDocument resp(512);
                resp["tipo"] = "registro";
                resp["user_id"] = user_id;
                resp["codigo"] = codigo;
                resp["asistencia"] = "denied";
                resp["error"] = "capture_failed";
                resp["client_sid"] = client_sid;
                resp["operation_id"] = operation_id;  // 🔑 Incluir operation_id

                char buf[512];
                serializeJson(resp, buf);
                String frame = "42[\"sensor-response\"," + String(buf) + "]";
                if (wsConnected) {
                    webSocket.sendTXT(frame);
                } else {
                    bufferMessage(frame);
                }
            }
            apagarTodosLEDs();
        }
        else if (tipo == "asistencia") {
            encenderLEDAsistencia();
            int slotIdx = huellaStr.indexOf('|');
            if (slotIdx < 0) {
                apagarTodosLEDs();
                Serial.println("[WORKER] ✗ Formato de huella inválido");
                continue;
            }
            
            int slot = huellaStr.substring(0, slotIdx).toInt();
            bool matched = false;
            
            bool success = captureAndMatch(slot, matched, client_sid);
            
            // Verificar si fue cancelado
            if (cancelarCaptura) {
                Serial.println("[WORKER] Job fue cancelado durante asistencia");
                DynamicJsonDocument resp(512);
                resp["tipo"] = "asistencia";
                resp["user_id"] = user_id;
                resp["codigo"] = codigo;
                resp["huella"] = huellaStr;
                resp["asistencia"] = "cancelled";
                resp["message"] = "Verificación cancelada por usuario";
                resp["client_sid"] = client_sid;
                resp["operation_id"] = operation_id;  // 🔑 Incluir operation_id

                char buf[512];
                serializeJson(resp, buf);
                String frame = "42[\"sensor-response\"," + String(buf) + "]";
                if (wsConnected) {
                    webSocket.sendTXT(frame);
                } else {
                    bufferMessage(frame);
                }
            } else if (success) {
                DynamicJsonDocument resp(512);
                resp["tipo"] = "asistencia";
                resp["user_id"] = user_id;
                resp["codigo"] = codigo;
                resp["huella"] = huellaStr;
                resp["asistencia"] = matched ? "success" : "denied";
                resp["client_sid"] = client_sid;
                resp["operation_id"] = operation_id;  // 🔑 Incluir operation_id

                char buf[512];
                serializeJson(resp, buf);
                String frame = "42[\"sensor-response\"," + String(buf) + "]";
                if (wsConnected) {
                    webSocket.sendTXT(frame);
                } else {
                    bufferMessage(frame);
                }
            } else {
                DynamicJsonDocument resp(512);
                resp["tipo"] = "asistencia";
                resp["user_id"] = user_id;
                resp["codigo"] = codigo;
                resp["huella"] = huellaStr;
                resp["asistencia"] = "denied";
                resp["error"] = "capture_failed";
                resp["client_sid"] = client_sid;
                resp["operation_id"] = operation_id;  // 🔑 Incluir operation_id

                char buf[512];
                serializeJson(resp, buf);
                String frame = "42[\"sensor-response\"," + String(buf) + "]";
                if (wsConnected) {
                    webSocket.sendTXT(frame);
                } else {
                    bufferMessage(frame);
                }
            }
            apagarTodosLEDs();
        }

        Serial.println("[WORKER] Job completado, esperando siguiente...");
    }
}

// ============================================================================
// SETUP
// ============================================================================
void setup() {
    Serial.begin(115200);
    delay(500);
    Serial.println("\n╔════════════════════════════════════════════════╗");
    Serial.println("║   ESP32 Fingerprint Sensor v4 DUAL-CORE       ║");
    Serial.println("║   Socket.IO Style (NUNCA SE CAE)              ║");
    Serial.println("╚════════════════════════════════════════════════╝\n");
    
    // === INICIALIZAR LEDS ===
    pinMode(LED_REGISTRO_PIN, OUTPUT);
    pinMode(LED_ASISTENCIA_PIN, OUTPUT);
    // Inicializar pin de reset del sensor (si está cableado)
    pinMode(FINGER_RESET_PIN, OUTPUT);
    digitalWrite(FINGER_RESET_PIN, HIGH);
    apagarTodosLEDs();
    Serial.println("[LED] ✓ LEDs inicializados\n");
    
    // === INICIALIZAR SENSOR ===
    if (!initFingerprint()) {
        Serial.println("[SETUP] ⚠️ Sensor no responde (continuando)");
    }
    
    // === CONECTAR WIFI ===
    Serial.println("[WIFI] Conectando...");
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts++ < 20) {
        Serial.print(".");
        delay(500);
    }
    
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("\n[WIFI] ✗ Error de conexión");
        ESP.restart();
    }
    
    Serial.printf("\n[WIFI] ✓ Conectado - IP: %s\n\n", WiFi.localIP().toString().c_str());
    
    // === INICIALIZAR WEBSOCKET ===
    Serial.println("[WEBSOCKET] Configurando...");
    webSocket.onEvent(webSocketEvent);
    webSocket.begin(WS_HOST, WS_PORT, "/socket.io/?EIO=4&transport=websocket");
    delay(1000);
    
    // === CREAR COLA DE JOBS ===
    jobQueue = xQueueCreate(1, sizeof(SensorJob));
    if (jobQueue == NULL) {
        Serial.println("[SETUP] ✗ Error creando cola de jobs");
        ESP.restart();
    }
    Serial.println("[SETUP] ✓ Cola de jobs creada");
    
    // === CREAR TASKS DUAL-CORE ===
    Serial.println("[DUAL-CORE] Creando tasks...\n");
    
    xTaskCreatePinnedToCore(
        webSocketTask,        // Función
        "WebSocketLoop",      // Nombre
        8192,                 // Stack size
        NULL,                 // Parámetro
        2,                    // Prioridad
        &webSocketTaskHandle, // Handle
        0                     // Core 0
    );
    
    xTaskCreatePinnedToCore(
        sensorTask,           // Función
        "SensorLoop",         // Nombre
        4096,                 // Stack size
        NULL,                 // Parámetro
        1,                    // Prioridad
        &sensorTaskHandle,    // Handle
        1                     // Core 1
    );
    
    // Crear worker persistente
    xTaskCreatePinnedToCore(
        sensorWorker,         // Función
        "SensorWorker",       // Nombre
        16384,                // Stack size (grande para procesamiento)
        NULL,                 // Parámetro
        1,                    // Prioridad
        &sensorWorkerHandle,  // Handle
        1                     // Core 1
    );
    
    Serial.println("[SETUP] ✓ Sistema listo - Arquitectura dual-core activa\n");
}

// ============================================================================
// LOOP (Loop por defecto en Core 0, pero Tasks lo manejan)
// ============================================================================
void loop() {
    delay(10000);  // Simplemente dormir, todo está en los tasks
    
    // Mostrar estado cada 10s
    Serial.printf("[STATUS] WS: %s | Buffer: %d | LEDs: R=%d A=%d | Mem: %dB\n",
                  wsConnected ? "✓" : "✗",
                  messageBuffer.size(),
                  ledRegistroActivo,
                  ledAsistenciaActivo,
                  ESP.getFreeHeap());
}
