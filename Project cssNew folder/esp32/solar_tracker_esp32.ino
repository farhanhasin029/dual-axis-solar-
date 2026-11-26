/*
 * ESP32 Dual-Axis Solar Tracker Firmware (Reference Sketch)
 * Compatible with the ESP32 Solar Tracker Dashboard UI
 *
 * Endpoints:
 *   GET  /api/telemetry  -> Returns JSON telemetry (temp, humidity, gasPpm, panAngle, tiltAngle, mode, ldr)
 *   POST /api/control    -> Accepts JSON { "mode": "auto"|"manual", "panAngle": 0..180, "tiltAngle": 0..180 }
 *
 * Required Libraries (Arduino IDE / PlatformIO):
 *   - WiFi.h, WebServer.h (ESP32 core)
 *   - ESP32Servo
 *   - DHT sensor library (Adafruit)
 *   - ArduinoJson (v6+)
 */

#include <WiFi.h>
#include <WebServer.h>
#include <ESP32Servo.h>
#include <DHT.h>
#include <ArduinoJson.h>

// --- Wi-Fi Credentials ---
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";

// --- Pin Definitions ---
#define PIN_LDR_TL 34
#define PIN_LDR_TR 35
#define PIN_LDR_BL 32
#define PIN_LDR_BR 33
#define PIN_GAS_MQ 36
#define PIN_DHT    4
#define PIN_SERVO_PAN  18
#define PIN_SERVO_TILT 19

#define DHTTYPE DHT22
#define LDR_DEADBAND 150

DHT dht(PIN_DHT, DHTTYPE);
Servo panServo;
Servo tiltServo;
WebServer server(80);

String trackerMode = "auto";
int panAngle = 90;
int tiltAngle = 70;

int ldrTL = 0, ldrTR = 0, ldrBL = 0, ldrBR = 0;
float temperature = 28.0;
float humidity = 55.0;
int gasPpm = 200;

unsigned long lastTrackMs = 0;
unsigned long lastDhtMs = 0;

void sendCorsHeaders() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
}

void handleOptions() {
  sendCorsHeaders();
  server.send(204);
}

void handleTelemetry() {
  sendCorsHeaders();
  StaticJsonDocument<384> doc;
  doc["temperature"] = round(temperature * 10.0) / 10.0;
  doc["humidity"] = round(humidity * 10.0) / 10.0;
  doc["gasPpm"] = gasPpm;
  doc["panAngle"] = panAngle;
  doc["tiltAngle"] = tiltAngle;
  doc["mode"] = trackerMode;
  doc["rssi"] = WiFi.RSSI();
  doc["uptimeSec"] = millis() / 1000;

  JsonObject ldr = doc.createNestedObject("ldr");
  ldr["tl"] = ldrTL;
  ldr["tr"] = ldrTR;
  ldr["bl"] = ldrBL;
  ldr["br"] = ldrBR;

  String json;
  serializeJson(doc, json);
  server.send(200, "application/json", json);
}

void handleControl() {
  sendCorsHeaders();
  if (!server.hasArg("plain")) {
    server.send(400, "application/json", "{\"error\":\"Missing body\"}");
    return;
  }

  StaticJsonDocument<256> doc;
  DeserializationError err = deserializeJson(doc, server.arg("plain"));
  if (err) {
    server.send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
    return;
  }

  if (doc.containsKey("mode")) {
    String m = doc["mode"].as<String>();
    if (m == "auto" || m == "manual") trackerMode = m;
  }
  if (trackerMode == "manual") {
    if (doc.containsKey("panAngle")) {
      panAngle = constrain(doc["panAngle"].as<int>(), 0, 180);
      panServo.write(panAngle);
    }
    if (doc.containsKey("tiltAngle")) {
      tiltAngle = constrain(doc["tiltAngle"].as<int>(), 0, 180);
      tiltServo.write(tiltAngle);
    }
  }

  server.send(200, "application/json", "{\"status\":\"ok\"}");
}

void setup() {
  Serial.begin(115200);
  dht.begin();

  panServo.attach(PIN_SERVO_PAN, 500, 2500);
  tiltServo.attach(PIN_SERVO_TILT, 500, 2500);
  panServo.write(panAngle);
  tiltServo.write(tiltAngle);

  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(400);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("ESP32 IP: ");
  Serial.println(WiFi.localIP());

  server.on("/api/telemetry", HTTP_OPTIONS, handleOptions);
  server.on("/api/telemetry", HTTP_GET, handleTelemetry);
  server.on("/api/control", HTTP_OPTIONS, handleOptions);
  server.on("/api/control", HTTP_POST, handleControl);
  server.begin();
}

void loop() {
  server.handleClient();

  unsigned long now = millis();

  // Read LDRs + Gas ADC
  ldrTL = analogRead(PIN_LDR_TL);
  ldrTR = analogRead(PIN_LDR_TR);
  ldrBL = analogRead(PIN_LDR_BL);
  ldrBR = analogRead(PIN_LDR_BR);
  int rawGas = analogRead(PIN_GAS_MQ);
  gasPpm = map(rawGas, 0, 4095, 100, 1500);

  // Read DHT every 2s
  if (now - lastDhtMs >= 2000) {
    lastDhtMs = now;
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    if (!isnan(t)) temperature = t;
    if (!isnan(h)) humidity = h;
  }

  // Closed-loop auto tracking every 80ms
  if (trackerMode == "auto" && (now - lastTrackMs >= 80)) {
    lastTrackMs = now;
    int avgTop = (ldrTL + ldrTR) / 2;
    int avgBot = (ldrBL + ldrBR) / 2;
    int avgLeft = (ldrTL + ldrBL) / 2;
    int avgRight = (ldrTR + ldrBR) / 2;

    int deltaX = avgRight - avgLeft;
    int deltaY = avgTop - avgBot;

    if (abs(deltaX) > LDR_DEADBAND) {
      panAngle = constrain(panAngle + (deltaX > 0 ? 1 : -1), 0, 180);
      panServo.write(panAngle);
    }
    if (abs(deltaY) > LDR_DEADBAND) {
      tiltAngle = constrain(tiltAngle + (deltaY > 0 ? 1 : -1), 0, 180);
      tiltServo.write(tiltAngle);
    }
  }
}
