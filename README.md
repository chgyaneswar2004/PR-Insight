# PR Insight

> AI-powered Pull Request reviews that catch bugs, security issues, and code quality 
> problems before they reach production.

PR Insight is an automated developer tool designed for engineering teams that automatically reviews pull requests, runs static and semantic code analysis using Large Language Models, and provides real-time structured feedback directly inside an intuitive, premium dashboard.

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Node.js version](https://img.shields.io/badge/node-%3E%3D18.0.0-blue.svg)
![Python version](https://img.shields.io/badge/python-%3E%3D3.11-blue.svg)
![Made with Claude AI](https://img.shields.io/badge/made%20with-Claude%20AI-orange)

---

## Dashboard Preview

![PR Insight Dashboard](./docs/screenshot.png)
*Note: Replace with actual screenshot after first deployment.*

---

## What is PR Insight?

Code reviews are a critical part of the software development lifecycle, but they are frequently slow, inconsistent, and prone to human error—especially when engineering teams are working under tight deadline pressures. Senior developers spend hours context-switching to review code, while junior developers wait for valuable feedback, stalling the delivery pipeline.

PR Insight solves this bottleneck by acting as an always-on, automated AI reviewer. The moment a developer opens or updates a Pull Request, the platform automatically scans the changes, summarizes file contents, and performs a deep analysis of code structure, performance, style, and security vulnerabilities. It delivers consistent, structured, and non-judgmental reviews in seconds.

By automating the initial pass of code reviews, PR Insight allows engineering teams to catch critical bugs, exposed secrets, and performance regressions before they ever reach production. Senior engineers can focus on higher-level architectural reviews, while team leads gain clear visibility into quality metrics and trends across all active repositories.

---

## Key Features

* **Automatic PR Reviews** — Triggers the moment a pull request is opened, updated, or redelivered via GitHub webhooks.
* **6-Dimension Code Scoring** — Rates every Pull Request on a scale of 0 to 100 across Security, Quality, Performance, Maintainability, Readability, and Documentation.
* **Security Issue Detection** — Identifies OWASP vulnerabilities, exposed API keys or secrets, and unsafe execution paths.
* **Side-by-side Diff Viewer** — View the exact code additions and deletions alongside the AI's specific inline findings and suggestions.
* **Real-time Agent Logs** — Monitor the multi-step AI code analysis pipeline live as it runs through files, structures commits, and computes metrics.
* **Developer Analytics** — Track average quality scores, reviews per day, and issues found grouped by developer and repository over time.
* **Email Notifications** — Automatically delivers a formatted HTML and Markdown code review report directly to configured team members.
* **Multi-user Support** — Multiple developers can log in securely using their individual GitHub accounts and view their own private repositories.
* **Role-based Access** — Admin and member roles with secure user credential isolation to protect private repository access.
* **Free & Paid LLM Tiers** — Configure a free tier powered by Google Gemini and NVIDIA NIM, or plug in your own paid keys for OpenAI, Gemini Pro, or DeepSeek.

---

## Architecture Overview

```
GitHub Webhook
      ↓
PR Insight Express Server (Node.js)
      ↓                    ↓
PostgreSQL DB        CodeWatch Engine (Python / FastAPI)
      ↓                    ↓
React Dashboard      LangChain LLM Chains
                           ↓
                    Gemini (summaries) + NVIDIA NIM (review)
                    — or —
                    Single paid provider (OpenAI / DeepSeek)
```

* **GitHub Webhook:** Triggers when PR events are fired and signs payloads using HMAC-SHA256.
* **Express Server (Node.js):** Coordinates authorization, handles the WebSocket connection, manages the PostgreSQL DB, and delegates jobs.
* **PostgreSQL Database:** Securely stores repository configurations, user session states, metrics, and code review records.
* **React Dashboard:** A high-performance web interface built with TypeScript that visualizes reviews, logs, and analytics.
* **CodeWatch Engine (Python/FastAPI):** Exposes REST API endpoints to ingest diffs, coordinate agent pipelines, and send emails.
* **LangChain LLM Chains:** Orchestrates prompt templates, summarizes files individually, and conducts the main code reviews.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + ShadCN UI |
| State | Zustand |
| Charts | Recharts |
| Backend | Node.js + Express + TypeScript |
| AI Engine | Python + FastAPI + LangChain |
| LLM (Free) | Google Gemini + NVIDIA NIM (llama-3.1-70b) |
| LLM (Paid) | OpenAI / DeepSeek / Gemini Pro |
| Database | PostgreSQL (Neon recommended) |
| Real-time | Socket.io |
| Auth | GitHub OAuth |
| Encryption | AES-256-GCM |

---

## Getting Started

### Prerequisites
Make sure you have the following installed on your machine:
* [Node.js](https://nodejs.org/) 18+
* [Python](https://www.python.org/) 3.11+
* [PostgreSQL](https://www.postgresql.org/) (or a free Serverless Postgres account at [Neon](https://neon.tech))
* A GitHub account

---

### Creating a GitHub OAuth App
PR Insight uses a GitHub App or OAuth App for user logins and webhook integrations. To create one:
1. Log in to your GitHub account and navigate to **Settings** → **Developer Settings** → **OAuth Apps** → **New OAuth App**.
2. Fill out the application details:
   * **Application Name:** `PR Insight`
   * **Homepage URL:** `http://localhost:5173`
   * **Authorization Callback URL:** `http://localhost:3001/auth/github/callback`
3. Click **Register Application**.
4. Copy the displayed **Client ID** and click **Generate a new client secret** to copy the **Client Secret**.

---

### Installation

Clone the repository and install the dependencies:

```bash
# Clone the repository
git clone https://github.com/yourusername/pr-insight.git
cd pr-insight

# Install all workspace dependencies
npm install

# Install Python dependencies for the CodeWatch AI engine
cd examples
pip install -r requirements.txt
cd ..
```

---

### Environment Setup

Create your environment configuration file:

```bash
# Copy the example environment template
cp .env.example .env
```

Open the newly created `.env` file and configure the core variables:

```dotenv
# Core Settings
MASTER_KEY="generate-with: openssl rand -hex 32"
DATABASE_URL="postgresql://user:pass@host:5432/prinsight"
GITHUB_CLIENT_ID="from-your-oauth-app"
GITHUB_CLIENT_SECRET="from-your-oauth-app"
APP_URL="http://localhost:5173"
SESSION_SECRET="generate-with: openssl rand -hex 32"
```

*Note: All other configuration inputs (LLM API keys, SMTP credentials, and individual user GitHub tokens) are entered securely in the setup wizard when you log in for the first time.*

---

### Running Locally

To run the application locally, start the frontend, backend, and AI engine in three separate terminal windows:

#### Terminal 1 — Start the Express Backend
```bash
npm run server
```

#### Terminal 2 — Start the React Frontend
```bash
npm run client
```

#### Terminal 3 — Start the CodeWatch AI Engine
```bash
cd examples
uvicorn api_server:app --port 8000 --reload
```

Navigate to `http://localhost:5173` in your web browser. The application will detect a fresh installation and launch the First-Time Setup Wizard automatically.

---

## First-time Setup Wizard

When you access PR Insight for the first time, you will login using your GitHub account. Following authorization, a guided onboarding wizard loads to configure your instance:

1. **LLM Configuration** — Choose between the **Free Tier** (uses a Gemini API key for summaries and an NVIDIA NIM API key for reviews) and the **Paid Tier** (uses a single provider key such as OpenAI or DeepSeek).
2. **Email Notifications** — Input your SMTP settings (server, port, sender email, and password) or Resend API key to automatically distribute HTML reports.

All input keys and credentials are encrypted using AES-256-GCM before storage. The first user to complete onboarding is automatically assigned the `admin` role.

---

## How It Works

1. A developer opens, updates, or manually redelivers a Pull Request on a GitHub repository.
2. GitHub sends a cryptographically signed webhook payload to the PR Insight Node server.
3. The server validates the signature, extracts the user mapping, and queues the review.
4. The Python CodeWatch engine fetches the changed file segments and diff content via the GitHub API.
5. LangChain LLM chains construct brief summaries for each updated file.
6. A comprehensive code review evaluates security vulnerabilities, maintainability, and code style.
7. PR Insight scores the PR across 6 key metrics (0 to 100).
8. The database writes the review metrics, issues lists, and final summary report.
9. The React dashboard updates in real-time using Socket.io to present the final analysis.
10. An HTML email containing the Markdown review is distributed via the configured Resend API or SMTP server.

---

## LLM Tier Comparison

```
Free Tier                          Paid Tier
─────────────────────────────      ─────────────────────────────
Gemini API (summaries)             Single provider for everything
NVIDIA NIM (code review)           OpenAI / Gemini Pro / DeepSeek
2 API keys required                1 API key required
Rate limited (12s throttle)        No throttling
Cost: $0                           Cost: based on usage
Good for: individuals, testing     Good for: teams, production
```

---

## Deployment

### Deploy to Railway (Recommended)

1. Install the Railway CLI:
   ```bash
   npm install -g @railway/cli
   ```
2. Log in and deploy:
   ```bash
   railway login
   railway init
   railway up
   ```
3. Set your environment variables in the Railway dashboard using the values configured in your local `.env` file.

---

### Database Setup

We recommend using [Neon](https://neon.tech) for a free, serverless PostgreSQL database:

```
Free tier provides:
→ 0.5 GB storage capacity
→ Serverless PostgreSQL scaling
→ Sufficient capacity for early-stage engineering teams
```

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `MASTER_KEY` | ✅ | 32-character hex string for encrypting user API keys (AES-256-GCM). |
| `DATABASE_URL` | ✅ | Connection string pointing to your PostgreSQL database. |
| `GITHUB_CLIENT_ID` | ✅ | Client ID from your registered GitHub OAuth App. |
| `GITHUB_CLIENT_SECRET` | ✅ | Client Secret from your registered GitHub OAuth App. |
| `APP_URL` | ✅ | The base URL where your frontend is hosted. |
| `SESSION_SECRET` | ✅ | Secret string used to sign session cookies. |
| `REAL_DATA_THRESHOLD` | ❌ | Minimum PR count before the app ends demo simulation mode (default: `10`). |
| `NODE_ENV` | ❌ | Set to `production` when building for a live deployment. |

---

## Security

* **AES-256-GCM Encryption:** All user credentials, LLM keys, and custom email integrations are encrypted at rest using AES-256-GCM.
* **Webhook Signature Verification:** Webhook payloads incoming from GitHub are validated using HMAC-SHA256 to ensure authenticity.
* **httpOnly Sessions:** Session tokens are securely transmitted and stored as `httpOnly`, `sameSite`, and `secure` HTTP cookies to prevent XSS leaks.
* **Data Isolation:** Repository access is isolated at the query layer. Users cannot view analytics, PRs, or reviews belonging to another user.
* **Credential Protection:** Admin roles can manage tier configurations and review usage metadata but cannot decrypt or read another user's API tokens.

---

## Contributing

Contributions are welcome. Please open an issue first to discuss what you would like to change.

1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/your-feature`).
3. Commit your changes (`git commit -m 'Add your feature'`).
4. Push to the branch (`git push origin feature/your-feature`).
5. Open a Pull Request.

---

## License

MIT License — see [LICENSE](./LICENSE) for details.

---

## Built With

* [CodeDog / CodeWatch](https://github.com/codedog-ai/codedog) — The underlying AI review engine.
* [Anthropic Claude](https://anthropic.com) — AI assistance during development.
* [LangChain](https://langchain.com) — LLM orchestration framework.
* [ShadCN UI](https://ui.shadcn.com) — UI component library.
* [Neon](https://neon.tech) — Serverless PostgreSQL database.