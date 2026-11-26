// GarageGo door bridge for an ESP32 (Wokwi simulation or a real DevKitC).
// Wokwi: paste this file into sketch.ino and diagram.json (same folder) into the diagram.json tab, then press play.
// Speaks the same contract as server/fake-device.js:
//   every POLL_MS:  GET  /api/device/commands  (header X-Device-Key) -> {} or { command_id, action: "open" | "close" }
//   on a command:   click the relay (= press the opener's wall button), set the LED, then
//                   POST /api/device/ack  { command_id, status: "opened" | "error" }  ("opened" = carried out)
// The phone never talks to this board. The server only queues a command for a renter
// with a paid booking that covers right now, so this sketch has no auth logic of its own.
//
// Demo: the LED (GPIO 2) is the door. On after "open", off after "close".
// Real door later: relay module IN -> GPIO 4, relay COM/NO -> the opener's wall-button terminals.
// Board: "ESP32 Dev Module". No extra libraries needed.
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>

// ---------- change these ----------
// Wokwi simulation: "Wokwi-GUEST" with no password. Real board: your 2.4 GHz Wi-Fi (an ESP32 cannot use 5 GHz).
const char* WIFI_SSID = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
// Wokwi simulation: the https://....trycloudflare.com address that
// `cloudflared tunnel --url http://localhost:3000` prints (no slash at the end). It changes on every restart.
// Real board on the same Wi-Fi as the server PC: http://<server PC IP>:3000
const char* SERVER_URL = "https://hackathon-qg6c.onrender.com";
// One board for the demo answers for BOTH sample garages, so it doesn't matter which one gets
// booked. A real door has exactly one key: keep only that garage's key here.
// From the host screen ("Pair a device"). Seed garages: dev-door-lagera-1, dev-door-krasno-2
const char* DEVICE_KEYS[] = { "dev-door-lagera-1", "dev-door-krasno-2" };
// ----------------------------------

const int KEY_COUNT = sizeof(DEVICE_KEYS) / sizeof(DEVICE_KEYS[0]);

const int RELAY_PIN = 4;
const int LED_PIN = 2;
// Most cheap blue relay modules switch on LOW. If yours clicks at boot and not on Open, flip this.
const bool RELAY_ACTIVE_HIGH = true;

// One poll every POLL_MS, alternating between the keys, so each key is asked every
// POLL_MS * KEY_COUNT. The server drops a command after 20 s, so this is plenty.
const unsigned long POLL_MS = 250;
const unsigned long RELAY_PULSE_MS = 500;  // how long the "button" is held
const unsigned long HTTP_TIMEOUT_MS = 8000;   // a sleeping free Render server needs up to a minute to wake
const unsigned long HEARTBEAT_MS = 10000;
const int ACK_TRIES = 3;

// One connection kept open between requests: a new TLS handshake per poll takes seconds
WiFiClient plainClient;
WiFiClientSecure tlsClient;
HTTPClient http;
const bool useTls = strncmp(SERVER_URL, "https", 5) == 0;

bool doorOpen = false;       // what the LED shows
bool serverReachable = false;
int nextKey = 0;
unsigned long lastPoll = 0, lastBeat = 0;
unsigned long polls = 0, failures = 0, lastMs = 0;
int lastCode = 0;

void setRelay(bool on) {
  digitalWrite(RELAY_PIN, on == RELAY_ACTIVE_HIGH ? HIGH : LOW);
}

void showDoor() {
  digitalWrite(LED_PIN, doorOpen ? HIGH : LOW);
}

// Status blinks that don't change the door: the LED goes back to showing the door afterwards
void blinkLed(int times, int onMs, int offMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, !doorOpen);
    delay(onMs);
    showDoor();
    delay(offMs);
  }
}

// One button press on the opener, then the LED shows the door's new state
void triggerDoor(bool open) {
  Serial.println(open ? "[DOOR] OPEN  -> LED on" : "[DOOR] CLOSE -> LED off");
  setRelay(true);
  delay(RELAY_PULSE_MS);
  setRelay(false);
  doorOpen = open;
  showDoor();
}

