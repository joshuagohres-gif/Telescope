// ============================================================
// Watch Face — Analog Clock for Waveshare 1.69" LCD (ST7789V2)
//
// Firmware for Arduino UNO R4 WiFi.
// Connects to WiFi, syncs real time via NTP, and displays
// a continuously-updating analog watch face with hour, minute,
// and second hands plus a digital readout.
//
// Wiring (same as image-server sketch):
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
#include <math.h>
#include "display_driver.h"

// =============  USER CONFIGURATION  =========================
const char WIFI_SSID[] = "YOUR_WIFI_SSID";
const char WIFI_PASS[] = "YOUR_WIFI_PASSWORD";

// Timezone offset from UTC in seconds.
// Examples: EST = -5*3600, CST = -6*3600, PST = -8*3600,
//           CET = +1*3600, JST = +9*3600
#define UTC_OFFSET_SEC  (-5 * 3600)
// ============================================================

// ---- Pin assignments (match your wiring) ----
#define PIN_CS   10
#define PIN_DC    7
#define PIN_RST   8
#define PIN_BL    9

DisplayDriver tft(PIN_CS, PIN_DC, PIN_RST, PIN_BL);

// ---- Clock face geometry ----
// Center of the analog dial and its radius.
// Display is 240 x 280; clock sits in the upper portion
// with digital readouts below.
#define CX          120       // center X
#define CY          125       // center Y
#define CLOCK_R     105       // outer radius

// Hand lengths (kept shorter than tick-mark inner radius
// so erasing never damages the dial markings)
#define HOUR_LEN     55
#define MIN_LEN      75
#define SEC_LEN      83
#define SEC_TAIL_LEN 18       // counterweight behind center

// Hand line widths
#define HOUR_W  4
#define MIN_W   3

// Center hub radius
#define HUB_R   5

// ---- RGB565 colour palette ----
#define COL_BG       0x0000   // black (outside face)
#define COL_FACE     0x10A2   // very dark grey (clock face fill)
#define COL_BEZEL    0xC618   // silver (outer ring)
#define COL_HMARK    0xFFFF   // white  (hour tick marks)
#define COL_MMARK    0x7BEF   // grey   (minute tick marks)
#define COL_HHAND    0xFFFF   // white  (hour hand)
#define COL_MHAND    0xDEFB   // light grey (minute hand)
#define COL_SHAND    0xF800   // red    (second hand)
#define COL_HUB      0xFFFF   // white  (center hub)
#define COL_HUB_DOT  0xF800   // red    (center dot)
#define COL_DIGITAL  0x07FF   // cyan   (digital time)
#define COL_DATE     0xBDF7   // light grey (date line)

// ---- NTP / timekeeping state ----
unsigned long ntpEpoch    = 0;     // seconds since Unix epoch at sync
unsigned long syncMillis  = 0;     // millis() when NTP was fetched
bool          ntpSynced   = false;
unsigned long lastSyncMs  = 0;     // when we last attempted NTP
#define NTP_RESYNC_MS  3600000UL   // re-sync once per hour

// ---- Previous-hand-position tracking (for erase) ----
struct HandTip { int16_t x, y; };

HandTip prevHourTip  = { -1, -1 };
HandTip prevMinTip   = { -1, -1 };
HandTip prevSecTip   = { -1, -1 };
HandTip prevSecTail  = { -1, -1 };
int     prevSecond   = -1;
int     prevMinute   = -1;

// ---- Date strings ----
static const char* const DOW_NAMES[] = {
  "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"
};
static const char* const MON_NAMES[] = {
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
};
static const uint8_t DAYS_IN_MONTH[] = {
  31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31
};

// ============================================================
// Forward declarations
// ============================================================
void syncNTP();
unsigned long currentEpoch();
void getTime(int& h, int& m, int& s);
void getDate(int& year, int& month, int& day, int& dow);
void drawClockFace();
void updateHands(int h, int m, int s);
void drawDigitalTime(int h, int m, int s);
void drawDateLine();
void drawThickLine(int16_t x0, int16_t y0, int16_t x1, int16_t y1,
                   uint8_t w, uint16_t color);
void handXY(float angle, int16_t len, int16_t& x, int16_t& y);

