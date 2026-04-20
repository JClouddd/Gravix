import { triggerTask } from "@/lib/julesClient";
import { readFile } from "fs/promises";
import { join } from "path";
import { logRouteError } from "@/lib/errorLogger";

/**
 * POST /api/jules/trigger — Trigger a Jules task with full context injection
 *
 * Sends Jules the GEMINI.md context + specific file paths + acceptance criteria
 * so Jules has everything needed to complete without asking questions.
 *
 * Body params:
 *   - prompt: string (required) — what Jules should do
 *   - title: string (optional) — task title
 *   - files: string[] (optional) — specific file paths for Jules to focus on
 *   - autoApprove: boolean (optional, default true) — skip plan approval
 *   - acceptanceCriteria: string (optional) — what "done" looks like
 */

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      prompt,
      title,
      files = [],
      autoApprove = true,
      acceptanceCriteria = "",
    } = body;

    if (!prompt) {
      return Response.json({ error: "prompt is required" }, { status: 400 });
    }

    // Build enriched prompt with project context
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

    return Response.json({
      success: true,
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