void beginRequest(const char* path, const char* key) {
  String url = String(SERVER_URL) + path;
  if (useTls) http.begin(tlsClient, url);
  else http.begin(plainClient, url);
  http.addHeader("X-Device-Key", key);
}

// Pulls "value" out of {"key":"value"} without a JSON library. Empty if missing.
String jsonString(const String& body, const char* key) {
  String needle = String("\"") + key + "\":\"";
  int start = body.indexOf(needle);
  if (start < 0) return "";
  start += needle.length();
  int end = body.indexOf('"', start);
  return end < 0 ? "" : body.substring(start, end);
}

// Why the last Wi-Fi attempt failed, from the Wi-Fi driver (e.g. NO_AP_FOUND, AUTH_FAIL)
volatile uint8_t lastWifiReason = 0;
void onWifiEvent(arduino_event_id_t event, arduino_event_info_t info) {
  if (event == ARDUINO_EVENT_WIFI_STA_DISCONNECTED && info.wifi_sta_disconnected.reason != WIFI_REASON_ASSOC_LEAVE && info.wifi_sta_disconnected.reason != 36) {
    lastWifiReason = info.wifi_sta_disconnected.reason;  // ignore our own "leave" when we restart an attempt
  }
}

// Lists what the board can see, so you can tell "hotspot off / 5 GHz only / too far" from "wrong password"
void scanNetworks() {
  WiFi.setAutoReconnect(false);  // a background reconnect makes the scan fail
  WiFi.disconnect(true);
  delay(500);
  WiFi.mode(WIFI_STA);
  int n = WiFi.scanNetworks();
  if (n < 0) {
    Serial.printf("[WiFi] the scan itself failed (code %d); can't tell what is nearby.%s", n, "\n");
  } else {
    Serial.printf("[WiFi] the board sees %d network(s):\n", n);
    bool found = false;
    for (int i = 0; i < n && i < 12; i++) {
      bool mine = WiFi.SSID(i) == WIFI_SSID;
      found = found || mine;
      Serial.printf("   %s\"%s\"  channel %d, %d dBm%s\n", mine ? "-> " : "   ", WiFi.SSID(i).c_str(), WiFi.channel(i), WiFi.RSSI(i), mine ? "   <- this is yours" : "");
    }
    if (!found) Serial.printf("[WiFi] \"%s\" is NOT among them: the hotspot is off, too far, or on 5 GHz only (an ESP32 needs 2.4 GHz).\n", WIFI_SSID);
  }
  WiFi.scanDelete();
  WiFi.setAutoReconnect(true);
}

void connectWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.printf("[WiFi] connecting to \"%s\" (%d characters)", WIFI_SSID, (int)strlen(WIFI_SSID));
  WiFi.disconnect(true);  // drop the previous attempt first, or the driver refuses a new one
  delay(200);
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);  // power saving makes answers slow and sometimes drops the connection
  WiFi.setAutoReconnect(true);
  lastWifiReason = 0;
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  unsigned long started = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - started < 15000) {
    digitalWrite(LED_PIN, !digitalRead(LED_PIN));  // fast blink = looking for Wi-Fi
    delay(250);
    Serial.print(".");
  }
  showDoor();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[WiFi] online, IP %s, signal %d dBm\n", WiFi.localIP().toString().c_str(), WiFi.RSSI());
    blinkLed(3, 80, 80);  // 3 quick blinks = Wi-Fi is up
  } else {
    Serial.printf("\n[WiFi] failed. Driver says: %s (code %d)\n", lastWifiReason ? WiFi.disconnectReasonName((wifi_err_reason_t)lastWifiReason) : "no answer", lastWifiReason);
    Serial.println("[WiFi] code 201 = network not found, 202/15 = wrong password, 204 = handshake timed out.");
    scanNetworks();
  }
}

