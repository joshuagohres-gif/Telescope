// ============================================================
// Arduino Display — Waveshare 1.69" LCD (ST7789V2) Image Server
//
// Firmware for Arduino UNO R4 WiFi.
// Connects to WiFi, drives the 240x280 SPI display, and
// accepts RGB565 image uploads over HTTP.
//
// Wiring:
//   LCD VCC  -> 5 V
//   LCD GND  -> GND
//   LCD DIN  -> D11 (MOSI)
//   LCD CLK  -> D13 (SCK)
//   LCD CS   -> D10
//   LCD DC   -> D7
//   LCD RST  -> D8
//   LCD BL   -> D9
// ============================================================

#include <SPI.h>
#include <WiFiS3.h>
#include "display_driver.h"

// =============  USER CONFIGURATION  =========================
const char WIFI_SSID[] = "YOUR_WIFI_SSID";
const char WIFI_PASS[] = "YOUR_WIFI_PASSWORD";
// =============================================================

// Pin assignments — match your wiring
#define PIN_CS   10
#define PIN_DC    7
#define PIN_RST   8
#define PIN_BL    9

#define HTTP_PORT 80

// Expected image payload size: 240 * 280 * 2 bytes (RGB565)
#define IMAGE_SIZE (SCREEN_WIDTH * SCREEN_HEIGHT * 2)

// Read buffer — kept small to leave headroom for WiFi stack
#define BUF_SIZE 1024

DisplayDriver tft(PIN_CS, PIN_DC, PIN_RST, PIN_BL);
WiFiServer server(HTTP_PORT);
uint8_t buf[BUF_SIZE];

// ============================================================
// Forward declarations
// ============================================================
void handleClient(WiFiClient& client);
String readLine(WiFiClient& client);
int  readBytes(WiFiClient& client, uint8_t* buffer, int length);
void handleUpload(WiFiClient& client, int contentLength);
void sendCorsHeaders(WiFiClient& client);
void sendCorsResponse(WiFiClient& client);
void sendSuccess(WiFiClient& client, const char* message);
void sendError(WiFiClient& client, int code, const char* message);
void sendStatusJson(WiFiClient& client);
void sendHomePage(WiFiClient& client);
void sendNotFound(WiFiClient& client);
void showReadyScreen();

// ============================================================
// Setup
// ============================================================
void setup() {
  Serial.begin(115200);
  while (!Serial && millis() < 3000); // wait briefly for Serial Monitor

  Serial.println(F("Arduino Display — Starting..."));

  // --- Initialise display ---
  tft.begin();
  tft.fillScreen(0x0000);
  tft.drawText(20, 110, "Connecting to", 0xFFFF, 0x0000, 2);
  tft.drawText(20, 140, "WiFi...", 0xFFFF, 0x0000, 2);

  // --- Connect to WiFi ---
  Serial.print(F("Connecting to WiFi: "));
  Serial.println(WIFI_SSID);

  WiFi.begin(WIFI_SSID, WIFI_PASS);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(1000);
    Serial.print('.');
    attempts++;
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println(F("\nWiFi connection failed!"));
    tft.fillScreen(0x0000);
    tft.drawText(20, 100, "WiFi Failed!", 0xF800, 0x0000, 2);
    tft.drawText(20, 135, "Check credentials", 0xFFFF, 0x0000, 1);
    tft.drawText(20, 150, "and restart.", 0xFFFF, 0x0000, 1);
    while (true) delay(1000); // halt
  }

  showReadyScreen();

  // --- Start HTTP server ---
  server.begin();
  Serial.println(F("HTTP server started."));
}

// ============================================================
// Loop — accept one client at a time
// ============================================================
void loop() {
  WiFiClient client = server.available();
  if (client) {
    Serial.println(F("Client connected."));
    handleClient(client);
    client.stop();
    Serial.println(F("Client disconnected."));
  }
}

