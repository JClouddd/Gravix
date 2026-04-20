# Gravix — Jules Agent Instructions

## Project Overview
Gravix is a Next.js 16 agentic operating system deployed on **Firebase App Hosting**.

## Deployment
- **Platform:** Firebase App Hosting (NOT Vercel)
- **Production URL:** `https://gravix--antigravity-hub-jcloud.us-east4.hosted.app/`
- **Auto-deploy:** Merging to `main` triggers Firebase App Hosting build automatically
- **GCP Project:** `antigravity-hub-jcloud`
- **Region:** `us-east4`

## Build Rules
1. Never run `npm run build` locally — always let Firebase App Hosting build in the cloud.
2. All environment secrets are configured in `apphosting.yaml` pointing to GCP Secret Manager.
3. The app uses Next.js App Router (`src/app/`).

## Architecture
- `src/components/modules/` — 9 lazy-loaded feature modules
- `src/app/api/` — 56 API routes across 19 groups  
- `src/lib/` — Shared utilities (Gemini, Firebase, Google Auth, Automation Engine)
- `apphosting.yaml` — Firebase App Hosting config with secrets

## Testing
- Run `npm run dev` for local dev server (quick UI checks only)
- Run `npx next lint` for linting before commits
- Never attempt full production builds locally (8GB RAM machine)

## Key Conventions
- All Firestore writes go through API routes (client-side is read-only)
- OAuth tokens stored in Firestore `settings/google_oauth`
- Gemini calls routed through `src/lib/geminiClient.js` with complexity tiers