// ============================================================
// Setup
// ============================================================
void setup() {
  Serial.begin(115200);
  while (!Serial && millis() < 3000);
  Serial.println(F("Watch Face — starting"));

  // ---- Display init ----
  tft.begin();
  tft.fillScreen(COL_BG);
  tft.drawText(30, 120, "Connecting...", 0xFFFF, COL_BG, 2);

  // ---- WiFi ----
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  for (int i = 0; i < 30 && WiFi.status() != WL_CONNECTED; i++) {
    delay(1000);
    Serial.print('.');
  }
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println(F("\nWiFi failed"));
    tft.fillScreen(COL_BG);
    tft.drawText(20, 100, "WiFi Failed!", 0xF800, COL_BG, 2);
    tft.drawText(20, 135, "Check credentials", 0xFFFF, COL_BG, 1);
    tft.drawText(20, 150, "and restart.", 0xFFFF, COL_BG, 1);
    while (true) delay(1000);
  }
  Serial.println(F("\nWiFi connected"));

  // ---- NTP sync ----
  tft.fillScreen(COL_BG);
  tft.drawText(30, 120, "Syncing time...", 0xFFFF, COL_BG, 2);

  for (int i = 0; i < 10 && !ntpSynced; i++) {
    syncNTP();
    if (!ntpSynced) delay(1000);
  }
  if (!ntpSynced) {
    Serial.println(F("NTP failed — falling back to 12:00:00"));
    // Start at noon so the hands are visible in a useful position
    ntpEpoch   = 43200UL;   // 12:00:00 UTC
    syncMillis = millis();
    ntpSynced  = true;
  }

  // ---- Draw static clock face then first frame ----
  tft.fillScreen(COL_BG);
  drawClockFace();

  int h, m, s;
  getTime(h, m, s);
  updateHands(h, m, s);
  drawDigitalTime(h, m, s);
  drawDateLine();
  prevMinute = m;
}

// ============================================================
// Loop — poll once per ~50 ms, redraw on each new second
// ============================================================
void loop() {
  int h, m, s;
  getTime(h, m, s);

  if (s != prevSecond) {
    updateHands(h, m, s);
    drawDigitalTime(h, m, s);

    // Refresh date once per minute
    if (m != prevMinute) {
      drawDateLine();
      prevMinute = m;
    }
    prevSecond = s;
  }

  // Periodic NTP re-sync
  if (millis() - lastSyncMs > NTP_RESYNC_MS) {
    syncNTP();
  }

  delay(50);
}

// ============================================================
// NTP helpers
// ============================================================

void syncNTP() {
  unsigned long t = WiFi.getTime();
  if (t > 1000000000UL) {            // sanity: must be after ~2001
    ntpEpoch   = t;
    syncMillis = millis();
    ntpSynced  = true;
    Serial.print(F("NTP epoch: "));
    Serial.println(t);
  }
  lastSyncMs = millis();
}

unsigned long currentEpoch() {
  return ntpEpoch + (millis() - syncMillis) / 1000UL;
}

void getTime(int& h, int& m, int& s) {
  unsigned long epoch = currentEpoch();
  long local = (long)(epoch % 86400UL) + UTC_OFFSET_SEC;
  while (local < 0)      local += 86400L;
  while (local >= 86400L) local -= 86400L;
  h = local / 3600;
  m = (local % 3600) / 60;
  s = local % 60;
}

void getDate(int& year, int& month, int& day, int& dow) {
  unsigned long epoch = currentEpoch();
  unsigned long adjEpoch = epoch + UTC_OFFSET_SEC;
  unsigned long days = adjEpoch / 86400UL;

  dow = (days + 4) % 7;              // epoch day 0 = Thursday

  year = 1970;
  while (true) {
    bool leap = (year % 4 == 0 && (year % 100 != 0 || year % 400 == 0));
    unsigned int diy = leap ? 366 : 365;
    if (days < diy) break;
    days -= diy;
    year++;
  }

  bool leap = (year % 4 == 0 && (year % 100 != 0 || year % 400 == 0));
  month = 0;
  while (month < 12) {
    uint8_t dim = DAYS_IN_MONTH[month];
    if (month == 1 && leap) dim = 29;
    if (days < dim) break;
    days -= dim;
    month++;
  }
  day = days + 1;
}

// ============================================================
// Static clock face — drawn once at startup
// ============================================================

void drawClockFace() {
  // Filled circle for the face background
  tft.fillCircle(CX, CY, CLOCK_R, COL_FACE);

  // Bezel ring (3-pixel-wide silver border)
  tft.drawCircle(CX, CY, CLOCK_R,     COL_BEZEL);
  tft.drawCircle(CX, CY, CLOCK_R - 1, COL_BEZEL);
  tft.drawCircle(CX, CY, CLOCK_R + 1, COL_BEZEL);

  // Minute tick marks — small lines at r = 95..100
  for (int i = 0; i < 60; i++) {
    if (i % 5 == 0) continue;        // skip hour positions
    float a = i * 2.0f * M_PI / 60.0f;
    float sa = sinf(a), ca = cosf(a);
    int16_t ix = CX + (int16_t)(95.0f * sa);
    int16_t iy = CY - (int16_t)(95.0f * ca);
    int16_t ox = CX + (int16_t)(100.0f * sa);
    int16_t oy = CY - (int16_t)(100.0f * ca);
    tft.drawLine(ix, iy, ox, oy, COL_MMARK);
  }

  // Hour tick marks — thicker lines at r = 85..100
  for (int i = 0; i < 12; i++) {
    float a = i * 2.0f * M_PI / 12.0f;
    float sa = sinf(a), ca = cosf(a);
    int16_t ix = CX + (int16_t)(85.0f * sa);
    int16_t iy = CY - (int16_t)(85.0f * ca);
    int16_t ox = CX + (int16_t)(100.0f * sa);
    int16_t oy = CY - (int16_t)(100.0f * ca);
    // Cardinal hours (12, 3, 6, 9) get a wider mark
    drawThickLine(ix, iy, ox, oy, (i % 3 == 0) ? 3 : 2, COL_HMARK);
  }
}

