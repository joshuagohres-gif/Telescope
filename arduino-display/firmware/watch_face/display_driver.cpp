#include "display_driver.h"
#include <math.h>

// ============================================================
// 5x7 pixel font — printable ASCII characters 32..126
// Each character is 5 bytes (columns), each bit is a row.
// ============================================================
static const uint8_t font5x7[] PROGMEM = {
  0x00,0x00,0x00,0x00,0x00, //   (32)
  0x00,0x00,0x5F,0x00,0x00, // ! (33)
  0x00,0x07,0x00,0x07,0x00, // " (34)
  0x14,0x7F,0x14,0x7F,0x14, // # (35)
  0x24,0x2A,0x7F,0x2A,0x12, // $ (36)
  0x23,0x13,0x08,0x64,0x62, // % (37)
  0x36,0x49,0x55,0x22,0x50, // & (38)
  0x00,0x05,0x03,0x00,0x00, // ' (39)
  0x00,0x1C,0x22,0x41,0x00, // ( (40)
  0x00,0x41,0x22,0x1C,0x00, // ) (41)
  0x08,0x2A,0x1C,0x2A,0x08, // * (42)
  0x08,0x08,0x3E,0x08,0x08, // + (43)
  0x00,0x50,0x30,0x00,0x00, // , (44)
  0x08,0x08,0x08,0x08,0x08, // - (45)
  0x00,0x60,0x60,0x00,0x00, // . (46)
  0x20,0x10,0x08,0x04,0x02, // / (47)
  0x3E,0x51,0x49,0x45,0x3E, // 0 (48)
  0x00,0x42,0x7F,0x40,0x00, // 1 (49)
  0x42,0x61,0x51,0x49,0x46, // 2 (50)
  0x21,0x41,0x45,0x4B,0x31, // 3 (51)
  0x18,0x14,0x12,0x7F,0x10, // 4 (52)
  0x27,0x45,0x45,0x45,0x39, // 5 (53)
  0x3C,0x4A,0x49,0x49,0x30, // 6 (54)
  0x01,0x71,0x09,0x05,0x03, // 7 (55)
  0x36,0x49,0x49,0x49,0x36, // 8 (56)
  0x06,0x49,0x49,0x29,0x1E, // 9 (57)
  0x00,0x36,0x36,0x00,0x00, // : (58)
  0x00,0x56,0x36,0x00,0x00, // ; (59)
  0x00,0x08,0x14,0x22,0x41, // < (60)
  0x14,0x14,0x14,0x14,0x14, // = (61)
  0x41,0x22,0x14,0x08,0x00, // > (62)
  0x02,0x01,0x51,0x09,0x06, // ? (63)
  0x32,0x49,0x79,0x41,0x3E, // @ (64)
  0x7E,0x11,0x11,0x11,0x7E, // A (65)
  0x7F,0x49,0x49,0x49,0x36, // B (66)
  0x3E,0x41,0x41,0x41,0x22, // C (67)
  0x7F,0x41,0x41,0x22,0x1C, // D (68)
  0x7F,0x49,0x49,0x49,0x41, // E (69)
  0x7F,0x09,0x09,0x01,0x01, // F (70)
  0x3E,0x41,0x41,0x51,0x32, // G (71)
  0x7F,0x08,0x08,0x08,0x7F, // H (72)
  0x00,0x41,0x7F,0x41,0x00, // I (73)
  0x20,0x40,0x41,0x3F,0x01, // J (74)
  0x7F,0x08,0x14,0x22,0x41, // K (75)
  0x7F,0x40,0x40,0x40,0x40, // L (76)
  0x7F,0x02,0x04,0x02,0x7F, // M (77)
  0x7F,0x04,0x08,0x10,0x7F, // N (78)
  0x3E,0x41,0x41,0x41,0x3E, // O (79)
  0x7F,0x09,0x09,0x09,0x06, // P (80)
  0x3E,0x41,0x51,0x21,0x5E, // Q (81)
  0x7F,0x09,0x19,0x29,0x46, // R (82)
  0x46,0x49,0x49,0x49,0x31, // S (83)
  0x01,0x01,0x7F,0x01,0x01, // T (84)
  0x3F,0x40,0x40,0x40,0x3F, // U (85)
  0x1F,0x20,0x40,0x20,0x1F, // V (86)
  0x7F,0x20,0x18,0x20,0x7F, // W (87)
  0x63,0x14,0x08,0x14,0x63, // X (88)
  0x03,0x04,0x78,0x04,0x03, // Y (89)
  0x61,0x51,0x49,0x45,0x43, // Z (90)
  0x00,0x00,0x7F,0x41,0x41, // [ (91)
  0x02,0x04,0x08,0x10,0x20, // \ (92)
  0x41,0x41,0x7F,0x00,0x00, // ] (93)
  0x04,0x02,0x01,0x02,0x04, // ^ (94)
  0x40,0x40,0x40,0x40,0x40, // _ (95)
  0x00,0x01,0x02,0x04,0x00, // ` (96)
  0x20,0x54,0x54,0x54,0x78, // a (97)
  0x7F,0x48,0x44,0x44,0x38, // b (98)
  0x38,0x44,0x44,0x44,0x20, // c (99)
  0x38,0x44,0x44,0x48,0x7F, // d (100)
  0x38,0x54,0x54,0x54,0x18, // e (101)
  0x08,0x7E,0x09,0x01,0x02, // f (102)
  0x08,0x14,0x54,0x54,0x3C, // g (103)
  0x7F,0x08,0x04,0x04,0x78, // h (104)
  0x00,0x44,0x7D,0x40,0x00, // i (105)
  0x20,0x40,0x44,0x3D,0x00, // j (106)
  0x00,0x7F,0x10,0x28,0x44, // k (107)
  0x00,0x41,0x7F,0x40,0x00, // l (108)
  0x7C,0x04,0x18,0x04,0x78, // m (109)
  0x7C,0x08,0x04,0x04,0x78, // n (110)
  0x38,0x44,0x44,0x44,0x38, // o (111)
  0x7C,0x14,0x14,0x14,0x08, // p (112)
  0x08,0x14,0x14,0x18,0x7C, // q (113)
  0x7C,0x08,0x04,0x04,0x08, // r (114)
  0x48,0x54,0x54,0x54,0x20, // s (115)
  0x04,0x3F,0x44,0x40,0x20, // t (116)
  0x3C,0x40,0x40,0x20,0x7C, // u (117)
  0x1C,0x20,0x40,0x20,0x1C, // v (118)
  0x3C,0x40,0x30,0x40,0x3C, // w (119)
  0x44,0x28,0x10,0x28,0x44, // x (120)
  0x0C,0x50,0x50,0x50,0x3C, // y (121)
  0x44,0x64,0x54,0x4C,0x44, // z (122)
  0x00,0x08,0x36,0x41,0x00, // { (123)
  0x00,0x00,0x7F,0x00,0x00, // | (124)
  0x00,0x41,0x36,0x08,0x00, // } (125)
  0x10,0x08,0x08,0x10,0x08, // ~ (126)
};