// ============================================================
// Show the "ready" splash on the LCD
// ============================================================
void showReadyScreen() {
  IPAddress ip = WiFi.localIP();
  char ipStr[20];
  snprintf(ipStr, sizeof(ipStr), "%d.%d.%d.%d", ip[0], ip[1], ip[2], ip[3]);

  Serial.print(F("\nConnected — IP: "));
  Serial.println(ipStr);

  tft.fillScreen(0x0000);
  tft.drawText(30, 70,  "WiFi Connected!", 0x07E0, 0x0000, 2);
  tft.drawText(20, 115, "IP Address:", 0xFFFF, 0x0000, 1);
  tft.drawText(20, 135, ipStr, 0xFFE0, 0x0000, 2);

  char portStr[20];
  snprintf(portStr, sizeof(portStr), "Port: %d", HTTP_PORT);
  tft.drawText(20, 175, portStr, 0xFFFF, 0x0000, 1);
  tft.drawText(20, 210, "Ready for images!", 0xFFFF, 0x0000, 1);
}

// ============================================================
// HTTP request handler
// ============================================================
void handleClient(WiFiClient& client) {
  // Read request line (e.g. "POST /upload HTTP/1.1")
  String requestLine = readLine(client);
  if (requestLine.length() == 0) return;

  int sp1 = requestLine.indexOf(' ');
  int sp2 = requestLine.indexOf(' ', sp1 + 1);
  if (sp1 < 0 || sp2 < 0) return;

  String method = requestLine.substring(0, sp1);
  String path   = requestLine.substring(sp1 + 1, sp2);

  // Read headers
  int contentLength = 0;
  while (true) {
    String header = readLine(client);
    if (header.length() == 0) break; // blank line = end of headers
    if (header.startsWith("Content-Length:") || header.startsWith("content-length:")) {
      contentLength = header.substring(header.indexOf(':') + 1).toInt();
    }
  }

  // Route
  if (method == "OPTIONS") {
    sendCorsResponse(client);
  } else if (method == "GET" && path == "/status") {
    sendStatusJson(client);
  } else if (method == "GET" && path == "/") {
    sendHomePage(client);
  } else if (method == "POST" && path == "/upload") {
    handleUpload(client, contentLength);
  } else {
    // Drain any remaining body bytes so the connection closes cleanly
    while (contentLength > 0 && client.connected()) {
      int n = min(contentLength, (int)BUF_SIZE);
      int r = readBytes(client, buf, n);
      if (r <= 0) break;
      contentLength -= r;
    }
    sendNotFound(client);
  }
}

// ============================================================
// Read one line from the client (up to \n), trimming \r\n.
// Returns "" on timeout.
// ============================================================
String readLine(WiFiClient& client) {
  String line;
  line.reserve(128);
  unsigned long start = millis();
  while (client.connected() && millis() - start < 5000) {
    if (client.available()) {
      char c = client.read();
      if (c == '\n') { line.trim(); return line; }
      if (c != '\r') line += c;
    }
  }
  return line;
}

// ============================================================
// Read exactly `length` bytes into `buffer` with timeout.
// Returns bytes actually read.
// ============================================================
int readBytes(WiFiClient& client, uint8_t* buffer, int length) {
  int totalRead = 0;
  unsigned long start = millis();
  while (totalRead < length && client.connected() && millis() - start < 15000) {
    int avail = client.available();
    if (avail > 0) {
      int toRead = min(avail, length - totalRead);
      int n = client.read(buffer + totalRead, toRead);
      if (n > 0) {
        totalRead += n;
        start = millis(); // reset timeout on progress
      }
    }
  }
  return totalRead;
}

