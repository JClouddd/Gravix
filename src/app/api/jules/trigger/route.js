import { triggerTask } from "@/lib/julesClient";
import { readFile } from "fs/promises";
import { join } from "path";
import { logRouteError } from "@/lib/errorLogger";
import { adminDb } from "@/lib/firebaseAdmin";

/**
 * POST /api/jules/trigger — Trigger a Jules task with file-level lock protection
 *
 * Sends Jules the GEMINI.md context + specific file paths + acceptance criteria.
 * Before creating a session, checks Firestore for active file locks to prevent
 * two sessions from editing the same files simultaneously.
 *
 * Body params:
 *   - prompt: string (required) — what Jules should do
 *   - title: string (optional) — task title
 *   - files: string[] (optional) — specific file paths to focus on
 *   - fileLocks: string[] (optional) — files this task WILL MODIFY (for collision prevention)
 *   - autoApprove: boolean (optional, default true) — skip plan approval
 *   - acceptanceCriteria: string (optional) — what "done" looks like
 *   - forceNoQueue: boolean (optional) — skip lock check, force create
 *
 * GET /api/jules/trigger — View the file lock queue
 */

export async function GET() {
  // File locks are deprecated in favor of Git-Native concurrency.
  // Returning empty queues to maintain backwards compatibility with dashboard UI.
  return Response.json({
    active: 0,
    queued: 0,
    activeLocks: [],
    queuedTasks: [],
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      prompt,
      title,
      files = [],
      fileLocks = [],
      autoApprove = true,
      acceptanceCriteria = "",
      forceNoQueue = false,
      _pipelineId = null,
      _waveNumber = null,
    } = body;

    if (!prompt) {
      return Response.json({ error: "prompt is required" }, { status: 400 });
    }

    // ── FILE LOCKS DEPRECATED ────────────────────────────────
    // We now rely on GitHub Actions (jules-auto-merge.yml) to natively
    // check for file overlap and Git to handle concurrent merges.
    // All tasks execute immediately without being queued locally.

    // ── BUILD ENRICHED PROMPT ────────────────────────────────
    let enrichedPrompt = "";

    // Inject GEMINI.md context so Jules knows the project conventions
    try {
      const geminiMdPath = join(process.cwd(), ".gemini", "GEMINI.md");
      const geminiMd = await readFile(geminiMdPath, "utf-8");
      enrichedPrompt += `## Project Context\n${geminiMd}\n\n`;
    } catch {
      // GEMINI.md not available — proceed without it
      enrichedPrompt += "## Project Context\nGravix — Next.js 16 app on Firebase App Hosting. Deploy target: https://gravix--antigravity-hub-jcloud.us-east4.hosted.app/\n\n";
    }

    // Add the actual task
    enrichedPrompt += `## Task\n${prompt}\n\n`;

    // If specific files are mentioned, highlight them
    if (files.length > 0) {
      enrichedPrompt += `## Files to Focus On\n`;
      files.forEach((f) => {
        enrichedPrompt += `- \`${f}\`\n`;
      });
      enrichedPrompt += "\n";
    }

    // Add acceptance criteria if provided
    if (acceptanceCriteria) {
      enrichedPrompt += `## Acceptance Criteria\n${acceptanceCriteria}\n\n`;
    }

    // Add standard rules for Jules
    enrichedPrompt += `## Rules
- ZERO REACT CODING. Do NOT write or modify .js/.jsx React components for UI features.
- Instead of writing React code, you MUST output UI structures as JSON Schemas and push them to Firestore (collection: dynamic_ui).
- The Hub uses a Headless DynamicRenderer to build the UI from your JSON schemas.
- Only modify backend scripts, APIs, or configuration files.
- Run \`npx next lint\` before committing to catch errors.
- Create a single-purpose PR with a clear title.
- Write commit messages following conventional commits (feat:, fix:, chore:, docs:).
- Never run \`npm run build\` — Firebase App Hosting handles builds.
`;

    const result = await triggerTask({
      prompt: enrichedPrompt,
      title: title || prompt.slice(0, 60),
      repo: "JClouddd/Gravix",
      autoApprove,
    });

    return Response.json({
      success: true,
      queued: false,
      ...result,
      contextInjected: true,
      filesTargeted: files,
    });
  } catch (error) {
    console.error("[/api/jules/trigger POST]", error);
    logRouteError("jules", "/api/jules/trigger error", error, "/api/jules/trigger");

    if (error.message.includes("JULES_API_KEY")) {
      return Response.json({
        success: false,
        error: "JULES_API_KEY not configured",
      }, { status: 503 });
    }

    return Response.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