// ============================================================
// Constructor
// ============================================================

DisplayDriver::DisplayDriver(uint8_t cs, uint8_t dc, uint8_t rst, uint8_t bl)
  : _cs(cs), _dc(dc), _rst(rst), _bl(bl),
    _spiSettings(20000000, MSBFIRST, SPI_MODE0) {}

// ============================================================
// Low-level SPI helpers
// ============================================================

void DisplayDriver::writeCommand(uint8_t cmd) {
  digitalWrite(_dc, LOW);
  SPI.beginTransaction(_spiSettings);
  digitalWrite(_cs, LOW);
  SPI.transfer(cmd);
  digitalWrite(_cs, HIGH);
  SPI.endTransaction();
}

void DisplayDriver::writeData(uint8_t data) {
  digitalWrite(_dc, HIGH);
  SPI.beginTransaction(_spiSettings);
  digitalWrite(_cs, LOW);
  SPI.transfer(data);
  digitalWrite(_cs, HIGH);
  SPI.endTransaction();
}

void DisplayDriver::writeData16(uint16_t data) {
  digitalWrite(_dc, HIGH);
  SPI.beginTransaction(_spiSettings);
  digitalWrite(_cs, LOW);
  SPI.transfer(data >> 8);
  SPI.transfer(data & 0xFF);
  digitalWrite(_cs, HIGH);
  SPI.endTransaction();
}

// ============================================================
// ST7789V2 initialization sequence
// ============================================================

