# LogIntelligence – AI-Powered Log Analytics & Incident Response Platform

> **Production-grade intelligent log aggregation, anomaly detection, and AI-driven remediation** — Transform raw logs into actionable intelligence with real-time anomaly detection and automated incident response.

**LogIntelligence** is a comprehensive observability platform engineered for modern DevOps teams. It seamlessly combines:

- **🔹 High-Performance TypeScript SDK** – Memory-efficient batching with exponential backoff retries and graceful shutdown handling
- **🔹 Robust Express & MongoDB Backend** – SHA-256 hashed API keys, sub-millisecond query performance via compound indexing, and intelligent log signature classification
- **🔹 AI-Driven Anomaly Detection** – Real-time sliding-window analysis that identifies error spikes and fatal events instantly
- **🔹 Gemini-Powered Diagnostics** – Intelligent root-cause analysis with code-level fix recommendations (automatic fallback to rule-based mode if API unavailable)
- **🔹 Self-Healing Automation Engine** – Sandboxed remediation execution with SRE approval gates and live terminal feedback
- **🔹 Beautiful React Dashboard** – Glassmorphic UI with live telemetry feeds, custom SVG analytics charts, and intelligent log explorer

---

## 🏗️ System Architecture

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

## ✨ Core Features

### 1. **High-Performance Telemetry SDK**

The TypeScript SDK (`log-ai-tool`) is optimized for production environments:

- **Memory-Efficient Batching** – Buffers telemetry in-memory and flushes when size threshold (10 logs) or timeout (3s) is reached, reducing network overhead
- **Resilient Retry Logic** – Implements exponential backoff with jitter to prevent thundering herd problems during backend failures
- **Graceful Shutdown** – Hooks into process signals (`SIGINT`, `SIGTERM`) and uncaught exceptions to ensure no logs are lost during graceful shutdown

### 2. **Enterprise-Grade Backend**

Built on Express and MongoDB with security and performance as first-class concerns:

- **Secure API Keys** – SHA-256 hashing ensures that even database breaches don't expose raw credentials
- **Sub-Millisecond Queries** – Compound Mongoose indexing (`apiKey: 1, service: 1, timestamp: -1`) guarantees fast responses over millions of records
- **Bulk Insert Optimization** – Batches writes via MongoDB's `insertMany` to reduce round-trips and latency
- **Intelligent Log Classification** – Automatically labels entries (e.g., `DB_ERROR`, `AUTH_FAIL`, `TIMEOUT`) using regex-based pattern matching

### 3. **Real-Time Anomaly Detection**

Sliding-window anomaly detection catches issues before they become critical:

- **Error Spike Detection** – Monitors log volume over configurable windows (default: 5 minutes) and triggers alerts when thresholds are exceeded
- **Immediate Fatal Escalation** – `FATAL` logs trigger instant notifications, bypassing normal thresholds
- **Configurable Thresholds** – Fine-tune sensitivity via environment variables without redeployment

### 4. **AI-Powered Diagnostics & Remediation**

Leverage Google's Gemini API for intelligent incident analysis:

- **Root-Cause Analysis** – Analyzes log context preceding anomalies to identify underlying issues
- **Code-Level Recommendations** – Generates specific, copy-paste-ready fix recommendations and code diffs
- **Graceful Fallback Mode** – If Gemini API is unavailable, system automatically switches to rule-based diagnostics ensuring continuous operation
- **Sandboxed Execution** – Config file modifications are isolated in `/backend/sandbox/` to prevent unintended side effects

### 5. **SRE-Friendly Automation**

Operators maintain full control over incident response:

- **Approval Gates** – Choose between automatic remediation or manual SRE approval for each patch execution
- **Live Terminal Feedback** – Stream stdout/stderr from remediation scripts directly to the dashboard
- **Cross-Platform Support** – Bypass shell escaping issues on Windows and Linux via JavaScript-based remediation execution
- **State Persistence** – Auto-heal preferences are stored in MongoDB and inherited across similar incidents

### 6. **Intuitive Analytics Dashboard**

