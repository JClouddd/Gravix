# Gravix

## Overview
Gravix is a Google-native AI operating system. It orchestrates 7 named agents (Conductor, Forge, Scholar, Analyst, Courier, Sentinel, Builder) through a visual command center, manages knowledge ingestion, client projects, and provides a unified interface for all Google Workspace and Cloud services.

## Setup
```bash
npm install
npm run dev
```

## Architecture
- **Framework:** Next.js 16 App Router (JavaScript, no TypeScript)
- **API Routes:** `src/app/api/`
- **Components:** `src/components/`
- **Modules:** `src/components/modules/`
- **Shared Libraries:** `src/lib/`
- **Auth:** Firebase Authentication
- **Database:** Cloud Firestore
- **AI:** Gemini 3.1 Pro / Flash via centralized `geminiClient.js`
- **Agents:** Vertex AI Agent Builder + ADK
- **Hosting:** Vercel (free tier)
- **Notifications:** Firebase Cloud Messaging (FCM)

## Module Structure (9 modules)
1. **Home** — Dashboard: credit bar, agent summary, recent activity
2. **Planner** — Calendar + Tasks combined (Courier-managed)
3. **Email** — Gmail inbox, AI classification, smart compose
4. **Agents** — Orchestrator: cards, workflow visual, task board, Sentinel
5. **Knowledge** — Brain Vault + Ingestion staging + Scholar chat
6. **Clients** — Client Manager: profiles, projects, intake, billing
7. **Finance** — Income tracker + Cost dashboard + Credit allocation
8. **Colab** — Notebook runner + Results viewer
9. **Settings** — PWA, notifications, agent modes, System Registry

## Standards
- Plain JavaScript (no TypeScript)
- `Response.json()` for all API responses
- Always validate inputs and check env vars
- Include retry logic for external API calls
- Error boundaries on every module
- Loading skeletons (never blank screens)
- Cost estimation before expensive operations
- All UI must be mobile responsive (44px touch targets)
- Use `vitest` for tests
- Dark mode primary, Inter font, curated HSL color palette

## GCP Project
- **ID:** `antigravity-hub-jcloud`
- **Name:** Gravix
- **Service Account:** `gravix-hub@antigravity-hub-jcloud.iam.gserviceaccount.com`
- **Region:** `us-central1`

## Firestore Collections
```
agents/        — Agent configs, status, execution history
clients/       — Client profiles, projects, billing
costs/         — API usage tracking, credit allocation
email/         — Cached email classifications
ingestion/     — Staging area for Scholar review
knowledge/     — Knowledge Agent outputs, doc summaries
notifications/ — FCM notification history
settings/      — Per-user module configs
tasks/         — Agent-generated and user tasks
system_registry/ — Forge-managed integration status
```
