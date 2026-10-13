# CORELINE — Interactive 3D AI Data Centre Operations Simulator

An interactive, cinematic 3D AI hyperscale data centre operations simulator built with **React**, **TypeScript**, **Three.js**, and **Tailwind CSS**.

Coreline blends the tactical aesthetics of an AI infrastructure operations command center, an isometric strategy simulation, and a real-time hardware telemetry dashboard.

---

## Key Features

### Procedural 3D Hyperscale Campus
- **Data Halls (Alpha & Beta):** Two high-density compute facilities featuring cutaway transparent roofs, allowing visitors to inspect inside rows of GPU racks, hot and cold aisles, raised floor plenums, overhead cable trays, and fiber runs.
- **Detailed Server Racks:** 48 individually interactive GPU clusters (NVIDIA H100 SXM5, H200, B200 NVL, Google TPU v5p) with dynamic status LEDs that pulse in real-time based on compute utilization and thermal load.
- **Cooling Infrastructure Zone:** Industrial cooling towers with dynamically spinning exhaust fans and rising steam/vapor particle effects, liquid chillers with dual compressors, and insulated chilled water supply/return piping networks.
- **Power Infrastructure Zone:** 132kV grid interconnect substation with high-voltage gantries, step-down transformers with radiator cooling fins, 3.5MW containerized backup diesel generators with silencer stacks, and bulk fuel storage tanks.
- **Network Infrastructure & Optical Spine:** Carrier-neutral fiber vault, central optical distribution spine hub, and parabolic satellite uplink dish. Real-time glowing cyan data packets travel along curved 3D fiber routes between the network vault and compute halls.
- **Autonomous Logistics & Vehicles:** Heavy logistics delivery rig delivering equipment crates on a periodic route, and an autonomous robotic technician service cart that patrols pathways and responds to rack incidents.
- **Atmospheric Campus Details:** Security gatehouse with barrier boom arm, perimeter fences, asphalt roadway with illuminated lane markings, runway guide bollards, and cyberpunk low-poly landscaping.

### Real-Time Simulation Engine
- **6-Stage AI Job Lifecycle Pipeline:** Autonomous progression through **Queued → Scheduled → Running → Checkpoint → Evaluating → Done** with realistic frontier model workloads (e.g. DeepSeek-R1 Reasoning, Llama-3.3 70B RLHF, Diffusion 4K VideoGen, AlphaFold-3 Docking).
- **Incident Lifecycle:** Rack alerts trigger automated incident logging: **Detected → Assigned → Repairing → Resolved**, dispatching the autonomous technician cart to the affected unit.
- **Thermodynamic Modeling:** Power Usage Effectiveness (PUE) and cooling power demand dynamically adapt to compute utilization and environmental weather conditions.
- **Interactive Triggers:** Operators can manually trigger simulated rack thermal faults, generator load tests, or heatwave load spikes via the settings panel.

### Mission-Critical Operations Interface
- **Primary KPI Cards:** Exactly 3 primary real-time metrics:
  1. **GPU Utilisation (%)** with cluster compute throughput (PFLOPS).
  2. **Power Draw (MW)** with grid frequency (Hz) and substation capacity.
  3. **PUE Rating** (≥ 1.0) responding to cooling and outdoor temperature.
- **Context-Aware Object Detail Panel:** Clicking any 3D asset (rack, cooling tower, generator, hall, vehicle, or network node) slides out deep live telemetry and camera focus controls.
- **Telemetry Drawer:** 3-tab collapsible drawer featuring:
  - **Racks:** ID, hall, GPU utilization, temperature, power, health.
  - **Jobs:** Workload title, model architecture, assigned rack, progress, lifecycle stage.
  - **Incidents:** Incident ID, affected unit, severity, elapsed time, manual resolve trigger.
