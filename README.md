# LogIntelligence: AI-Powered Telemetry SDK & SRE Dashboard

**LogIntelligence** is a production-grade,  log aggregation and diagnostic intelligence platform. It consists of a high-performance **TypeScript telemetry SDK**, a **resilient Express & MongoDB backend**, and a **minimalist dark-mode React dashboard** featuring automated anomaly detection and root-cause fixes powered by Google's **Gemini API**.

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

- **Memory-Efficient Batching**: Rather than pushing an HTTP request on every log call, the [Batcher](./sdk/src/batcher.ts) buffers telemetry records in-memory and flushes them when a size threshold (e.g., 10 logs) is reached or a timeout (e.g., 3s) expires.
- **Resilient Network Layer**: Equipped with [exponential backoff retry and jitter](./sdk/src/retry.ts) (`delay = base * 2^attempt + random_jitter`) to prevent hitting the ingestion backend all at once.
- **Graceful Shutdown & Crash Telemetry**: Hooks into Node process signals (`SIGINT`, `SIGTERM`) and `uncaughtException` to flush remaining logs to the database before the process terminates.

### 2. Robust Express & MongoDB Backend

- **Hashed API Keys**: Implements secure authorization via the [auth.js](./backend/src/middleware/auth.js) middleware. Stores and validates SHA-256 hashes of client keys to prevent database leak vulnerabilities.
- **Compound Mongoose Indexing**: Uses high-performance indexing (`{ apiKey: 1, service: 1, timestamp: -1 }`) in [Log.js](./backend/src/models/Log.js) to guarantee sub-millisecond query responses over millions of rows.
- **Bulk Database Writes**: Saves network roundtrips by batching inserts using MongoDB's `insertMany` method.
- **Log Signature Classification**: Automatically labels log entries (e.g., `DB_ERROR`, `AUTH_FAIL`, `TIMEOUT`) using a regex classifier.

### 3. Sliding-Window Anomaly Worker & Gemini SRE Agent

- **Error Spike Aggregator**: Checks log volume inside a sliding window (e.g., last 5 minutes). If the error rate exceeds the threshold configured in [config.js](./backend/src/config.js), it triggers an alert.
- **Immediate Fatal Escalation**: Instantly generates an anomaly when `FATAL` logs are received.
- **Gemini Diagnostic Worker**: The [gemini.js](./backend/src/services/gemini.js) service extracts logs preceding the incident and sends them to Gemini for root-cause diagnosis.
- **Offline Fallback Mode**: If a Gemini API Key is missing or invalid, the service gracefully switches to a rule-based engine to generate realistic, copyable code diff fixes based on log signatures, ensuring the app is always functional.

### 4. Self-Healing & Auto-Remediation Execution Engine

- **Sandboxed Environment**: Target config files are isolated inside `/backend/sandbox/` (e.g. `payment-service.env`, `gateway-service.json`, `auth-service.status`).
- **Cross-Platform Remediator**: To bypass shell quote-escaping issues on Windows and Linux hosts, the [remediator.js](./backend/src/services/remediator.js) extracts raw JS code from Gemini scripts, saves it temporarily as a `temp_fix_*.js` file in the sandbox, executes it via child processes, streams logs in real-time, and deletes the script on close.
- **Auto-Heal & Approval Toggle Gates**: SREs can choose between automated resolution execution (Auto-Heal) or require manual SRE clicks to execute patch scripts. Auto-heal states are persisted in MongoDB and inherited across service anomalies.
- **Live SRE Terminal Feed**: Feeds stdout/stderr outputs directly from the running sandbox patch scripts into the dashboard terminal.

### 5. Interactive Landing Portal & SPA Routing

- **Product Pitch Website**: Features a stunning, dark sci-fi glassmorphic homepage with product highlights, a visual architecture overview, and smooth animations.
- **Telemetry Sandbox Playground**: Includes an interactive terminal widget where visitors can simulate database connection failures. Clicking "Trigger exception" prints warnings, correlates log alerts, invokes mock AI diagnostics, and executes a config patch script with live terminal output in real-time.
- **State-driven SPA Router**: Navigates seamlessly between the landing portal and the workspace console via an in-memory route coordinator.

### 6. Minimalist Glassmorphic UI Dashboard

