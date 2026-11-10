# PACTPAY: AI-Powered Payment Firewall for the Agentic Economy

> **"Let AI decide. Let humans authorize. Let PayPal execute."**

---

## 🛡️ Overview

**PACTPAY** is a production-grade financial firewall designed for the autonomous agentic economy. As AI agents and autonomous workflows gain autonomy to negotiate, select, and procure goods and services, organizations face unprecedented financial exposure from malfunctioning loops, rogue prompts, and unauthorized payment captures.

PACTPAY introduces a zero-trust architecture where **AI proposes**, **deterministic rules govern**, **humans retain sovereign authorization**, and **PayPal executes** verified transactions.

---

## 🏛️ Architecture & Pipeline

```text
┌─────────────────────────────────┐
│     Autonomous Agent / User     │  "Buy a Logitech MX Master 3S under ₹9,000 on Amazon"
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│ 1. AI Purchase Assistant        │  Gemini 3.8 Flash
│    • Product Extraction         │  Extracts budget, estimated price, currency, merchant,
│    • Category & Urgency Triage  │  and structured purchase intent.
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│ 2. Payment Guardian Firewall    │  Deterministic Backend Engine (Zero AI hallucinations)
│    • Per-Transaction Limit Check│  Enforces spending caps, daily quotas, merchant blacklists,
│    • Cumulative Quota Guard     │  duplicate transaction detection (15-min TTL window),
│    • Whitelist / Blacklist Guard│  and stated budget ceilings.
│    • Risk Scoring (0–100)       │
└────────────────┬────────────────┘
                 │ (Passed Guardian Check)
                 ▼
┌─────────────────────────────────┐
│ 3. Human Authorization Gate     │  Mandatory Sovereign Checkpoint
│    • Identity Sign-off          │  AI is strictly prohibited from capturing funds.
│    • Audit Notes & Review       │  A human FinTech Risk Officer must explicitly sign.
└────────────────┬────────────────┘
                 │ (Signed & Approved)
                 ▼
┌─────────────────────────────────┐
│ 4. PayPal Sandbox Gateway       │  PayPal REST API v2
│    • Server-Side Basic Auth     │  https://api-m.sandbox.paypal.com/v2/checkout/orders
│    • Idempotent Order Capture   │  Secrets never exposed to client; actual PayPal response
│    • Webhook Verification       │  verified before ledger recording.
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│ 5. Ledger & Immutable Audit     │  Firebase Firestore & AG Grid Community
│    • Real-time Firestore sync   │  Searchable, sortable, and exportable ledger with SHA-256
│    • Cryptographic audit proof  │  tamper-evident audit receipts.
└─────────────────────────────────┘
```

---

## 🚀 Key Features

### 1. AI Purchase Assistant (Gemini 3.8 Flash)
- Natural language input: users or autonomous agents input queries like *"Order 3 ergonomic mice from Amazon under ₹4,500"*.
- Intelligent entity extraction powered by `@google/genai` (product, merchant, budget, estimated amount, currency, category, urgency).

### 2. Payment Guardian Firewall
- 6 deterministic rules executed before human sign-off:
  1. **Amount & Budget Check**: Confirms merchant price does not exceed declared budget.
  2. **Per-Transaction Spending Limit**: Verifies amount is below user-configured policy cap.
  3. **Daily Cumulative Spending Quota**: Tracks running daily spending in Firestore against ceiling.
  4. **Merchant Whitelist / Blacklist Guard**: Flags restricted vendors (e.g. gambling, darknet markets, crypto drains).
  5. **Duplicate Order Guard**: Prevents autonomous agents from spamming identical orders within a configurable time window.
  6. **TTL Freshness Guard**: Expires stale proposals.

### 3. Human Authorization Gate
- **Zero Autonomous Execution**: Autonomous systems cannot approve or capture payments.
- Reviewer inspects Guardian risk breakdown, merchant details, and price before granting explicit approval or rejection.

### 4. Transaction Management (AG Grid Community v36)
- Dark navy themed data grid with:
  - Column sorting, filtering (text, numbers, dates), and resizing.
  - Multi-column quick filter search.
  - Status filter tabs: `All`, `PayPal Confirmed`, `Firewall Blocked`, `Pending Execution`.
  - Merchant dropdown filter and reset controls.
  - Export capabilities: **Export CSV** and **Export JSON**.
  - Interactive **Audit Receipt Modal** with one-click copy for Transaction IDs and cryptographic SHA-256 audit hashes.

### 5. FinTech Analytics & Threat Radar
- Interactive SVG timeline chart comparing authorized spend vs. blocked threats across time.
- KPI metric cards: Total spend, capital protected, average transaction size, and human authorization ratio.
- Merchant concentration distribution bars.
- Guardian rule deflection frequency matrix.

### 6. Firebase Firestore Persistence & Security Rules
- Multi-collection persistence:
  - `purchaseRequests`: proposals and approvals.
  - `transactions`: verified PayPal captures and blocked attempts.
  - `auditLogs`: immutable chronological ledger.
  - `guardianPolicy`: active spending thresholds and merchant permissions.
- Hardened Firestore Security Rules (`firestore.rules`) enforcing tenant isolation, field schema constraints, and immutable audit logs (`allow update, delete: if false`).

---

## 🔑 Environment Configuration

Create a `.env` file in the root directory based on `.env.example`:

```bash
# Gemini AI Configuration (Required for purchase assistant)
GEMINI_API_KEY="your_gemini_api_key_here"

# PayPal Sandbox REST API v2 Credentials
# Required for live PayPal Sandbox order creation and capture
PAYPAL_CLIENT_ID="your_paypal_sandbox_client_id"
PAYPAL_CLIENT_SECRET="your_paypal_sandbox_client_secret"

# Optional: PayPal Webhook ID for webhook signature verification
PAYPAL_WEBHOOK_ID=""

# Application Host URL (Injected by hosting environment)
APP_URL="http://localhost:3000"
```

### How to Obtain PayPal Sandbox Credentials:
1. Visit the [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/applications/sandbox).
2. Under **Apps & Credentials**, toggle to the **Sandbox** tab.
3. Select an existing Sandbox app or create a new one named `PACTPAY-Sandbox`.
4. Copy the **Client ID** and **Secret**.
5. Add them to your environment variables as `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET`.

> **Note on Zero False-Reporting**: PACTPAY never generates fake successful payment captures. If credentials are not configured, the interface clearly marks PayPal Sandbox as `Pending Config` while allowing full testing of the AI Assistant, Guardian Firewall, and Firestore persistence.

---

## 🛠️ Installation & Local Development

### Prerequisites
- Node.js 18+ or 20+
- npm or yarn

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/your-username/pactpay.git
cd pactpay

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env with your GEMINI_API_KEY and PayPal credentials

# 4. Start the full-stack development server
npm run dev

# 5. Access the application
# Open http://localhost:3000 in your browser
```

### Build & Production

```bash
# Compile and bundle the application
npm run build

# Start the production server
npm start
```

---

## 🔒 Security Principles

1. **AI Never Executes**: AI models lack legal capacity and fiduciary accountability. Gemini assists with intent parsing, but cannot approve payments.
2. **Deterministic Rules Over AI Judgment**: Financial guardrails (spending limits, blacklists, duplicates) are evaluated in deterministic code, never by prompt instructions alone.
3. **Server-Side Secret Isolation**: PayPal OAuth client secrets and credentials reside strictly in Node.js server memory and are never bundled into client JavaScript.
4. **Immutable Audit Trails**: Every state change produces an immutable audit record with cryptographic hash proofs in Firestore.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