// Tells the server what happened, so the app shows "Opened" / "Closed" (or the error).
// It must use the key that delivered the command.
void ack(const char* key, const String& commandId, bool ok, const char* error) {
  String body = String("{\"command_id\":\"") + commandId + "\",\"status\":\"" + (ok ? "opened" : "error") + "\"";
  if (!ok) body += String(",\"error\":\"") + error + "\"";
  body += "}";

  for (int i = 0; i < ACK_TRIES; i++) {
    beginRequest("/api/device/ack", key);
    http.addHeader("Content-Type", "application/json");
    int code = http.POST(body);
    if (code > 0) http.getString();  // read the reply so the connection can be reused
    http.end();
    if (code == 200) {
      Serial.printf("[ACK] %s -> 200\n", ok ? "done" : "error");
      return;
    }
    Serial.printf("[ACK] failed (%d), retrying\n", code);
    tlsClient.stop();  // start the next try on a fresh connection
    delay(300);
  }
}

void poll() {
  const char* key = DEVICE_KEYS[nextKey];
  nextKey = (nextKey + 1) % KEY_COUNT;

  unsigned long t0 = millis();
  beginRequest("/api/device/commands", key);
  int code = http.GET();
  String body = code > 0 ? http.getString() : "";
  http.end();
  lastMs = millis() - t0;
  lastCode = code;
  polls++;

  if (code == 401) {
    failures++;
    Serial.printf("[HTTP] 401: the server doesn't know the key \"%s\".\n", key);
    delay(2000);
    return;
  }
  if (code != 200) {
    failures++;
    if (serverReachable) Serial.printf("[HTTP] poll failed (%d) after %lu ms. The server may be waking up; retrying.\n", code, lastMs);
    serverReachable = false;
    tlsClient.stop();  // a timed-out TLS connection is unusable: start the next poll fresh
    delay(1000);
    return;
  }
  if (!serverReachable) {
    serverReachable = true;
    Serial.printf("[HTTP] server answers (%lu ms)\n", lastMs);
    blinkLed(2, 250, 200);  // 2 slow blinks = the server answers
  }

  String commandId = jsonString(body, "command_id");
  if (commandId.isEmpty()) return;  // {} = nothing to do

  String action = jsonString(body, "action");
  Serial.printf("[CMD] %s for \"%s\" (%s)\n", action.c_str(), key, commandId.c_str());
  if (action == "open" || action == "close") {
    triggerDoor(action == "open");
    ack(key, commandId, true, nullptr);
  } else {
    ack(key, commandId, false, "Unknown action");
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  setRelay(false);
  showDoor();

  WiFi.onEvent(onWifiEvent);
  tlsClient.setInsecure();  // no certificate check: fine for the demo, not for a real door
  http.setReuse(true);
  http.setTimeout(HTTP_TIMEOUT_MS);

  Serial.println("\nGarageGo door bridge");
  Serial.printf("Server %s, %d key(s)\n", SERVER_URL, KEY_COUNT);
  Serial.println("Type \"open\" or \"close\" in the Serial Monitor to test the LED without the server.");
  connectWifi();
}

void loop() {
  if (Serial.available()) {
    String line = Serial.readStringUntil('\n');
    line.trim();
    if (line == "open" || line == "close") triggerDoor(line == "open");
  }

  if (WiFi.status() != WL_CONNECTED) {
    serverReachable = false;
    connectWifi();
    return;
  }

  if (millis() - lastPoll >= POLL_MS) {
    lastPoll = millis();
    poll();
  }

  // So the Serial Monitor is never silent: proof the board is alive and polling
  if (millis() - lastBeat >= HEARTBEAT_MS) {
    lastBeat = millis();
    Serial.printf("[alive] door %s | polls %lu, failed %lu | last answer %d in %lu ms | Wi-Fi %d dBm\n",
                  doorOpen ? "OPEN" : "closed", polls, failures, lastCode, lastMs, WiFi.RSSI());
  }
}