// ============================================================
// Hand update — erase previous, draw current
// ============================================================

// Compute a hand-tip position from an angle (0 = 12 o'clock, CW)
void handXY(float angle, int16_t len, int16_t& x, int16_t& y) {
  x = CX + (int16_t)(len * sinf(angle));
  y = CY - (int16_t)(len * cosf(angle));
}

// Draw a line with a given pixel width using parallel offsets
void drawThickLine(int16_t x0, int16_t y0, int16_t x1, int16_t y1,
                   uint8_t w, uint16_t color) {
  if (w <= 1) {
    tft.drawLine(x0, y0, x1, y1, color);
    return;
  }
  float dx  = x1 - x0;
  float dy  = y1 - y0;
  float len = sqrtf(dx * dx + dy * dy);
  if (len < 0.5f) { tft.drawPixel(x0, y0, color); return; }

  // Perpendicular unit vector
  float px = -dy / len;
  float py =  dx / len;

  int half = w / 2;
  for (int i = -half; i <= half; i++) {
    int16_t ox = (int16_t)(i * px);
    int16_t oy = (int16_t)(i * py);
    tft.drawLine(x0 + ox, y0 + oy, x1 + ox, y1 + oy, color);
  }
}

void updateHands(int h, int m, int s) {
  // ---- Compute angles ----
  // Hour hand advances smoothly with minutes
  float hAngle = ((h % 12) + m / 60.0f) * 2.0f * M_PI / 12.0f;
  // Minute hand advances smoothly with seconds
  float mAngle = (m + s / 60.0f) * 2.0f * M_PI / 60.0f;
  // Second hand jumps each second (quartz-style)
  float sAngle = s * 2.0f * M_PI / 60.0f;

  // ---- Compute new tip positions ----
  HandTip newHour, newMin, newSec, newTail;
  handXY(hAngle,           HOUR_LEN,     newHour.x, newHour.y);
  handXY(mAngle,           MIN_LEN,      newMin.x,  newMin.y);
  handXY(sAngle,           SEC_LEN,      newSec.x,  newSec.y);
  handXY(sAngle + M_PI,    SEC_TAIL_LEN, newTail.x, newTail.y);

  // ---- Erase old hands (draw in face colour) ----
  // Erase top-to-bottom: second, minute, hour
  if (prevSecTip.x >= 0) {
    tft.drawLine(CX, CY, prevSecTip.x,  prevSecTip.y,  COL_FACE);
    tft.drawLine(CX, CY, prevSecTail.x, prevSecTail.y, COL_FACE);
  }
  if (prevMinTip.x >= 0)
    drawThickLine(CX, CY, prevMinTip.x, prevMinTip.y, MIN_W, COL_FACE);
  if (prevHourTip.x >= 0)
    drawThickLine(CX, CY, prevHourTip.x, prevHourTip.y, HOUR_W, COL_FACE);

  // ---- Draw new hands bottom-to-top: hour, minute, second ----
  drawThickLine(CX, CY, newHour.x, newHour.y, HOUR_W, COL_HHAND);
  drawThickLine(CX, CY, newMin.x,  newMin.y,  MIN_W,  COL_MHAND);
  tft.drawLine(CX, CY, newSec.x,  newSec.y,  COL_SHAND);
  tft.drawLine(CX, CY, newTail.x, newTail.y, COL_SHAND);

  // ---- Center hub ----
  tft.fillCircle(CX, CY, HUB_R, COL_HUB);
  tft.fillCircle(CX, CY, 2,     COL_HUB_DOT);

  // ---- Store state for next erase ----
  prevHourTip = newHour;
  prevMinTip  = newMin;
  prevSecTip  = newSec;
  prevSecTail = newTail;
}

// ============================================================
// Digital time — HH:MM:SS centred below the clock face
// ============================================================

void drawDigitalTime(int h, int m, int s) {
  char buf[12];
  snprintf(buf, sizeof(buf), "%02d:%02d:%02d", h, m, s);
  // Size 2 → 12 px per char, 8 chars = 96 px → x = (240-96)/2 = 72
  tft.drawText(72, 242, buf, COL_DIGITAL, COL_BG, 2);
}

// ============================================================
// Date line — "Wed Mar 02" centred below digital time
// ============================================================

void drawDateLine() {
  int year, month, day, dow;
  getDate(year, month, day, dow);

  char buf[20];
  snprintf(buf, sizeof(buf), "%s %s %02d", DOW_NAMES[dow], MON_NAMES[month], day);

  // Size 1 → 6 px per char; centre the string
  int len = strlen(buf);
  int px  = (SCREEN_WIDTH - len * 6) / 2;

  // Clear date area then draw
  tft.fillRect(0, 264, SCREEN_WIDTH, 10, COL_BG);
  tft.drawText(px, 265, buf, COL_DATE, COL_BG, 1);
}