Modern React UI with real-time insights:

- **Live Telemetry Feed** – Terminal-style log ingestion display with real-time updates
- **Custom Analytics Charts** – Hand-coded SVG area charts showing volume trends and error rates without heavy dependencies
- **AI Insights Drawer** – Click any alert to view Gemini-generated diagnostics, confidence scores, and recommended fixes
- **Advanced Log Explorer** – Query with regex filtering, severity levels, and service tags; inspect full JSON payloads
- **API Key Management** – Generate, revoke, and manage client credentials with one-click SDK code generation

---

## 📂 Project Structure

```text
├── sdk/                      # TypeScript Log Collector SDK
│   ├── src/
│   │   ├── client.ts         # LogAIClient main implementation
│   │   ├── batcher.ts        # In-memory batch queue manager
│   │   ├── retry.ts          # Exponential backoff retry engine
│   │   └── index.ts          # Module exports
│   └── tsconfig.json         # TypeScript configuration
│
├── backend/                  # Node.js/Express Telemetry Server
│   ├── src/
│   │   ├── index.js          # Server entrypoint & middleware
│   │   ├── config.js         # Environment validation (Zod)
│   │   ├── models/           # Mongoose schemas
│   │   │   ├── Log.js        # Log records with indexing
│   │   │   ├── Anomaly.js    # Anomaly detection records
│   │   │   ├── Insight.js    # AI diagnostic insights
│   │   │   └── ApiKey.js     # API key management
│   │   ├── routes/           # REST API endpoints
│   │   │   ├── logs.js       # Log ingestion & querying
│   │   │   ├── anomalies.js  # Anomaly management
│   │   │   ├── keys.js       # API key operations
│   │   │   └── stats.js      # Analytics endpoints
│   │   ├── middleware/       # Express middleware
│   │   │   └── auth.js       # API key validation
│   │   ├── services/         # Business logic
│   │   │   ├── anomalyDetector.js  # Anomaly detection engine
│   │   │   ├── gemini.js           # Gemini API integration
│   │   │   └── remediator.js       # Remediation executor
│   │   └── scripts/
│   │       └── simulate.js   # Data generation for demos
│   ├── sandbox/              # Isolated remediation environment
│   │   ├── payment-service.env
│   │   ├── gateway-service.json
│   │   └── auth-service.status
│   └── .env.example          # Environment template
│
└── frontend/                 # React + Vite Dashboard
    ├── src/
    │   ├── App.tsx           # Main application component
    │   ├── index.css         # Glassmorphic styling & animations
    │   ├── main.tsx          # React entry point
    │   └── views/            # Dashboard pages
    │       ├── DashboardView.tsx
    │       ├── AnomaliesView.tsx
    │       ├── LogExplorer.tsx
    │       ├── KeysView.tsx
    │       └── LandingPageView.tsx
    ├── vite.config.ts        # Vite configuration with API proxy
    └── tsconfig.json         # TypeScript configuration
```

---

## ⚡ Getting Started

### Prerequisites