- **Asset Search (Ctrl+K or /):** Global instant search with auto-complete that flies the 3D camera to any asset on campus.
- **Cinematic Director Tour:** Automated aerial tour smoothly traversing key points of interest with cinematic aspect framing and an exit button.
- **Weather & Day/Night System:** Switchable weather conditions (Clear, Heatwave, Monsoon rain, and Storm with lightning flashes) and Day/Night ambient lighting transitions.
- **Synthesized Tactical Audio:** 0-dependency Web Audio synthesizer providing subtle clicks, alerts, and camera warp feedback.

---

## Tech Stack

- **Framework:** React 19 + TypeScript
- **Bundler:** Vite
- **3D Engine:** Three.js with OrbitControls
- **Styling:** Tailwind CSS v4 with custom dark glassmorphism
- **Icons:** Lucide React
- **Audio:** Web Audio API (Synthesized)

---

## Local Development

### Prerequisites
- Node.js 18+ (tested with Node 22)
- npm 9+

### Setup

```bash
# 1. Clone repository or navigate to project directory
cd 3d-world-ai

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```

Open `http://localhost:5173` in your browser.

### Production Build

```bash
# Build production bundle
npm run build

# Preview production build locally
npm run preview
```

The production output is built into the `dist/` directory.

---

## Vercel Deployment Instructions

Coreline is a purely client-side Single Page Application (SPA) with zero external backend or database dependencies, making it 100% ready for instant deployment on [Vercel](https://vercel.com).

### Option 1: Deploy via GitHub (Recommended)

1. Push this project to your GitHub account:
   ```bash
   git init
   git add .
   git commit -m "feat: Initial commit for Coreline 3D AI Data Centre Simulator"
   git branch -M main
   git remote add origin https://github.com/<your-username>/coreline.git
   git push -u origin main
   ```
2. Log in to [Vercel](https://vercel.com).
3. Click **Add New...** → **Project**.
4. Select the `coreline` repository from GitHub.
5. Vercel will automatically detect **Vite**:
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
6. Click **Deploy**. Your application will be live in under 60 seconds with global CDN distribution!

### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI if needed
npm install -g vercel

# Deploy directly from terminal
vercel
```

Follow the interactive prompts to deploy. For production:
```bash
vercel --prod
```

---

## Project Structure

```
├── src/
│   ├── components/
│   │   ├── TopNav.tsx               # Top command bar (brand, weather, clock, tour, sound)
│   │   ├── KpiCards.tsx             # 3 Primary KPI cards (GPU Util %, Power MW, PUE)
│   │   ├── ObjectDetailModal.tsx    # Right-side telemetry panel for selected assets
│   │   ├── JobLifecycleTracker.tsx  # 6-stage interactive horizontal workflow tracker
│   │   ├── TelemetryDrawer.tsx      # Tabbed live data table (Racks, Jobs, Incidents)
│   │   ├── SearchModal.tsx          # Quick asset search with camera fly-to
│   │   ├── SettingsModal.tsx        # Simulation triggers, audio toggles, controls guide
│   │   └── CinematicOverlay.tsx     # Letterbox framing and tour exit controls
│   ├── scene/
│   │   ├── CampusScene.ts           # Pure Three.js procedural scene builder & animators
│   │   └── CorelineCanvas.tsx       # React viewport wrapper with WebGL fallback
│   ├── simulation/
│   │   ├── SimulationContext.tsx    # Reactive state, telemetry drift & simulation loop
│   │   ├── mockData.ts              # Initial procedural equipment & workload dataset
│   │   └── soundEffects.ts          # Web Audio API sound synthesizer
│   ├── types/
│   │   └── simulation.ts            # TypeScript data models and interfaces
│   ├── App.tsx                      # Root application layout
│   ├── main.tsx                     # React entry point
│   └── index.css                    # Glassmorphism styling and Tailwind imports
├── index.html                       # HTML shell with Google Fonts & custom favicon
├── vite.config.ts                   # Vite configuration with React & Tailwind plugins
├── tsconfig.json                    # TypeScript compiler configuration
└── package.json                     # NPM dependencies and scripts
```

---

## License

MIT License. Built for interactive AI infrastructure demonstration and exploration.