void DisplayDriver::initDisplay() {
  // Hardware reset
  digitalWrite(_rst, HIGH);
  delay(10);
  digitalWrite(_rst, LOW);
  delay(10);
  digitalWrite(_rst, HIGH);
  delay(120);

  // Software reset
  writeCommand(0x01);
  delay(120);

  // Sleep out
  writeCommand(0x11);
  delay(120);

  // Memory Data Access Control — portrait orientation
  writeCommand(0x36);
  writeData(0x00);

  // Interface Pixel Format — 16-bit RGB565
  writeCommand(0x3A);
  writeData(0x05);

  // Porch Setting
  writeCommand(0xB2);
  writeData(0x0C);
  writeData(0x0C);
  writeData(0x00);
  writeData(0x33);
  writeData(0x33);

  // Gate Control
  writeCommand(0xB7);
  writeData(0x35);

  // VCOM Setting
  writeCommand(0xBB);
  writeData(0x19);

  // LCM Control
  writeCommand(0xC0);
  writeData(0x2C);

  // VDV and VRH Command Enable
  writeCommand(0xC2);
  writeData(0x01);

  // VRH Set
  writeCommand(0xC3);
  writeData(0x12);

  // VDV Set
  writeCommand(0xC4);
  writeData(0x20);

  // Frame Rate Control — 60 Hz
  writeCommand(0xC6);
  writeData(0x0F);

  // Power Control 1
  writeCommand(0xD0);
  writeData(0xA4);
  writeData(0xA1);

  // Positive Voltage Gamma Control
  writeCommand(0xE0);
  writeData(0xD0); writeData(0x04); writeData(0x0D); writeData(0x11);
  writeData(0x13); writeData(0x2B); writeData(0x3F); writeData(0x54);
  writeData(0x4C); writeData(0x18); writeData(0x0D); writeData(0x0B);
  writeData(0x1F); writeData(0x23);

  // Negative Voltage Gamma Control
  writeCommand(0xE1);
  writeData(0xD0); writeData(0x04); writeData(0x0C); writeData(0x11);
  writeData(0x13); writeData(0x2C); writeData(0x3F); writeData(0x44);
  writeData(0x51); writeData(0x2F); writeData(0x1F); writeData(0x1F);
  writeData(0x20); writeData(0x23);

  // Display Inversion On (required for correct colors on this panel)
  writeCommand(0x21);

  // Display On
  writeCommand(0x29);
}

// ============================================================
// Public API
// ============================================================

void DisplayDriver::begin() {
  pinMode(_cs,  OUTPUT);
  pinMode(_dc,  OUTPUT);
  pinMode(_rst, OUTPUT);
  pinMode(_bl,  OUTPUT);

  digitalWrite(_cs, HIGH);
  digitalWrite(_dc, HIGH);
  digitalWrite(_rst, HIGH);

  SPI.begin();
  initDisplay();
  setBacklight(255);
}

void DisplayDriver::setBacklight(uint8_t brightness) {
  analogWrite(_bl, brightness);
}

void DisplayDriver::setWindow(uint16_t x0, uint16_t y0, uint16_t x1, uint16_t y1) {
  // Column address set
  writeCommand(0x2A);
  writeData16(x0 + X_OFFSET);
  writeData16(x1 + X_OFFSET);

  // Row address set
  writeCommand(0x2B);
  writeData16(y0 + Y_OFFSET);
  writeData16(y1 + Y_OFFSET);

  // Memory write
  writeCommand(0x2C);
}

void DisplayDriver::fillScreen(uint16_t color) {
  setWindow(0, 0, SCREEN_WIDTH - 1, SCREEN_HEIGHT - 1);

  uint8_t hi = color >> 8;
  uint8_t lo = color & 0xFF;

  digitalWrite(_dc, HIGH);
  SPI.beginTransaction(_spiSettings);
  digitalWrite(_cs, LOW);

  for (uint32_t i = 0; i < (uint32_t)SCREEN_WIDTH * SCREEN_HEIGHT; i++) {
    SPI.transfer(hi);
    SPI.transfer(lo);
  }

  digitalWrite(_cs, HIGH);
  SPI.endTransaction();
}

void DisplayDriver::drawPixel(uint16_t x, uint16_t y, uint16_t color) {
  if (x >= SCREEN_WIDTH || y >= SCREEN_HEIGHT) return;
  setWindow(x, y, x, y);
  writeData16(color);
}

void DisplayDriver::fillRect(uint16_t x, uint16_t y, uint16_t w, uint16_t h, uint16_t color) {
  if (x >= SCREEN_WIDTH || y >= SCREEN_HEIGHT) return;
  if (x + w > SCREEN_WIDTH)  w = SCREEN_WIDTH  - x;
  if (y + h > SCREEN_HEIGHT) h = SCREEN_HEIGHT - y;

  setWindow(x, y, x + w - 1, y + h - 1);

  uint8_t hi = color >> 8;
  uint8_t lo = color & 0xFF;

  digitalWrite(_dc, HIGH);
  SPI.beginTransaction(_spiSettings);
  digitalWrite(_cs, LOW);

  for (uint32_t i = 0; i < (uint32_t)w * h; i++) {
    SPI.transfer(hi);
    SPI.transfer(lo);
  }

  digitalWrite(_cs, HIGH);
  SPI.endTransaction();
}