- **Node.js** v18+ ([Download](https://nodejs.org/))
- **MongoDB** Community Edition ([Download](https://www.mongodb.com/try/download/community)) or MongoDB Atlas account

### Installation Steps

#### Step 1: Build the SDK

```bash
cd sdk
npm install
npm run build
```

This compiles TypeScript into CommonJS, ESM, and TypeScript declaration files.

#### Step 2: Set Up the Backend

```bash
cd ../backend
npm install
```

Copy `.env.example` to `.env` and configure:

```env
PORT=3001
MONGODB_URI=mongodb://127.0.0.1:27017/ai-log-intelligence
GEMINI_API_KEY=your_google_ai_key_here
NODE_ENV=development
ANOMALY_THRESHOLD=10
ANOMALY_WINDOW_MINUTES=5
```

Start the server:

```bash
npm start
```

Expected output:

```
✅ MongoDB connected
🚀 Server running on port 3001
```

#### Step 3: Launch the Frontend

```bash
cd ../frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

#### Step 4: Generate Test Data

In a new terminal:

```bash
cd backend
node src/scripts/simulate.js
```

You'll see:

```
🎉 Simulation traffic successfully generated!
🔗 API Key for Dashboard: logai_2d7f49bc5be641b956d19db254539185aeba17ec15d76f503b4a9530d89ac033
```

Paste this key in the dashboard's **Configure Key** banner to see live data.

---

## 🛠️ API Reference

| Endpoint                     | Method | Auth     | Description                                  |
| ---------------------------- | ------ | -------- | -------------------------------------------- |
| `/api/logs/batch`            | POST   | Required | Bulk ingest logs (used by SDK)               |
| `/api/logs`                  | GET    | Required | Query logs with pagination and filtering     |
| `/api/anomalies`             | GET    | Required | List detected anomalies                      |
| `/api/anomalies/:id/insight` | GET    | Required | Fetch Gemini diagnostics and recommendations |
| `/api/anomalies/:id/resolve` | POST   | Required | Mark anomaly as resolved                     |
| `/api/keys`                  | POST   | —        | Create new API key                           |
| `/api/keys`                  | GET    | —        | List all API keys                            |
| `/api/keys/:id/revoke`       | POST   | —        | Revoke an API key                            |
| `/api/stats`                 | GET    | —        | Get dashboard analytics                      |

---

## 📖 SDK Integration Guide

### Basic Usage

```typescript
import { LogAIClient } from "log-ai-tool";

const logAI = new LogAIClient({
  apiKey: "logai_your_key_here",
  endpoint: "http://localhost:3001/api/logs/batch",
  service: "payment-service",
  batchSize: 10,
  batchTimeoutMs: 3000,
});

// Log at different levels
logAI.info("Payment processed", { amount: 99.99, userId: "123" });
logAI.warn("Slow query detected", { duration: 2500 });
logAI.error("Payment failed", { error: "Timeout", retries: 2 });
logAI.fatal("Database down", { connectionString: "..." });
```

### Express Integration

```typescript
import express from "express";
import { LogAIClient } from "log-ai-tool";

const app = express();
const logAI = new LogAIClient({
  apiKey: process.env.LOG_AI_KEY,
  service: "api-gateway",
});

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 400 ? "error" : "info";
    logAI[level](`${req.method} ${req.path}`, {
      statusCode: res.statusCode,
      duration,
    });
  });
  next();
});

// Error handling
app.use((err, req, res, next) => {
  logAI.error("Request failed", {
    message: err.message,
    path: req.path,
    stack: err.stack,
  });
  res.status(500).json({ error: "Internal server error" });
});
```

### Graceful Shutdown

```typescript
process.on("SIGINT", async () => {
  console.log("Shutting down gracefully...");
  await logAI.flush();
  process.exit(0);
});
```

---

## 🆘 Troubleshooting

### MongoDB Connection Issues

**Problem**: `MongoDB connection failed`

**Solution**:

- Verify MongoDB is running: `mongod --version`
- Check `MONGODB_URI` in `.env`
- For Atlas: Ensure IP is whitelisted in Network Access settings

### Gemini API Quota Exceeded

**Problem**: Dashboard shows "Offline Fallback Mode"

**Solution**:

- Check quota at [Google AI Studio](https://aistudio.google.com/apikey)
- Remove `GEMINI_API_KEY` from `.env` to use rule-based mode permanently

### Port Already in Use

**Problem**: `Address already in use :::3001`

**Windows Solution**:

```bash
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

**macOS/Linux Solution**:

```bash
lsof -i :3001
kill -9 <PID>
```

Or change `PORT` in `.env` to an available port.

### CORS Errors

**Problem**: `Access to XMLHttpRequest blocked by CORS`

**Solution**: Restart Vite dev server (`npm run dev`) to reload proxy configuration.

### Logs Not Appearing in Dashboard

**Checklist**:

- ✅ API key is correct (from simulator or dashboard Keys panel)
- ✅ Backend is running (`npm start`)
- ✅ MongoDB is connected (check backend logs)
- ✅ SDK is initialized before logging
- ✅ Wait for batch timeout (3s default) or reach batch size (10 logs default)