// ============================================================
// Handle POST /upload — stream RGB565 data to the display
// ============================================================
void handleUpload(WiFiClient& client, int contentLength) {
  if (contentLength != IMAGE_SIZE) {
    Serial.print(F("Bad content length: "));
    Serial.println(contentLength);
    // Drain the body
    while (contentLength > 0 && client.connected()) {
      int n = min(contentLength, (int)BUF_SIZE);
      int r = readBytes(client, buf, n);
      if (r <= 0) break;
      contentLength -= r;
    }
    sendError(client, 400, "Content-Length must be 134400 (240x280 RGB565)");
    return;
  }

  // Prepare display for full-screen write
  tft.setWindow(0, 0, SCREEN_WIDTH - 1, SCREEN_HEIGHT - 1);
  tft.beginPixelStream();

  int remaining = contentLength;
  int totalRead = 0;
  unsigned long t0 = millis();

  while (remaining > 0 && client.connected()) {
    int toRead = min(remaining, (int)BUF_SIZE);
    int n = readBytes(client, buf, toRead);
    if (n <= 0) {
      Serial.println(F("Read stalled — aborting."));
      break;
    }
    tft.streamPixels(buf, n);
    remaining -= n;
    totalRead += n;
  }

  tft.endPixelStream();

  unsigned long elapsed = millis() - t0;
  Serial.print(F("Received "));
  Serial.print(totalRead);
  Serial.print(F(" bytes in "));
  Serial.print(elapsed);
  Serial.println(F(" ms"));

  if (remaining == 0) {
    sendSuccess(client, "Image displayed successfully");
  } else {
    sendError(client, 500, "Incomplete transfer");
  }
}

// ============================================================
// HTTP response helpers
// ============================================================

void sendCorsHeaders(WiFiClient& client) {
  client.println(F("Access-Control-Allow-Origin: *"));
  client.println(F("Access-Control-Allow-Methods: GET, POST, OPTIONS"));
  client.println(F("Access-Control-Allow-Headers: Content-Type"));
}

void sendCorsResponse(WiFiClient& client) {
  client.println(F("HTTP/1.1 204 No Content"));
  sendCorsHeaders(client);
  client.println(F("Connection: close"));
  client.println();
}

void sendSuccess(WiFiClient& client, const char* message) {
  String body = "{\"success\":true,\"message\":\"";
  body += message;
  body += "\"}";

  client.println(F("HTTP/1.1 200 OK"));
  client.println(F("Content-Type: application/json"));
  sendCorsHeaders(client);
  client.print(F("Content-Length: ")); client.println(body.length());
  client.println(F("Connection: close"));
  client.println();
  client.print(body);
}

void sendError(WiFiClient& client, int code, const char* message) {
  String body = "{\"success\":false,\"error\":\"";
  body += message;
  body += "\"}";

  client.print(F("HTTP/1.1 ")); client.print(code); client.println(F(" Error"));
  client.println(F("Content-Type: application/json"));
  sendCorsHeaders(client);
  client.print(F("Content-Length: ")); client.println(body.length());
  client.println(F("Connection: close"));
  client.println();
  client.print(body);
}

void sendStatusJson(WiFiClient& client) {
  IPAddress ip = WiFi.localIP();
  String body = "{\"device\":\"Arduino UNO R4 WiFi\","
                "\"display\":\"240x280 ST7789V2\","
                "\"ip\":\"";
  body += String(ip[0]) + "." + String(ip[1]) + "." + String(ip[2]) + "." + String(ip[3]);
  body += "\",\"rssi\":";
  body += String(WiFi.RSSI());
  body += ",\"uptime\":";
  body += String(millis() / 1000);
  body += "}";

  client.println(F("HTTP/1.1 200 OK"));
  client.println(F("Content-Type: application/json"));
  sendCorsHeaders(client);
  client.print(F("Content-Length: ")); client.println(body.length());
  client.println(F("Connection: close"));
  client.println();
  client.print(body);
}

void sendHomePage(WiFiClient& client) {
  String html = F(
    "<!DOCTYPE html><html><head><title>Arduino Display</title></head>"
    "<body style='font-family:sans-serif;padding:2em'>"
    "<h1>Arduino Display Server</h1>"
    "<p>240&times;280 ST7789V2 &mdash; Waveshare 1.69&quot; LCD</p>"
    "<p><code>POST /upload</code> &mdash; send 134400 bytes of raw RGB565</p>"
    "<p><code>GET /status</code> &mdash; JSON device info</p>"
    "</body></html>"
  );

  client.println(F("HTTP/1.1 200 OK"));
  client.println(F("Content-Type: text/html"));
  sendCorsHeaders(client);
  client.print(F("Content-Length: ")); client.println(html.length());
  client.println(F("Connection: close"));
  client.println();
  client.print(html);
}

void sendNotFound(WiFiClient& client) {
  sendError(client, 404, "Not found");
}
