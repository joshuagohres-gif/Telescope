const express = require("express");
const http = require("http");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Serve the frontend
app.use(express.static(path.join(__dirname, "public")));

// ------------------------------------------------------------------
// POST /api/send?ip=<arduino-ip>
// Body: raw RGB565 binary (134 400 bytes)
// Proxies the payload to the Arduino's POST /upload endpoint.
// ------------------------------------------------------------------
app.post(
  "/api/send",
  express.raw({ type: "application/octet-stream", limit: "500kb" }),
  async (req, res) => {
    const arduinoIp = req.query.ip;
    if (!arduinoIp) {
      return res.status(400).json({ error: "Missing ?ip= query parameter" });
    }

    const expectedSize = 240 * 280 * 2; // 134 400
    if (req.body.length !== expectedSize) {
      return res.status(400).json({
        error: `Payload must be exactly ${expectedSize} bytes, got ${req.body.length}`,
      });
    }

    try {
      const result = await forwardToArduino(arduinoIp, req.body);
      res.json(result);
    } catch (err) {
      res.status(502).json({ error: err.message });
    }
  }
);

// ------------------------------------------------------------------
// GET /api/check?ip=<arduino-ip>
// Fetches GET /status from the Arduino and returns the JSON.
// ------------------------------------------------------------------
app.get("/api/check", async (req, res) => {
  const ip = req.query.ip;
  if (!ip) {
    return res.status(400).json({ error: "Missing ?ip= query parameter" });
  }

  try {
    const data = await fetchArduinoStatus(ip);
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// ------------------------------------------------------------------
// Proxy helpers
// ------------------------------------------------------------------

function forwardToArduino(ip, data) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: ip,
      port: 80,
      path: "/upload",
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Length": data.length,
      },
      timeout: 30000,
    };

    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(body));
        } catch {
          resolve({ success: res.statusCode === 200, message: body });
        }
      });
    });

    req.on("error", (err) => reject(new Error(`Arduino unreachable: ${err.message}`)));
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Connection to Arduino timed out"));
    });

    req.write(data);
    req.end();
  });
}

function fetchArduinoStatus(ip) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: ip,
      port: 80,
      path: "/status",
      method: "GET",
      timeout: 5000,
    };

    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(body));
        } catch {
          reject(new Error("Invalid JSON from Arduino"));
        }
      });
    });

    req.on("error", (err) => reject(new Error(`Arduino unreachable: ${err.message}`)));
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Connection to Arduino timed out"));
    });

    req.end();
  });
}

// ------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`Arduino Display Manager running at http://localhost:${PORT}`);
});
