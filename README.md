# PACTPAY: AI-Powered Payment Firewall for the Agentic Economy

> **"Let AI decide. Let humans authorize. Let PayPal execute."**

---

## 📌 Table of Contents
- [Project Overview & Problem Statement](#-project-overview--problem-statement)
- [System Architecture](#-system-architecture)
- [Technologies Used](#-technologies-used)
- [Key Features](#-key-features)
- [Integration Status & Zero-Simulation Policy](#-integration-status--zero-simulation-policy)
- [Required Environment Variables](#-required-environment-variables)
- [PayPal Sandbox Configuration](#-paypal-sandbox-configuration)
- [Installation & Setup](#-installation--setup)
- [Security Features & Limitations](#-security-features--limitations)
- [Step-by-Step Demo Instructions](#-step-by-step-demo-instructions)
- [License](#-license)

---

## 🛡️ Project Overview & Problem Statement

### The Problem
Autonomous AI agents, generative copilots, and robotic process automations (RPAs) are rapidly transitioning from conversational advisors to active economic actors capable of procuring services, ordering hardware, paying cloud bills, and managing subscriptions.

However, granting autonomous AI direct access to credit cards, payment gateways, or corporate bank accounts creates catastrophic financial risk:
1. **Hallucination & Misinterpretation**: AI models can hallucinate prices, miscalculate currency exchange rates, or order the wrong SKUs.
2. **Infinite Autonomous Loops**: A looping agent can issue dozens of duplicate transactions in seconds, exhausting credit limits.
3. **Prompt Injection & Rogue Vendors**: Adversaries can steer agents toward malicious or unverified merchant checkout endpoints.
4. **Lack of Legal Fiduciary Capacity**: AI systems cannot legally enter into contracts or be held liable for payment authorizations.

### The Solution: PACTPAY
**PACTPAY** is a dedicated **AI Payment Firewall** that establishes a strict zero-trust boundary:
- **AI Decides (Assists)**: Gemini 3.8 Flash extracts structured intent from natural language instructions.
- **Guardian Governs**: A deterministic, rule-based firewall scrutinizes budget thresholds, merchant blacklists, running daily quotas, duplicate windows, and request freshness.
- **Humans Authorize**: A human FinTech Risk Officer holds sovereign authority; no transaction can proceed without explicit cryptographic sign-off.
- **PayPal Executes**: A secure server-side PayPal REST v2 gateway captures funds only upon verified human approval.

---

## 🏛️ System Architecture

```text
┌─────────────────────────────────┐
│     Autonomous Agent / User     │  "Buy a wireless keyboard under ₹2,000 on Amazon"
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│ 1. AI Purchase Assistant        │  Gemini 3.8 Flash (@google/genai)
│    • Product Intent Extraction  │  Parses budget, estimated amount, merchant,
│    • Category & Urgency Triage  │  currency, and purchase reasoning.
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│ 2. Payment Guardian Firewall    │  Deterministic Backend Engine (TypeScript)
│    • Stated Budget Check        │  Rule 1: Price <= Budget
│    • Per-Transaction Limit Check│  Rule 2: Price <= Policy Max (e.g. ₹15,000)
│    • Daily Cumulative Limit     │  Rule 3: Daily Total + Amount <= ₹50,000
│    • Merchant Whitelist/Blacklist│ Rule 4: Disallows restricted/blacklisted vendors
│    • Duplicate Order Guard      │  Rule 5: Blocks identical requests within 15 mins
│    • TTL Freshness Guard        │  Rule 6: Auto-expires stale proposals
└────────────────┬────────────────┘
                 │ (Passed Guardian Check)
                 ▼
┌─────────────────────────────────┐
│ 3. Human Authorization Gate     │  Mandatory Sovereign Checkpoint
│    • Identity Verification      │  AI is strictly blocked from payment capture.
│    • Reason & Sign-Off Notes    │  Officer reviews details and signs/rejects.
└────────────────┬────────────────┘
                 │ (Approved by Human)
                 ▼
┌─────────────────────────────────┐
│ 4. PayPal Sandbox Gateway       │  PayPal REST API v2 (Server-side)
│    • Basic OAuth (Base64)       │  POST https://api-m.sandbox.paypal.com/v2/checkout/orders
│    • Human Auth Token Check     │  POST /v2/checkout/orders/{id}/capture
│    • Idempotent Execution       │  Requires PAYPAL_CLIENT_ID & PAYPAL_CLIENT_SECRET.
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│ 5. Ledger & Immutable Audit     │  Firebase Firestore & AG Grid Community
│    • Multi-tenant collections   │  Real-time Firestore synchronization.
│    • Tamper-Evident SHA-256     │  Searchable, sortable, filterable AG Grid ledger
│    • Export to CSV / JSON       │  with cryptographically hashed audit receipts.
└─────────────────────────────────┘
```

---

## 💻 Technologies Used

| Technology | Role in PACTPAY |
| :--- | :--- |
| **React 19** | Modern frontend framework with component modularity and responsive UI |
| **TypeScript** | End-to-end type safety across both frontend and Express backend |
| **Gemini AI (`@google/genai`)** | Gemini 3.8 Flash model for structured natural-language purchase intent understanding |
| **Firebase Firestore** | Real-time cloud database persisting purchase requests, transactions, policies, and audit logs |
| **Firebase Authentication** | Google OAuth and secure officer session identity verification |
| **PayPal Sandbox REST v2** | Server-side payment engine with OAuth token caching, order creation, and capture |
| **AG Grid Community v36** | High-performance data grid with multi-column filtering, quick search, and CSV/JSON export |
| **Express & Node.js** | Full-stack server proxy isolating credentials and running deterministic firewall rules |
| **Tailwind CSS v4** | Deep navy fintech visual palette, responsive layout, and mobile drawer navigation |
| **Lucide React** | Consistent fintech icons across desktop and mobile views |

---

## ⚡ Key Features

### 1. FinTech Overview Dashboard
- Aggregated financial metrics: Total spend, pending approvals, completed orders, and firewall-deflected capital.
- Active Firewall Radar with daily spending quota gauge.
- Responsive design with instant shortcuts to the Assistant and Human Gate.

### 2. AI Purchase Assistant
- Enter unstructured prompts (e.g. *"Buy a Logitech MX Master 3S wireless mouse under ₹9,000 on Amazon"*).
- Instant multi-step visual pipeline: **AI Intent Parsing** → **Guardian Evaluation** → **Gate Ready**.
- Preloaded sample prompts to test safe requests, budget breaches, blacklisted merchants, and duplicate orders.

### 3. Payment Guardian Firewall & Policy Manager
- 6 deterministic rule validations before any request reaches human review.
- Custom policy editor: adjust per-transaction limits, daily spending quotas, duplicate detection windows (1–120 minutes), and merchant blacklists.
- Real-time updates saved directly to Firebase Firestore.

### 4. Human Authorization Gate (Zero-Trust Principle)
- Displays full proposal details, merchant reputation, price versus budget, and Guardian risk score (0–100).
- Authorize requests with custom review notes or reject with documented justifications.
- Strict authorization token enforcement: unauthorized or unapproved payments return `403 Forbidden`.

### 5. Transaction Management with AG Grid Community
- Sortable and resizable columns with pinned transaction ID and action columns.
- Global quick-filter search and status tabs (`All`, `PayPal Confirmed`, `Firewall Blocked`, `Pending Execution`).
- Merchant dropdown filter.
- One-click **Export CSV** and **Export JSON**.
- **Audit Receipt Modal**: Inspects transaction details, PayPal order and capture IDs, and SHA-256 cryptographic audit proofs with copy-to-clipboard functionality.

### 6. Tamper-Evident Audit Trail
- Chronological, immutable log of all actions (`AI_INTENT_PARSED`, `GUARDIAN_CHECK_EVALUATED`, `HUMAN_APPROVAL_GRANTED`, `HUMAN_REJECTION_ISSUED`, `PAYMENT_FIREWALL_BLOCKED`, `POLICY_UPDATED`).
- Filter by event type and expand JSON event payloads.

### 7. FinTech Analytics & Threat Radar
- Interactive SVG timeline chart showing daily authorized spend against blocked threats.
- Time range filtering: **7 Days**, **30 Days**, and **All Time**.
- Merchant concentration breakdown and rule violation frequency heatmap.

### 8. Responsive Mobile Navigation
- Fixed mobile bottom navigation bar providing instant thumb access to **Home**, **Assistant**, **Approvals**, **Ledger**, and **All Modules Menu**.
- Slide-in drawer for policy management, audit logs, and gateway consoles on mobile devices.

---

## 🔍 Integration Status & Zero-Simulation Policy

PACTPAY enforces a strict **Zero False-Reporting Policy**:
- **Fully Implemented & Working**:
  - Gemini 3.8 Flash purchase intent parsing
  - Payment Guardian 6-point deterministic firewall engine
  - Human Authorization Gate with review notes and rejection workflows
  - Firebase Firestore persistence (`purchaseRequests`, `transactions`, `guardianPolicy`, `auditLogs`)
  - Firestore Security Rules (`firestore.rules`)
  - AG Grid Community transaction management, filtering, and exports
  - Complete server-side PayPal REST v2 integration code (`server/paypal.ts`)
- **Pending Configuration**:
  - Live PayPal Sandbox capture requires user-supplied credentials (`PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET`).
  - **No Simulated Payments**: PACTPAY will **never** generate fake completed PayPal captures. When credentials are unconfigured, the application marks PayPal as `Pending Config` in the navigation bar and approval gate while keeping all other features completely functional.

---

## 🔑 Required Environment Variables

Configure these variables in your root `.env` file:

```bash
# =================================================================
# 1. Gemini AI Configuration (Required for purchase assistant)
# =================================================================
GEMINI_API_KEY="your_gemini_api_key_here"

# =================================================================
# 2. PayPal Developer Sandbox REST API v2 Credentials
# =================================================================
# Required for live PayPal Sandbox order creation and payment capture.
# When omitted, PACTPAY safely operates in "Pending Config" mode.
PAYPAL_CLIENT_ID="your_paypal_sandbox_client_id"
PAYPAL_CLIENT_SECRET="your_paypal_sandbox_client_secret"

# Optional: PayPal Webhook ID for webhook signature verification
PAYPAL_WEBHOOK_ID=""

# =================================================================
# 3. Application Hosting Configuration
# =================================================================
APP_URL="http://localhost:3000"
```

---

## 💳 PayPal Sandbox Configuration

To execute real test payments on PayPal Sandbox:

1. Log in to the [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/applications/sandbox).
2. Navigate to **Apps & Credentials** and toggle the switch to **Sandbox**.
3. Click **Create App** (or select an existing app) and name it `PACTPAY-Sandbox`.
4. Copy your **Client ID** and **Secret**.
5. Set them in your `.env` file:
   ```bash
   PAYPAL_CLIENT_ID="<your-client-id>"
   PAYPAL_CLIENT_SECRET="<your-client-secret>"
   ```
6. Restart the application. The navigation badge will immediately switch from `PayPal Sandbox (Pending Config)` to `PayPal Sandbox (Live)`.

---

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18.x or 20.x
- npm 9+ or yarn

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/your-username/pactpay.git
cd pactpay

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Open .env and add your GEMINI_API_KEY and PayPal credentials

# 4. Start the full-stack development server
npm run dev

# 5. Open the application in your browser
# Navigate to http://localhost:3000
```

### Production Build

```bash
# Type-check and compile frontend and backend bundles
npm run build

# Start the full-stack production server
npm start
```

---

## 🔒 Security Features & Limitations

### Security Features
1. **Zero Autonomous Execution**: AI models cannot authorize or capture payments under any circumstances.
2. **Deterministic Code Isolation**: Financial ceilings and duplicate checks run in deterministic TypeScript code rather than LLM prompts.
3. **Server-Side Secret Custody**: PayPal client secrets reside strictly on the server and are never exposed to the client bundle.
4. **Idempotency Safeguards**: Every payment execution is bound to a unique request ID and tracked to prevent double-charging.
5. **Hardened Firestore Rules**: Fine-grained Attribute-Based Access Control (ABAC) restricts reads/writes to document owners and marks audit logs as immutable (`allow update, delete: if false`).

### Limitations
- **Sandbox Environment**: Currently configured for PayPal Sandbox (`api-m.sandbox.paypal.com`). Production deployment requires switching to live PayPal endpoints.
- **Single-Currency Base**: Guardian policies track cumulative quotas in the policy's configured currency (e.g. INR or USD). Multi-currency normalization requires external FX rate feeds.
- **Single Officer Sign-off**: Current version supports single-officer sign-off; multi-party multi-signature thresholds are part of the future roadmap.

---

## 🧪 Step-by-Step Demo Instructions

Follow this guided walkthrough to test PACTPAY end-to-end:

### Scenario 1: Safe AI Purchase Request
1. Click **AI Purchase Assistant** in the sidebar (or bottom bar on mobile).
2. Click the sample prompt: *"Buy a wireless keyboard under ₹2,000."*
3. Click **Submit Request to Firewall**.
4. Observe Gemini extracting the product, budget (₹2,000), currency (INR), and category.
5. Observe Payment Guardian evaluating 6 checks and issuing an **APPROVED_BY_GUARDIAN** status (Risk Score: 10/100).
6. Click **Authorize & Pay** to navigate to the **Human Authorization Gate**.
7. Enter an authorization note (e.g. *"Approved for remote office"*) and click **Authorize & Sign**.
8. The request status updates in Firestore to `human_approved`.

### Scenario 2: Firewall Defense (Restricted Merchant & Budget Overrun)
1. In the **AI Purchase Assistant**, select the test prompt:
   *"Purchase VIP tokens on BetOnline casino for ₹50,000."*
2. Click **Submit Request to Firewall**.
3. **Result**: Payment Guardian intercepts the request and blocks it:
   - Flagged by **Merchant Whitelist / Blacklist Guard** (BetOnline is blacklisted).
   - Flagged by **Per-Transaction Spending Limit** (₹50,000 exceeds ₹15,000 cap).
   - High Risk Score (95/100) triggers auto-rejection.
4. The request is permanently archived as `guardian_blocked` and logged in the Firestore audit trail.

### Scenario 3: Duplicate Request Protection
1. Submit *"Buy a wireless keyboard under ₹2,000."*
2. Immediately submit the exact same prompt again within 15 minutes.
3. **Result**: Payment Guardian's **Duplicate Order Guard** detects the identical merchant and item within the time window and flags the duplicate attempt.

### Scenario 4: Ledger & Audit Receipt Inspection
1. Navigate to **Transactions (AG Grid)**.
2. Filter by status using the `Confirmed`, `Blocked`, or `Pending` tabs.
3. Use the global search box to find specific items.
4. Click **Receipt & Audit** on any row to open the cryptographic audit receipt.
5. Click **Copy** to copy the SHA-256 audit proof.
6. Click **CSV** or **JSON** in the toolbar to download an audit export.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) - see the LICENSE file for details.

```text
Copyright (c) 2026 PACTPAY Contributors
```
