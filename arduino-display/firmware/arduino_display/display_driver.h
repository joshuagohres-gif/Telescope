#ifndef DISPLAY_DRIVER_H
#define DISPLAY_DRIVER_H

#include <Arduino.h>
#include <SPI.h>

// Display dimensions for Waveshare 1.69" LCD
#define SCREEN_WIDTH  240
#define SCREEN_HEIGHT 280

// Memory offsets (ST7789V2 has 240x320 RAM, panel is 240x280)
#define X_OFFSET 0
#define Y_OFFSET 20

class DisplayDriver {
public:
  DisplayDriver(uint8_t cs, uint8_t dc, uint8_t rst, uint8_t bl);

  void begin();
  void setBacklight(uint8_t brightness);
  void fillScreen(uint16_t color);
  void drawPixel(uint16_t x, uint16_t y, uint16_t color);
  void fillRect(uint16_t x, uint16_t y, uint16_t w, uint16_t h, uint16_t color);
  void drawChar(uint16_t x, uint16_t y, char c, uint16_t color, uint16_t bg, uint8_t size);
  void drawText(uint16_t x, uint16_t y, const char* text, uint16_t color, uint16_t bg = 0x0000, uint8_t size = 1);

  // Set the active drawing window
  void setWindow(uint16_t x0, uint16_t y0, uint16_t x1, uint16_t y1);

  // Streaming pixel data (for image upload)
  void beginPixelStream();
  void streamPixels(const uint8_t* data, size_t len);
  void endPixelStream();

private:
  uint8_t _cs, _dc, _rst, _bl;
  SPISettings _spiSettings;

  void writeCommand(uint8_t cmd);
  void writeData(uint8_t data);
  void writeData16(uint16_t data);
  void initDisplay();
};

#endif