- **Live Telemetry Feed**: A terminal-style feed showing real-time log ingestion.
- **Custom SVG Area Charts**: Features a hand-coded, responsive, and animated SVG charting module to display ingress volume and error rates over time without heavy third-party bundle bloat.
- **AI Diagnostic Drawer**: Clicking any active alert slides open a drawer containing the Gemini-generated root cause, confidence score, severity analysis, and code recommendation diffs.
- **Log Explorer & Meta Inspector**: Query logs using advanced filters. Double-clicking a log line opens a modal with the detailed JSON metadata payload.
- **API Key Manager**: Generate and revoke client credentials, complete with copy-to-clipboard actions and SDK code templates.

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

- [Node.js](https://nodejs.org/) (v18+)
- [MongoDB](https://www.mongodb.com/try/download/community) (running locally at `mongodb://127.0.0.1:27017/` or Atlas connection)

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
    _(Terminal should print: `✅ MongoDB connected` & `🚀 Server running on port 3001`)_

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
    _(Open [http://localhost:5173/](http://localhost:5173/) in your web browser)._

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

| Endpoint                     | Method | Auth Required | Description                                              |
| :--------------------------- | :----- | :------------ | :------------------------------------------------------- |
| `/api/logs/batch`            | `POST` | `X-API-Key`   | Bulk log ingress (used by the SDK)                       |
| `/api/logs`                  | `GET`  | `X-API-Key`   | Query paginated logs with regex search and level filters |
| `/api/anomalies`             | `GET`  | `X-API-Key`   | List unresolved/resolved anomalies                       |
| `/api/anomalies/:id/insight` | `GET`  | `X-API-Key`   | Fetch Gemini's diagnostic root cause and code fixes      |
| `/api/anomalies/:id/resolve` | `POST` | `X-API-Key`   | Resolve a flagged anomaly alert                          |
| `/api/keys`                  | `POST` | None          | Create a developer key (returns raw key once)            |
| `/api/keys`                  | `GET`  | None          | List created keys and metadata                           |
| `/api/keys/:id/revoke`       | `POST` | None          | Revoke key credentials immediately                       |
| `/api/stats`                 | `GET`  | None          | Get dashboard analytics and volume chart data            |

---

## 📖 SDK Usage & Code Examples

### Basic Setup (Node.js / Express)

```typescript
import { LogAIClient } from "log-ai-tool";

// Initialize the SDK with your API key
const logAI = new LogAIClient({
  apiKey: "logai_your_key_here",
  endpoint: "http://localhost:3001/api/logs/batch",
  service: "payment-service",
  batchSize: 10,
  batchTimeoutMs: 3000,
});

// Log info-level messages
logAI.info("User login successful", { userId: "12345", ip: "192.168.1.1" });

// Log warnings
logAI.warn("Slow database query detected", {
  queryTime: 2500,
  table: "orders",
});

// Log errors with context
logAI.error("Payment processing failed", {
  error: "Stripe API timeout",
  orderId: "999",
  amount: 99.99,
  retryAttempt: 2,
});

// Log fatal errors (triggers immediate anomaly alert)
logAI.fatal("Database connection lost", { connectionString: "mongo://..." });
```

### Using with Express Middleware

```typescript
import express from "express";
import { LogAIClient } from "log-ai-tool";

const app = express();
const logAI = new LogAIClient({
  apiKey: process.env.LOG_AI_KEY,
  service: "api-gateway",
});

// Request logger middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 400 ? "error" : "info";
    logAI[level](`${req.method} ${req.path}`, {
      statusCode: res.statusCode,
      duration,
      ip: req.ip,
    });
  });
  next();
});

// Error handler
app.use((err, req, res, next) => {
  logAI.error("Unhandled error in request", {
    message: err.message,
    stack: err.stack,
    path: req.path,
  });
  res.status(500).json({ error: "Internal server error" });
});
```

### Graceful Shutdown with Final Flush

```typescript
const logAI = new LogAIClient({
  apiKey: process.env.LOG_AI_KEY,
  service: "worker",
});

process.on("SIGINT", async () => {
  console.log("Shutting down...");
  // Flushes all pending logs before exiting
  await logAI.flush();
  process.exit(0);
});
```

### TypeScript Type Definitions

```typescript
interface LogMetadata {
  [key: string]: string | number | boolean | object;
}

interface LogAIClientConfig {
  apiKey: string;
  endpoint?: string;
  service: string;
  batchSize?: number; // default: 10
  batchTimeoutMs?: number; // default: 3000
  retryMaxAttempts?: number; // default: 5
}

class LogAIClient {
  constructor(config: LogAIClientConfig);
  info(message: string, metadata?: LogMetadata): void;
  warn(message: string, metadata?: LogMetadata): void;
  error(message: string, metadata?: LogMetadata): void;
  fatal(message: string, metadata?: LogMetadata): void;
  flush(): Promise<void>;
}
```

---

## 🆘 Troubleshooting Guide

### Backend Issues

#### "MongoDB connection refused"

**Symptoms**: Terminal shows `❌ MongoDB connection failed`

**Solution**:

1. Verify MongoDB is running:

   ```bash
   # On Windows
   mongod --version

   # Or check if service is running (Windows Services)
   ```

2. Confirm `MONGODB_URI` in `.env` matches your setup:
   ```env
   MONGODB_URI=mongodb://127.0.0.1:27017/ai-log-intelligence
   ```
3. If using MongoDB Atlas, ensure:
   - Connection string includes username & password
   - Your IP is whitelisted in Network Access settings
   - String format: `mongodb+srv://user:pass@cluster.mongodb.net/ai-log-intelligence`

#### "Gemini API quota exceeded"

**Symptoms**: Dashboard shows "Offline Fallback Mode" warning

**Solution**:

1. Check your Gemini API quota at [Google AI Studio](https://aistudio.google.com/apikey)
2. Either:
   - Wait for quota reset (usually 24 hours)
   - Remove `GEMINI_API_KEY` from `.env` to use offline mode (works fine, just uses rule-based fixes)

#### "Port 3001 already in use"

**Symptoms**: Error `Address already in use :::3001`

**Solution**:

```bash
# Find process using port 3001
netstat -ano | findstr :3001   # Windows
lsof -i :3001                   # macOS/Linux

# Kill the process (use PID from above)
taskkill /PID <PID> /F          # Windows
kill -9 <PID>                   # macOS/Linux

# Or change PORT in .env
PORT=3002
```

### Frontend Issues

#### "API requests failing with CORS errors"

**Symptoms**: Browser console shows `Access to XMLHttpRequest blocked by CORS`

**Solution**:

1. Ensure `vite.config.ts` has backend proxy configured:
   ```typescript
   server: {
     proxy: {
       '/api': 'http://localhost:3001'
     }
   }
   ```
2. Restart Vite dev server: `npm run dev`

#### "Dashboard shows 'Invalid API Key'"

**Symptoms**: Enter key in Configure Key banner, get error

**Solution**:

1. Verify key format: Keys are SHA-256 hashes, approx 64 characters
2. Re-run simulator to generate a valid test key:
   ```bash
   cd backend && node src/scripts/simulate.js
   ```
3. Copy the full key (including `logai_` prefix if present)

#### "Vite port 5173 already in use"

**Symptoms**: Error `Port 5173 is in use`

**Solution**:

```bash
# Change port in vite.config.ts
server: {
  port: 5174
}
```

### SDK Issues

#### "Logs not appearing in dashboard"

**Symptoms**: SDK initialized but no logs visible in dashboard

**Checklist**:

1. ✅ Verify API key is correct (copy from dashboard Keys panel or simulator output)
2. ✅ Backend is running (`npm start` from backend/)
3. ✅ MongoDB is connected (check backend console logs)
4. ✅ Call `logAI.info()` after initialization
5. ✅ Wait for batch timeout (default 3 seconds) or batch size threshold

**Debug**:

```typescript
// Check SDK initialization
console.log("LogAI initialized:", logAI);

// Force flush to ensure logs are sent
await logAI.flush();
```

#### "Logs not being flushed on app exit"

**Symptoms**: Logs sent before process.exit() are lost

**Solution**: Always wrap shutdown with flush:

```typescript
process.on("SIGINT", async () => {
  await logAI.flush(); // Wait for pending logs
  process.exit(0);
});
```

---

## 🤝 Contributing

We welcome contributions! Here's how to get involved:

### Development Workflow

1. **Fork & Clone**:

   ```bash
   git clone https://github.com/ShreyasD46/AI---Based-Log-Analysis-Tool.git
   cd ai-log-intelligence
   ```

2. **Create a Feature Branch**:

   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Changes** following these conventions:
   - SDK changes: Edit files in `sdk/src/`
   - Backend: Edit files in `backend/src/`
   - Frontend: Edit files in `frontend/src/`
   - Run tests before committing

4. **Test Your Changes**:

   ```bash
   # SDK
   cd sdk && npm run build && npm test

   # Backend
   cd ../backend && npm start

   # Frontend
   cd ../frontend && npm run dev
   ```

5. **Commit with Clear Messages**:
   ```bash
   git commit -m "feat: add exponential backoff retry logic to SDK"
   git commit -m "fix: resolve MongoDB index creation race condition"
   git commit -m "docs: update README with contributing guidelines"
   ```

### Code Style

- **TypeScript**: Use strict mode, declare all types
- **JavaScript**: Use `const` by default, avoid `var`
- **Naming**: camelCase for functions/variables, PascalCase for classes
- **Comments**: Explain _why_, not _what_ the code does

### Areas for Contribution

- 🐛 **Bug Fixes**: Check Issues for `good-first-issue` label
- 📚 **Documentation**: Improve README, add API docs, write guides
- ✨ **Features**: See roadmap below, or propose new features via Issues
- 🧪 **Tests**: Add integration tests, unit tests, E2E tests
- 🎨 **UI/UX**: Enhance dashboard design, improve accessibility

### Pull Request Process

1. Push to your fork
2. Create PR with clear title: `feat:` `fix:` `docs:` `test:` prefix
3. Describe changes and link any related Issues
4. Ensure CI checks pass (tests, linting, builds)
5. Request review from maintainers
6. Address feedback and merge once approved

---

## 📋 Roadmap

### Phase 1: Foundation ✅

- [x] Core SDK with batching & retry logic
- [x] Express backend with MongoDB
- [x] Anomaly detection engine
- [x] Gemini integration
- [x] React dashboard

### Phase 2: Enhancements (In Progress)

- [ ] Multi-language SDK support (Go, Python, Java)
- [ ] Real-time WebSocket log streaming
- [ ] Advanced anomaly detection (ML models)
- [ ] Custom alerting webhooks (Slack, PagerDuty)
- [ ] Log sampling & rate limiting

### Phase 3: Enterprise Features (Planned)

- [ ] Role-based access control (RBAC)
- [ ] Audit logs & compliance reporting
- [ ] Data retention & archival policies
- [ ] Custom dashboards & reports
- [ ] High availability & multi-region support

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](./LICENSE) file for details.

You are free to:

- ✅ Use this software for personal, educational, and commercial projects
- ✅ Modify the code for your needs
- ✅ Distribute copies or modified versions
- ✅ Private or public usage

Under the condition that:

- 📋 Include the original copyright notice and license in distributions

---

## 🙋 FAQ

**Q: Can I use LogIntelligence in production?**  
A: Yes! The SDK is designed to be production-grade with resilient retries, graceful shutdowns, and efficient batching. The backend uses MongoDB indexing for performance. We recommend testing in a staging environment first.

**Q: What if Gemini API is down?**  
A: The backend automatically switches to offline fallback mode using rule-based diagnostics. The dashboard will display "Offline Mode" but continue generating insights from log patterns.

**Q: How do I export logs to S3 or external storage?**  
A: You can write a script that queries `/api/logs` with pagination and exports results. Future versions will include built-in export features.

**Q: Can I use a different LLM instead of Gemini?**  
A: The architecture is LLM-agnostic. You can modify [gemini.js](./backend/src/services/gemini.js) to use OpenAI, Anthropic, or other providers.

**Q: What about data privacy?**  
A: LogIntelligence stores logs in your MongoDB instance. We recommend:

- Running MongoDB with authentication enabled
- Using encrypted connections (TLS)
- Masking sensitive data in logs before sending
- Running on private networks or VPCs

---

## 📞 Support & Community

- **Issues & Bugs**: [GitHub Issues](https://github.com/ShreyasD46/AI---Based-Log-Analysis-Tool/issues)
- **Discussions**: [GitHub Discussions](https://github.com/ShreyasD46/AI---Based-Log-Analysis-Tool/discussions)
- **Email**: Contact via GitHub profile

---

**Made with ❤️ by the LogIntelligence team**
