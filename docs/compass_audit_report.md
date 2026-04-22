# Compass Audit Report: Antigravity Hub Ecosystem

## System Health

Overall, the system correctly implements modularity with discrete roles for agent spawning, stream handling, and analytics. However, immediate architectural risks exist in terms of scalability, unhandled state transitions during streaming, and missing structural components explicitly referenced in documentation.

*   **Missing Core Components:** Several requested files, including `gravix-agent-engine/AgentSpawner.js`, `gravix-agent-engine/safety/Quarantine.js`, and `scripts/qa-agent.js`, are missing from the codebase. It appears the spawner logic has been rolled into `gravix-agent-engine/server.js`. The absence of a dedicated Quarantine safety layer suggests execution isolation for external payloads might be lacking or handled elsewhere opaquely.
*   **Data Inflation Risks:** The native deduction layer (`costTracker.js`) utilizes an unscalable read pattern that fetches all usage records in a rolling window on every dashboard summary load. This guarantees exponential read inflation in Firebase as the system scales.
*   **Race Conditions:** WebRTC media handlers in `twilio.js` have state flags that inadvertently discard incoming media chunks while an asynchronous authentication query is resolving, breaking high-frequency audio streams.

---

## Component Map

### 1. `gravix-agent-engine/server.js` (Agent Spawner Replacement)
Acts as the routing core replacing `AgentSpawner.js`.
*   **Functionality:** Exposes `spawnAgent()` to spin up a task payload. Dynamically routes task complexity payloads to `gemini-2.5-pro` (heavy) or `gemini-2.5-flash` (default).
*   **Integration:** Handles internal orchestration assignments without maintaining long-lived process management or sandboxing (expected to reside in `Quarantine.js`).

### 2. `gravix-agent-engine/websockets/twilio.js` (Stream Handler)
Manages the real-time WebRTC/WebSocket ingestion pipeline from Twilio streams.
*   **Functionality:** Receives WebSocket chunks, parses `media` payloads containing base64 audio buffers, and relays authenticated buffers to a Gemini connection via `sendTwilioAudioToGemini()`.
*   **Integration:** Interacts directly with Firestore (`adminDb.collection()`) on the *first* packet to query a biometric `voiceprint`, validating it against a placeholder `performDiarization()` stub.

### 3. `src/lib/costTracker.js` (Deduction Layer)
A native cost analytics and logging suite interacting with Firestore's `api_usage` collection.
*   **Functionality:** Coerces ambiguous token payloads into safe numeric formats, logs individual API runs via `logUsage()`, and aggregates windowed API usage trends via `getUsageSummary()`.
*   **Integration:** Called natively by Next.js API routes post-execution. Uses Firestore `FieldValue.serverTimestamp()` to sequence events.

### 4. `gravix-agent-engine/safety/Quarantine.js` & `scripts/qa-agent.js`
*   **Status:** Not Found. Execution isolation and standalone QA orchestration appear non-existent in the provided filesystem, presenting a severe risk for executing unverified agent outputs.

---

## Actionable Vulnerabilities

### 1. Twilio WebRTC Media Loss (Race Condition)
*   **Location:** `gravix-agent-engine/websockets/twilio.js` -> `handleTwilioStream()`
*   **Description:** The state machine utilizes `isAuthenticating` to prevent overlapping auth checks. When an unauthenticated packet arrives and `isAuthenticating` is true, the function explicitly returns: `if (isAuthenticating) return; // Drop or wait while authenticating`.
*   **Impact:** Because WebRTC chunks arrive at 20-50ms intervals and a Firestore lookup takes 100-300ms, dozens of audio chunks are permanently dropped at the beginning of every call. The Gemini model receives severely clipped initial audio.
*   **Remediation:** Implement an in-memory queue to buffer incoming media chunks while `isAuthenticating` is active, then flush the queue to Gemini once `isAuthenticated` resolves to true.

### 2. Firestore Read Collapse (Cost Inflation Risk)
*   **Location:** `src/lib/costTracker.js` -> `getUsageSummary()`
*   **Description:** The function queries the entire `api_usage` collection spanning the last 30 days (`q.get()`) to calculate the daily trend map and total month spend using client-side iteration (`querySnapshot.forEach`).
*   **Impact:** If the hub reaches 100,000 API calls a month, every single dashboard load triggers 100,000 document reads ($0.0362 per load). Ten dashboard refreshes will cost more than the API calls themselves, causing an exponential "Recursive Token Inflation" effect on database costs.
*   **Remediation:** Implement a Server-Side Aggregation pattern. Use a Firebase Cloud Function or native route to listen for `onCreate` in `api_usage` and increment distributed counters (e.g., `daily_spend_YYYY-MM-DD`, `monthly_spend_YYYY-MM`). Read the aggregate counters instead of raw documents.

### 3. Collapsible Task Identifiers
*   **Location:** `gravix-agent-engine/server.js` -> `spawnAgent()`
*   **Description:** If a task ID is not provided, it falls back to `` task-${Date.now()} ``.
*   **Impact:** `Date.now()` is not collision-resistant. If the engine spawns concurrent agents under high-frequency load, they will generate identical IDs, corrupting database persistence, cross-pollinating memory, or crashing the deployment.
*   **Remediation:** Import `crypto.randomUUID()` or a robust ID generator to append a nonce to the temporal prefix.

### 4. Absence of Security Boundary
*   **Location:** Missing `Quarantine.js`
*   **Description:** Agents interacting with file systems or orchestrating code lack a definitive `Quarantine` module.
*   **Impact:** Any generated code via `execute_sandbox_code` or `Colab` workflows might execute globally without explicit process isolation if the underlying `e2b/code-interpreter` boundary fails.
*   **Remediation:** Create the `Quarantine.js` schema wrapper to forcefully enforce resource limits, validate execution bounds before invoking external tools, and reject non-conforming AST outputs.
