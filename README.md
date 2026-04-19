# 🌌 Gravix
**Google-native AI operating system**

![CI](https://github.com/JClouddd/Gravix/actions/workflows/ci.yml/badge.svg)

---

## 🧐 What is Gravix?

Gravix is a comprehensive, personal AI operating system designed to streamline your workflows, manage knowledge, and interact intelligently with your digital ecosystem. Powered by a collaborative team of **7 specialized AI agents**, Gravix seamlessly orchestrates tasks across Google Workspace, cloud infrastructure, and your local environment to boost productivity.

---

## 🏗 Architecture

Gravix leverages a modern, serverless architecture to deliver high performance and deep integrations with the Google Cloud ecosystem.

```text
┌─────────────────────────────────────────────────────────┐
│                     Next.js 16 Frontend                 │
│      (Dashboard, Knowledge Engine, Client Manager)      │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│                      15 API Routes                      │
│             (Next.js App Router API endpoints)          │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│                    7 AI Agents Suite                    │
│ ┌─────────┐ ┌───────┐ ┌─────────┐ ┌─────────┐ ┌───────┐ │
│ │Conductor│ │ Forge │ │ Scholar │ │ Analyst │ │Courier│ │
│ └─────────┘ └───────┘ └─────────┘ └─────────┘ └───────┘ │
│             ┌──────────┐ ┌─────────┐                    │
│             │ Sentinel │ │ Builder │                    │
│             └──────────┘ └─────────┘                    │
└──────────────────────────┬──────────────────────────────┘
                           │
       ┌───────────────────┼───────────────────┐
       │                   │                   │
┌──────▼──────┐     ┌──────▼──────┐     ┌──────▼──────┐
│  Firebase/  │     │  Vertex AI  │     │ Google      │
│  Firestore  │     │ (Gemini 2.5)│     │ Workspace   │
└─────────────┘     └─────────────┘     └─────────────┘
```

---

## ✨ Features

- **📊 Dashboard:** A centralized command center for monitoring all your AI agents, tasks, and system health.
- **🧠 Knowledge Engine:** Seamlessly ingest, structure, and retrieve your personal and professional knowledge.
- **💰 Cost Tracking:** Monitor API usage and cloud costs in real-time.
- **🤖 Agent Orchestrator:** Manage and coordinate the 7 specialized AI agents (Conductor, Forge, Scholar, Analyst, Courier, Sentinel, Builder).
- **📅 Email/Calendar Integration:** Deeply integrated with Google Workspace to manage your communications and scheduling.
- **📓 Colab Notebooks:** Native integration to run, manage, and analyze Colab notebooks.
- **👥 Client Manager:** A built-in CRM to manage relationships, communications, and client-specific tasks.
- **📱 PWA Ready:** Install Gravix as a Progressive Web App for a native-like experience on any device.

---

## 🛠 Tech Stack

Gravix is built with cutting-edge technologies:

- **Frontend & API:** Next.js 16 (App Router)
- **AI Models:** Gemini 2.5 Pro & Gemini 2.5 Flash
- **Cloud Infrastructure:** Vertex AI
- **Database & Auth:** Firebase / Firestore
- **Hosting & Deployment:** Firebase App Hosting (Cloud Run + CDN)

---

## 🚀 Getting Started

Follow these steps to run Gravix locally on your machine.

### Prerequisites

Ensure you have Node.js 22 installed.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/JClouddd/Gravix.git
   cd Gravix
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables (see below).

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔐 Environment Variables

Create a `.env.local` file in the root directory and configure the following variables:

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Your Google Gemini API key for accessing the models. |
| `JULES_API_KEY` | Jules client API key (if applicable). |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase API key. |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain. |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID. |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket. |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID. |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase application ID. |

*(Note: Adjust the Firebase environment variables to match your actual Firebase configuration).*

---

## 🔒 Security

For detailed instructions on securing your Gravix installation, including setting up GCP Service Accounts and restricting API keys, please refer to the [Security Setup Guide](docs/SECURITY_SETUP.md).

---

## 📄 License

This project is licensed under the **MIT License**.
