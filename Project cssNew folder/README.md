# ESP32 Dual-Axis Solar Tracker Dashboard

Modern, industrial-grade IoT telemetry dashboard built with **React + TypeScript + Vite + Tailwind CSS**, ready to push to **GitHub** and deploy on **Vercel**.

## Features

- **Dual-Axis Gimbal & Azimuth Compass**: Real-time SVG gauges for **Pan (`0°–180°`)** and **Tilt (`0°–180°`)** with live PWM microsecond conversion (`500–2500 µs`) and interactive servo override sliders in **Manual Override** mode (`POST /api/control`).
- **4-Quadrant LDR Matrix**: Displays **Top-Left**, **Top-Right**, **Bottom-Left**, and **Bottom-Right** 12-bit ADC readings (`0–4095`), percentage irradiance, dynamic solar glow intensity, and a central differential sun-pull crosshair (`ΔX` / `ΔY`) with deadband lock detection.
- **Environmental Telemetry Cards**: Live SVG area sparkline trend charts for **Temperature (`°C`)**, **Humidity (`% RH`)**, and **Gas / Air Quality (`PPM`)** with automatic **Safe / Elevated / Hazard** threshold badges.
- **Demo Simulation + Live ESP32 API**: Runs out of the box on Vercel with an interactive **Demo Simulation** mode (Solar Sweep, Clear Noon, Cloudy Drift, Gas Alert Test) and includes an **ESP32 API** modal to connect your ESP32 hardware endpoint.

---

## Project Structure

```text
├── esp32/
│   └── solar_tracker_esp32.ino   # Matching Arduino/ESP32 firmware sketch
├── src/
│   ├── components/
│   │   ├── EnvironmentalCards.tsx
│   │   ├── Esp32ApiModal.tsx
│   │   ├── GimbalCompassCard.tsx
│   │   ├── HeaderBar.tsx
│   │   └── LdrMatrixCard.tsx
│   ├── types/telemetry.ts
│   ├── utils/
│   │   ├── esp32Api.ts
│   │   └── simulation.ts
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
├── vercel.json
└── vite.config.ts
```

---

## Local Development

```bash
npm install
npm run dev
```

To create a production build locally:

```bash
npm run build
```

---

## Upload to GitHub & Deploy on Vercel

1. **Create a GitHub repository** (e.g., `esp32-solar-tracker-ui`).
2. **Push this project to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: ESP32 Dual-Axis Solar Tracker Dashboard"
   git branch -M main
   git remote add origin https://github.com/<your-username>/esp32-solar-tracker-ui.git
   git push -u origin main
   ```
3. **Deploy on Vercel**:
   - Go to [vercel.com/new](https://vercel.com/new) and import your GitHub repository.
   - Vercel automatically detects **Vite** (`Build Command: npm run build`, `Output Directory: dist`).
   - Click **Deploy**.

---

## ESP32 HTTP API Contract

### `GET /api/telemetry`
```json
{
  "temperature": 29.4,
  "humidity": 54.2,
  "gasPpm": 215,
  "panAngle": 92,
  "tiltAngle": 68,
  "mode": "auto",
  "ldr": { "tl": 3420, "tr": 3390, "bl": 3180, "br": 3210 },
  "rssi": -58,
  "uptimeSec": 1420
}
```

### `POST /api/control`
```json
{
  "mode": "manual",
  "panAngle": 110,
  "tiltAngle": 75
}
```

> **Mixed-Content Note**: When hosted on Vercel (`https://`), browsers block direct `http://192.168.x.x` requests. For live control from Vercel, expose your ESP32 via an HTTPS tunnel (e.g., Cloudflare Tunnel or ngrok) or run the dashboard locally via `npm run dev`.
