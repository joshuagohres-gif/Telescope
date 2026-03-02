# Arduino Display Manager

Upload images from a web browser to a **Waveshare 1.69" LCD** (240 x 280, ST7789V2)
connected to an **Arduino UNO R4 WiFi**.

```
┌──────────┐      WiFi / HTTP       ┌──────────────┐   SPI   ┌───────────┐
│  Web App │  ──────────────────▶   │ Arduino R4   │ ──────▶ │ 1.69" LCD │
│ (browser)│  RGB565 image data     │   WiFi       │         │  240x280  │
└──────────┘                        └──────────────┘         └───────────┘
```

## Hardware

| Component | Notes |
|-----------|-------|
| Arduino UNO R4 WiFi | Any R4 WiFi board |
| Waveshare 1.69" LCD Module | ST7789V2, 240x280, SPI, 8-pin header |
| Jumper wires | 8 wires (female-to-male or male-to-male depending on headers) |

### Wiring

| LCD Pin | Arduino Pin | Function |
|---------|-------------|----------|
| VCC | 5 V | Power |
| GND | GND | Ground |
| DIN | D11 | SPI MOSI |
| CLK | D13 | SPI SCK |
| CS | D10 | Chip select |
| DC | D7 | Data / Command |
| RST | D8 | Reset |
| BL | D9 | Backlight (PWM) |

## Firmware Setup

1. Install the **Arduino IDE** (2.x recommended).
2. Install the **Arduino UNO R4 Boards** package via Boards Manager.
3. Open `firmware/arduino_display/arduino_display.ino`.
4. Edit the WiFi credentials at the top of the file:
   ```cpp
   const char WIFI_SSID[] = "YOUR_WIFI_SSID";
   const char WIFI_PASS[] = "YOUR_WIFI_PASSWORD";
   ```
5. Select **Arduino UNO R4 WiFi** as the board and the correct port.
6. Upload.

On boot the display will show the device's IP address once WiFi connects.

## Web App Setup

```bash
cd webapp
npm install
npm start
```

Open `http://localhost:3000` in your browser.

## Usage

1. Enter the Arduino's IP address (shown on the LCD after boot) into the web app.
2. Click **Check** to verify connectivity.
3. Drag-and-drop (or browse for) an image file.
4. Choose a fit mode:
   - **Contain** — scales the image to fit inside 240x280, letterboxing with black.
   - **Cover** — scales to fill 240x280, cropping excess.
   - **Stretch** — distorts to exactly 240x280.
5. Click **Send to Display**.

The image is converted to RGB565 in the browser, sent through the Express proxy
to the Arduino, and streamed directly to the display over SPI.

## Architecture

- **Firmware** (`firmware/arduino_display/`)
  - `display_driver.h/.cpp` — Custom ST7789V2 SPI driver with text rendering.
  - `arduino_display.ino` — WiFi connection, HTTP server, image streaming.
- **Web App** (`webapp/`)
  - `server.js` — Express server that serves the UI and proxies uploads to the Arduino.
  - `public/` — Single-page frontend with drag-and-drop upload, Canvas-based
    image processing, and RGB565 conversion.

### Endpoints (Arduino)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Simple HTML info page |
| `GET` | `/status` | JSON device status (IP, RSSI, uptime) |
| `POST` | `/upload` | Accepts exactly 134 400 bytes of raw RGB565 |
| `OPTIONS` | `*` | CORS preflight |

### Endpoints (Web App)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Serves the frontend |
| `GET` | `/api/check?ip=` | Proxies `GET /status` to the Arduino |
| `POST` | `/api/send?ip=` | Proxies RGB565 payload to `POST /upload` |
