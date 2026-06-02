# LogIntelligence: AI-Powered Telemetry SDK & SRE Dashboard

**LogIntelligence** is a production-grade, resume-ready log aggregation and diagnostic intelligence platform. It consists of a high-performance **TypeScript telemetry SDK**, a **resilient Express & MongoDB backend**, and a **minimalist dark-mode React dashboard** featuring automated anomaly detection and root-cause fixes powered by Google's **Gemini API**.

---

## 🏗️ Architectural Blueprint

```mermaid
graph TD
    subgraph Client Application
        App[Your App Code] -->|"logAI.error()"| SDK[log-ai-tool SDK]
        SDK -->|Batch Queue| Batcher[Batcher & Retry Engine]
    end

    subgraph Backend Server (Port 3001)
        Batcher -->|POST /api/logs/batch| Ingest[Ingestion Router]
        Ingest -->|SHA-256 Auth| Middleware[Auth Middleware]
        Middleware -->|Bulk insertMany| DB[(MongoDB)]
        
        DB -->|Pipeline Hook| Anomaly[Anomaly Detector]
        Anomaly -->|Sliding Window Spike / FATAL| AIWorker[AI Diagnostics Engine]
        AIWorker -->|Analyze Log Context| Gemini[Gemini API / Offline Fallback]
        Gemini -->|Generate Fix Diffs| Insights[(Insights Collection)]
    end

    subgraph Dev Dashboard (Port 5173)
        Dashboard[React Dashboard] -->|GET /api/stats| DB
        Dashboard -->|AI Diagnostic Drawer| Insights
        Dashboard -->|Real-Time Logs| DB
    end
    
    style SDK fill:#6366f1,stroke:#3f3f46,stroke-width:2px,color:#fff
    style DB fill:#10b981,stroke:#3f3f46,stroke-width:2px,color:#fff
    style Gemini fill:#ec4899,stroke:#3f3f46,stroke-width:2px,color:#fff
    style Dashboard fill:#3b82f6,stroke:#3f3f46,stroke-width:2px,color:#fff
```

---

## 🌟 Core System Features

### 1. Telemetry SDK (`log-ai-tool`)
*   **Memory-Efficient Batching**: Rather than pushing an HTTP request on every log call, the [Batcher](./sdk/src/batcher.ts) buffers telemetry records in-memory and flushes them when a size threshold (e.g., 10 logs) is reached or a timeout (e.g., 3s) expires.
*   **Resilient Network Layer**: Equipped with [exponential backoff retry and jitter](./sdk/src/retry.ts) (`delay = base * 2^attempt + random_jitter`) to prevent hitting the ingestion backend all at once.
*   **Graceful Shutdown & Crash Telemetry**: Hooks into Node process signals (`SIGINT`, `SIGTERM`) and `uncaughtException` to flush remaining logs to the database before the process terminates.

### 2. Robust Express & MongoDB Backend
*   **Hashed API Keys**: Implements secure authorization via the [auth.js](./backend/src/middleware/auth.js) middleware. Stores and validates SHA-256 hashes of client keys to prevent database leak vulnerabilities.
*   **Compound Mongoose Indexing**: Uses high-performance indexing (`{ apiKey: 1, service: 1, timestamp: -1 }`) in [Log.js](./backend/src/models/Log.js) to guarantee sub-millisecond query responses over millions of rows.
*   **Bulk Database Writes**: Saves network roundtrips by batching inserts using MongoDB's `insertMany` method.
*   **Log Signature Classification**: Automatically labels log entries (e.g., `DB_ERROR`, `AUTH_FAIL`, `TIMEOUT`) using a regex classifier.

### 3. Sliding-Window Anomaly Worker & Gemini SRE Agent
*   **Error Spike Aggregator**: Checks log volume inside a sliding window (e.g., last 5 minutes). If the error rate exceeds the threshold configured in [config.js](./backend/src/config.js), it triggers an alert.
*   **Immediate Fatal Escalation**: Instantly generates an anomaly when `FATAL` logs are received.
*   **Gemini Diagnostic Worker**: The [gemini.js](./backend/src/services/gemini.js) service extracts logs preceding the incident and sends them to Gemini for root-cause diagnosis.
*   **Offline Fallback Mode**: If a Gemini API Key is missing or invalid, the service gracefully switches to a rule-based engine to generate realistic, copyable code diff fixes based on log signatures, ensuring the app is always functional.

### 4. Self-Healing & Auto-Remediation Execution Engine
*   **Sandboxed Environment**: Target config files are isolated inside `/backend/sandbox/` (e.g. `payment-service.env`, `gateway-service.json`, `auth-service.status`).
*   **Cross-Platform Remediator**: To bypass shell quote-escaping issues on Windows and Linux hosts, the [remediator.js](./backend/src/services/remediator.js) extracts raw JS code from Gemini scripts, saves it temporarily as a `temp_fix_*.js` file in the sandbox, executes it via child processes, streams logs in real-time, and deletes the script on close.
*   **Auto-Heal & Approval Toggle Gates**: SREs can choose between automated resolution execution (Auto-Heal) or require manual SRE clicks to execute patch scripts. Auto-heal states are persisted in MongoDB and inherited across service anomalies.
*   **Live SRE Terminal Feed**: Feeds stdout/stderr outputs directly from the running sandbox patch scripts into the dashboard terminal.

