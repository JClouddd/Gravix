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
  try {
    const db = adminDb();
    // Show active locks and queued tasks
    const [activeSnap, queueSnap] = await Promise.all([
      db.collection("jules_file_locks")
        .where("status", "==", "active")
        .get(),
      db.collection("jules_file_locks")
        .where("status", "==", "queued")
        .orderBy("createdAt", "asc")
        .get(),
    ]);

    const active = activeSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const queued = queueSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    return Response.json({
      active: active.length,
      queued: queued.length,
      activeLocks: active,
      queuedTasks: queued,
    });
  } catch (error) {
    console.error("[/api/jules/trigger GET]", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
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

    // Derive file locks from files if fileLocks not explicitly provided
    const effectiveLocks = fileLocks.length > 0 ? fileLocks : files;

    // ── FILE LOCK CHECK ──────────────────────────────────────
    if (effectiveLocks.length > 0 && !forceNoQueue) {
      const db = adminDb();

      // Get all active locks
      const activeSnap = await db
        .collection("jules_file_locks")
        .where("status", "==", "active")
        .get();

      const conflicts = [];
      const overlappingFiles = [];

      for (const doc of activeSnap.docs) {
        const lock = doc.data();
        const lockedFiles = lock.fileLocks || [];

        // Check for exact file match OR directory prefix overlap
        for (const myFile of effectiveLocks) {
          for (const theirFile of lockedFiles) {
            if (
              myFile === theirFile ||
              myFile.startsWith(theirFile + "/") ||
              theirFile.startsWith(myFile + "/")
            ) {
              conflicts.push({
                sessionId: lock.sessionId,
                title: lock.title,
                conflictingFile: theirFile,
                myFile,
              });
              overlappingFiles.push(myFile);
            }
          }
        }
      }

      if (conflicts.length > 0) {
        // QUEUE THIS TASK — don't create the Jules session yet
        const taskTitle = title || prompt.slice(0, 60);
        const queueDoc = await db.collection("jules_file_locks").add({
          status: "queued",
          title: taskTitle,
          prompt,
          files,
          fileLocks: effectiveLocks,
          autoApprove,
          acceptanceCriteria,
          blockedBy: conflicts.map((c) => c.sessionId),
          conflictDetails: conflicts,
          createdAt: new Date().toISOString(),
        });

        return Response.json({
          success: true,
          queued: true,
          queueId: queueDoc.id,
          reason: "File lock conflict detected — task queued for auto-trigger when locks clear",
          conflicts,
          overlappingFiles: [...new Set(overlappingFiles)],
        });
      }
    }

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
- Do NOT modify files outside the scope described above.
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

    // ── REGISTER FILE LOCKS ──────────────────────────────────
    if (effectiveLocks.length > 0) {
      try {
        const db = adminDb();
        await db.collection("jules_file_locks").add({
          status: "active",
          sessionId: result.sessionId,
          title: title || prompt.slice(0, 60),
          fileLocks: effectiveLocks,
          files,
          pipelineId: _pipelineId || null,
          waveNumber: _waveNumber ?? null,
          createdAt: new Date().toISOString(),
        });
      } catch (lockErr) {
        console.error("[/api/jules/trigger] Failed to register file locks:", lockErr.message);
        // Don't fail the task — locks are advisory
      }
    }

    return Response.json({
      success: true,
      queued: false,
      ...result,
      contextInjected: true,
      filesTargeted: files,
      fileLocksRegistered: effectiveLocks,
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