// ============================================================
// Streaming pixel data — used by the image upload handler
// ============================================================

void DisplayDriver::beginPixelStream() {
  digitalWrite(_dc, HIGH);
  SPI.beginTransaction(_spiSettings);
  digitalWrite(_cs, LOW);
}

void DisplayDriver::streamPixels(const uint8_t* data, size_t len) {
  SPI.transfer(data, len);
}

void DisplayDriver::endPixelStream() {
  digitalWrite(_cs, HIGH);
  SPI.endTransaction();
}

// ============================================================
// Text rendering with built-in 5x7 font
// ============================================================

void DisplayDriver::drawChar(uint16_t x, uint16_t y, char c, uint16_t color, uint16_t bg, uint8_t size) {
  if (c < 32 || c > 126) c = '?';
  uint16_t idx = (c - 32) * 5;

  for (uint8_t col = 0; col < 5; col++) {
    uint8_t line = pgm_read_byte(&font5x7[idx + col]);
    for (uint8_t row = 0; row < 7; row++) {
      uint16_t px = (line & (1 << row)) ? color : bg;
      if (size == 1) {
        drawPixel(x + col, y + row, px);
      } else {
        fillRect(x + col * size, y + row * size, size, size, px);
      }
    }
  }

  // 1-pixel gap between characters
  if (size == 1) {
    for (uint8_t row = 0; row < 7; row++) drawPixel(x + 5, y + row, bg);
  } else {
    fillRect(x + 5 * size, y, size, 7 * size, bg);
  }
}

void DisplayDriver::drawText(uint16_t x, uint16_t y, const char* text,
                             uint16_t color, uint16_t bg, uint8_t size) {
  uint16_t cursorX = x;
  while (*text) {
    if (cursorX + 6 * size > SCREEN_WIDTH) break; // clip at right edge
    drawChar(cursorX, y, *text, color, bg, size);
    cursorX += 6 * size;
    text++;
  }
}

// ============================================================
// Line drawing — Bresenham's algorithm
// ============================================================

void DisplayDriver::drawLine(int16_t x0, int16_t y0, int16_t x1, int16_t y1, uint16_t color) {
  bool steep = abs(y1 - y0) > abs(x1 - x0);
  int16_t tmp;

  if (steep) {
    tmp = x0; x0 = y0; y0 = tmp;
    tmp = x1; x1 = y1; y1 = tmp;
  }
  if (x0 > x1) {
    tmp = x0; x0 = x1; x1 = tmp;
    tmp = y0; y0 = y1; y1 = tmp;
  }

  int16_t dx = x1 - x0;
  int16_t dy = abs(y1 - y0);
  int16_t err = dx / 2;
  int16_t ystep = (y0 < y1) ? 1 : -1;

  for (; x0 <= x1; x0++) {
    if (steep)
      drawPixel(y0, x0, color);
    else
      drawPixel(x0, y0, color);
    err -= dy;
    if (err < 0) {
      y0 += ystep;
      err += dx;
    }
  }
}

// ============================================================
// Circle drawing — midpoint algorithm
// ============================================================

void DisplayDriver::drawCircle(int16_t cx, int16_t cy, int16_t r, uint16_t color) {
  int16_t x = 0, y = r;
  int16_t d = 1 - r;

  while (x <= y) {
    drawPixel(cx + x, cy + y, color);
    drawPixel(cx - x, cy + y, color);
    drawPixel(cx + x, cy - y, color);
    drawPixel(cx - x, cy - y, color);
    drawPixel(cx + y, cy + x, color);
    drawPixel(cx - y, cy + x, color);
    drawPixel(cx + y, cy - x, color);
    drawPixel(cx - y, cy - x, color);

    if (d < 0) {
      d += 2 * x + 3;
    } else {
      d += 2 * (x - y) + 5;
      y--;
    }
    x++;
  }
}

// ============================================================
// Filled circle — scan-line approach using fillRect for speed
// ============================================================

void DisplayDriver::fillCircle(int16_t cx, int16_t cy, int16_t r, uint16_t color) {
  for (int16_t dy = -r; dy <= r; dy++) {
    int16_t py = cy + dy;
    if (py < 0 || py >= SCREEN_HEIGHT) continue;

    int16_t xspan = (int16_t)sqrtf((float)r * r - (float)dy * dy);
    int16_t px0 = cx - xspan;
    int16_t px1 = cx + xspan;

    // Clip to screen
    if (px0 < 0) px0 = 0;
    if (px1 >= SCREEN_WIDTH) px1 = SCREEN_WIDTH - 1;
    if (px0 > px1) continue;

    fillRect(px0, py, px1 - px0 + 1, 1, color);
  }
}