### 5. Interactive Landing Portal & SPA Routing
*   **Product Pitch Website**: Features a stunning, dark sci-fi glassmorphic homepage with product highlights, a visual architecture overview, and smooth animations.
*   **Telemetry Sandbox Playground**: Includes an interactive terminal widget where visitors can simulate database connection failures. Clicking "Trigger exception" prints warnings, correlates log alerts, invokes mock AI diagnostics, and executes a config patch script with live terminal output in real-time.
*   **State-driven SPA Router**: Navigates seamlessly between the landing portal and the workspace console via an in-memory route coordinator.

### 6. Minimalist Glassmorphic UI Dashboard
*   **Live Telemetry Feed**: A terminal-style feed showing real-time log ingestion.
*   **Custom SVG Area Charts**: Features a hand-coded, responsive, and animated SVG charting module to display ingress volume and error rates over time without heavy third-party bundle bloat.
*   **AI Diagnostic Drawer**: Clicking any active alert slides open a drawer containing the Gemini-generated root cause, confidence score, severity analysis, and code recommendation diffs.
*   **Log Explorer & Meta Inspector**: Query logs using advanced filters. Double-clicking a log line opens a modal with the detailed JSON metadata payload.
*   **API Key Manager**: Generate and revoke client credentials, complete with copy-to-clipboard actions and SDK code templates.

---

## 📂 Repository Layout

```text
├── sdk/                      # TypeScript Log Collector SDK
│   ├── src/
│   │   ├── client.ts         # Main SDK LogAIClient implementation
│   │   ├── batcher.ts        # In-memory batch queue manager
│   │   ├── retry.ts          # Retry logic with backoff + jitter
│   │   └── index.ts          # Module export definitions
│   └── tsconfig.json         # TypeScript configurations
│
├── backend/                  # Node.js/Express Telemetry Backend
│   ├── src/
│   │   ├── index.js          # App entrypoint & middleware mounting
│   │   ├── config.js         # Environment validations (Zod)
│   │   ├── models/           # Mongoose schemas (Log, Anomaly, Insight, ApiKey)
│   │   ├── routes/           # REST endpoints (Ingest, Stats, Keys, Anomalies)
│   │   ├── services/         # Anomaly worker & Gemini AI services
│   │   └── scripts/
│   │       └── simulate.js   # Telemetry simulation script
│   └── .env.example          # Sample environment credentials
│
└── frontend/                 # Vite & React Dashboard UI
    ├── src/
    │   ├── App.tsx           # Page coordinator & Key banner
    │   ├── index.css         # Styling, glassmorphic layout & animations
    │   └── views/            # Dashboard, Anomalies, LogExplorer, Keys views
    └── vite.config.ts        # Vite dev configurations (local API proxying)
```

---

## ⚡ Quickstart & Local Installation

### Prerequisites
*   [Node.js](https://nodejs.org/) (v18+)
*   [MongoDB](https://www.mongodb.com/try/download/community) (running locally at `mongodb://127.0.0.1:27017/` or Atlas connection)

---

### Step 1: Install & Package the SDK
Compiles the SDK code into CommonJS (`.cjs`), ES Modules (`.js`), and declaration files (`.d.ts`):
```bash
cd sdk
npm install
npm run build
```

---

### Step 2: Configure & Launch the Backend
1.  Navigate to the backend directory and install dependencies:
    ```bash
    cd ../backend
    npm install
    ```
2.  Rename `.env.example` to `.env` and configure your credentials:
    ```env
    PORT=3001
    MONGODB_URI=mongodb://127.0.0.1:27017/ai-log-intelligence
    GEMINI_API_KEY=YOUR_GOOGLE_AI_STUDIO_KEY # If empty, backend uses local fallback mock
    NODE_ENV=development
    ANOMALY_THRESHOLD=10
    ANOMALY_WINDOW_MINUTES=5
    ```
3.  Boot up the backend server:
    ```bash
    npm start
    ```
    *(Terminal should print: `✅ MongoDB connected` & `🚀 Server running on port 3001`)*

---

### Step 3: Run the Frontend UI
1.  Navigate to the frontend directory and install dependencies:
    ```bash
    cd ../frontend
    npm install
    ```
2.  Boot up the Vite dev server:
    ```bash
    npm run dev
    ```
    *(Open [http://localhost:5173/](http://localhost:5173/) in your web browser).*

---

### Step 4: Run the Telemetry Traffic Simulator
Open a new terminal window and execute the simulation script to seed mock data and trigger Gemini's diagnostic analysis:
```bash
cd backend
node src/scripts/simulate.js
```
The script will output a simulated API key:
```text
🎉 Simulation traffic successfully generated!
🔗 API Key for Dashboard: logai_2d7f49bc5be641b956d19db254539185aeba17ec15d76f503b4a9530d89ac033
```
Copy this key, open the frontend dashboard in your browser, click **Configure Key** in the banner, paste it, and watch the dashboard populate.

---

## 🛠️ REST API Specification

| Endpoint | Method | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `/api/logs/batch` | `POST` | `X-API-Key` | Bulk log ingress (used by the SDK) |
| `/api/logs` | `GET` | `X-API-Key` | Query paginated logs with regex search and level filters |
| `/api/anomalies` | `GET` | `X-API-Key` | List unresolved/resolved anomalies |
| `/api/anomalies/:id/insight` | `GET` | `X-API-Key` | Fetch Gemini's diagnostic root cause and code fixes |
| `/api/anomalies/:id/resolve` | `POST` | `X-API-Key` | Resolve a flagged anomaly alert |
| `/api/keys` | `POST` | None | Create a developer key (returns raw key once) |
| `/api/keys` | `GET` | None | List created keys and metadata |
| `/api/keys/:id/revoke` | `POST` | None | Revoke key credentials immediately |
| `/api/stats` | `GET` | None | Get dashboard analytics and volume chart data |


