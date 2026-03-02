// ============================================================
// Arduino Display Manager — frontend
//
// Handles image selection, resize to 240x280, RGB565 conversion,
// and upload to the Express proxy which forwards to the Arduino.
// ============================================================

const DISPLAY_WIDTH = 240;
const DISPLAY_HEIGHT = 280;

// ── DOM elements ────────────────────────────────────────────
const dropZone = document.getElementById("drop-zone");
const fileInput = document.getElementById("file-input");
const browseBtn = document.getElementById("browse-btn");
const previewSection = document.getElementById("preview-section");
const previewCanvas = document.getElementById("preview-canvas");
const sendBtn = document.getElementById("send-btn");
const arduinoIpInput = document.getElementById("arduino-ip");
const checkBtn = document.getElementById("check-btn");
const connectionStatus = document.getElementById("connection-status");
const fitModeSelect = document.getElementById("fit-mode");
const statusBar = document.getElementById("status-bar");

// ── State ───────────────────────────────────────────────────
let rgb565Data = null; // Uint8Array, ready to POST
let originalFile = null; // keep for re-processing on fit-mode change

// ── Persist IP in localStorage ──────────────────────────────
arduinoIpInput.value = localStorage.getItem("arduino-ip") || "";
arduinoIpInput.addEventListener("input", () => {
  localStorage.setItem("arduino-ip", arduinoIpInput.value.trim());
});

// ── Check connection ────────────────────────────────────────
checkBtn.addEventListener("click", async () => {
  const ip = arduinoIpInput.value.trim();
  if (!ip) {
    setConnectionStatus("Enter an IP address first", "error");
    return;
  }

  setConnectionStatus("Checking...", "pending");
  try {
    const res = await fetch(`/api/check?ip=${encodeURIComponent(ip)}`);
    const data = await res.json();
    if (res.ok) {
      setConnectionStatus(
        `Connected: ${data.device}  (RSSI ${data.rssi} dBm)`,
        "success"
      );
    } else {
      setConnectionStatus(data.error || "Unknown error", "error");
    }
  } catch (err) {
    setConnectionStatus(`Failed: ${err.message}`, "error");
  }
});

// ── File selection ──────────────────────────────────────────
browseBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (e) => {
  if (e.target.files[0]) handleFile(e.target.files[0]);
});

// ── Drag & drop ─────────────────────────────────────────────
dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});
dropZone.addEventListener("dragleave", () =>
  dropZone.classList.remove("dragover")
);
dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith("image/")) handleFile(file);
});

// ── Re-process when fit mode changes ────────────────────────
fitModeSelect.addEventListener("change", () => {
  if (originalFile) handleFile(originalFile);
});

// ── Process the selected image ──────────────────────────────
function handleFile(file) {
  originalFile = file;
  const reader = new FileReader();

  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const ctx = previewCanvas.getContext("2d");
      const mode = fitModeSelect.value;

      // Clear to black
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, DISPLAY_WIDTH, DISPLAY_HEIGHT);

      // Source & destination rectangles
      let sx = 0,
        sy = 0,
        sw = img.width,
        sh = img.height;
      let dx = 0,
        dy = 0,
        dw = DISPLAY_WIDTH,
        dh = DISPLAY_HEIGHT;

      if (mode === "contain") {
        const scale = Math.min(
          DISPLAY_WIDTH / img.width,
          DISPLAY_HEIGHT / img.height
        );
        dw = Math.round(img.width * scale);
        dh = Math.round(img.height * scale);
        dx = Math.round((DISPLAY_WIDTH - dw) / 2);
        dy = Math.round((DISPLAY_HEIGHT - dh) / 2);
      } else if (mode === "cover") {
        const scale = Math.max(
          DISPLAY_WIDTH / img.width,
          DISPLAY_HEIGHT / img.height
        );
        sw = Math.round(DISPLAY_WIDTH / scale);
        sh = Math.round(DISPLAY_HEIGHT / scale);
        sx = Math.round((img.width - sw) / 2);
        sy = Math.round((img.height - sh) / 2);
      }
      // "fill" uses defaults (stretch)

      ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);

      // Convert to big-endian RGB565
      const imageData = ctx.getImageData(0, 0, DISPLAY_WIDTH, DISPLAY_HEIGHT);
      rgb565Data = convertToRGB565(imageData.data);

      // Show preview
      previewSection.style.display = "";
      sendBtn.disabled = false;
      setStatus("Image processed — ready to send.", "info");
    };

    img.src = e.target.result;
  };

  reader.readAsDataURL(file);
}

// ── RGBA -> big-endian RGB565 ───────────────────────────────
function convertToRGB565(rgba) {
  const total = DISPLAY_WIDTH * DISPLAY_HEIGHT;
  const buf = new ArrayBuffer(total * 2);
  const view = new DataView(buf);

  for (let i = 0; i < total; i++) {
    const off = i * 4;
    const r5 = (rgba[off] >> 3) & 0x1f;
    const g6 = (rgba[off + 1] >> 2) & 0x3f;
    const b5 = (rgba[off + 2] >> 3) & 0x1f;
    // ST7789 expects MSB first
    view.setUint16(i * 2, (r5 << 11) | (g6 << 5) | b5, false);
  }

  return new Uint8Array(buf);
}

// ── Send to Arduino via server proxy ────────────────────────
sendBtn.addEventListener("click", async () => {
  const ip = arduinoIpInput.value.trim();
  if (!ip) {
    setStatus("Enter the Arduino IP address first.", "error");
    return;
  }
  if (!rgb565Data) {
    setStatus("No image loaded.", "error");
    return;
  }

  sendBtn.disabled = true;
  setStatus("Sending image to display...", "pending");

  try {
    const res = await fetch(`/api/send?ip=${encodeURIComponent(ip)}`, {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: rgb565Data,
    });

    const data = await res.json();

    if (res.ok && data.success) {
      setStatus("Image sent successfully!", "success");
    } else {
      setStatus(data.error || data.message || "Unknown error", "error");
    }
  } catch (err) {
    setStatus(`Failed: ${err.message}`, "error");
  } finally {
    sendBtn.disabled = false;
  }
});

// ── UI helpers ──────────────────────────────────────────────
function setConnectionStatus(text, type) {
  connectionStatus.textContent = text;
  connectionStatus.className = `status ${type}`;
}

function setStatus(text, type) {
  statusBar.textContent = text;
  statusBar.className = `status-bar ${type || "info"}`;
  statusBar.style.display = "block";
}