---

## 🤝 Contributing

We welcome contributions of all kinds!

### Development Setup

1. Fork and clone the repository:

   ```bash
   git clone https://github.com/ShreyasD46/AI---Based-Log-Analysis-Tool.git
   cd ai-log-intelligence
   ```

2. Create a feature branch:

   ```bash
   git checkout -b feature/your-feature-name
   ```

3. Make your changes following code style guidelines:
   - Use TypeScript with strict mode
   - Use `const` by default in JavaScript
   - camelCase for functions/variables, PascalCase for classes
   - Explain _why_ in comments, not _what_

4. Test thoroughly:

   ```bash
   cd sdk && npm run build
   cd ../backend && npm start
   cd ../frontend && npm run dev
   ```

5. Commit with clear messages:

   ```bash
   git commit -m "feat: add WebSocket real-time logging"
   git commit -m "fix: resolve MongoDB connection race condition"
   git commit -m "docs: improve API documentation"
   ```

6. Push and open a Pull Request with:
   - Clear title (prefix with `feat:`, `fix:`, `docs:`, `test:`)
   - Description of changes
   - Link to related issues
   - Evidence of testing

### Areas for Contribution

- 🐛 **Bug Fixes** – Check Issues for bugs marked `good-first-issue`
- 📚 **Documentation** – Improve README, add guides, enhance comments
- ✨ **Features** – See roadmap or propose new functionality
- 🧪 **Testing** – Add unit, integration, and E2E tests
- 🎨 **UI/UX** – Enhance dashboard design and accessibility

---

## 📋 Roadmap

### Phase 1: Foundation ✅

- [x] Core SDK with batching & retry logic
- [x] Express backend with MongoDB
- [x] Sliding-window anomaly detection
- [x] Gemini API integration
- [x] React dashboard

### Phase 2: Expansion (In Progress)

- [ ] Multi-language SDKs (Go, Python, Java, Rust)
- [ ] Real-time WebSocket streaming
- [ ] Advanced ML-based anomaly detection
- [ ] Webhook integrations (Slack, PagerDuty, Teams)
- [ ] Log sampling & rate limiting policies

### Phase 3: Enterprise (Planned)

- [ ] Role-based access control (RBAC)
- [ ] Comprehensive audit logging
- [ ] Data retention & compliance policies
- [ ] Custom dashboards & reports
- [ ] Multi-region deployment & high availability

---

## 📄 License

This project is licensed under the **MIT License**. See [LICENSE](./LICENSE) for details.

You're free to use, modify, and distribute this software for personal, educational, and commercial purposes, provided you include the original copyright notice.

---

## 🙋 FAQ

**Q: Can I use this in production?**  
A: Yes! The SDK is production-hardened with resilient retries, efficient batching, and graceful shutdown. We recommend testing in staging first.

**Q: What happens if Gemini API fails?**  
A: The system automatically switches to offline rule-based diagnostics. All features remain available.

**Q: How do I customize the dashboard?**  
A: The React dashboard is fully customizable. Modify components in `frontend/src/views/`.

**Q: Can I use a different LLM?**  
A: Yes! Modify `backend/src/services/gemini.js` to integrate OpenAI, Anthropic, Llama, or other providers.

**Q: What about data privacy?**  
A: Logs are stored in your MongoDB instance. We recommend:

- Enable MongoDB authentication
- Use TLS for connections
- Mask sensitive data before logging
- Deploy on private networks or VPCs

**Q: How do I export logs?**  
A: Query `/api/logs` with pagination and export to S3, Data Lakes, or other storage.

---

## 📞 Support

- **GitHub Issues**: [Bug reports & feature requests](https://github.com/ShreyasD46/AI---Based-Log-Analysis-Tool/issues)
- **Discussions**: [Community Q&A](https://github.com/ShreyasD46/AI---Based-Log-Analysis-Tool/discussions)
- **GitHub Profile**: Contact via [ShreyasD46](https://github.com/ShreyasD46)

---

**Made with ❤️ by the LogIntelligence team**
