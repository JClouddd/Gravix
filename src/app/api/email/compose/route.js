import { sendGmail, refreshAccessToken } from "@/lib/googleAuth";
import { generate } from "@/lib/geminiClient";
import { logUsage } from "@/lib/costTracker";
import { adminDb } from "@/lib/firebaseAdmin";

/**
 * POST /api/email/compose
 * Compose and send emails — optionally AI-drafted via Courier agent
 *
 * Body: { to, subject, body, aiDraft?: boolean, prompt?: string }
 */
export async function POST(request) {
  try {
    const { to, subject, body, aiDraft = false, prompt = "" } = await request.json();

    // If AI draft requested, use Courier agent to generate the email
    if (aiDraft && prompt) {
      const result = await generate({
        prompt: `Draft a professional email based on this request:\n\n"${prompt}"\n\nProvide:\n1. A clear subject line\n2. The email body in HTML format\n\nRespond in JSON: { "subject": "...", "body": "..." }`,
        systemPrompt: "You are Courier, the communications agent for Gravix. Draft professional, concise emails. Always respond with valid JSON containing subject and body fields.",
        complexity: "flash",
      });

      try {
        await logUsage({
          route: "/api/email/compose",
          model: result.model,
          modelTier: result.modelTier,
          inputTokens: result.tokens.input,
          outputTokens: result.tokens.output,
          totalTokens: result.tokens.total,
          cost: result.cost.totalCost,
          agent: "courier",
        });
      } catch (err) {
        console.warn("[costTracker] Failed:", err.message);
      }

      let draft;
      try {
        const match = result.text.match(/\{[\s\S]*\}/);
        draft = match ? JSON.parse(match[0]) : { subject: "Draft", body: result.text };
      } catch {
        draft = { subject: "AI Draft", body: result.text };
      }

      return Response.json({
        draft: true,
        subject: draft.subject,
        body: draft.body,
        model: result.model,
        cost: result.cost,
      });
    }

    // Send the email via Gmail API
    if (!to || !subject || !body) {
      return Response.json(
        { error: "to, subject, and body are required to send email" },
        { status: 400 }
      );
    }

    // Get OAuth tokens
    const tokensDoc = await adminDb.collection("settings").doc("google_oauth").get();
    if (!tokensDoc.exists) {
      return Response.json({
        connected: false,
        message: "Gmail not connected. Go to Settings → Integrations → Connect Gmail.",
        connectUrl: "/api/auth/connect",
      });
    }

    const tokens = tokensDoc.data();
    let accessToken = tokens.accessToken;

    if (Date.now() > tokens.expiresAt) {
      const refreshed = await refreshAccessToken(tokens.refreshToken);
      accessToken = refreshed.access_token;
      await adminDb.collection("settings").doc("google_oauth").update({
        accessToken: refreshed.access_token,
        expiresAt: Date.now() + (refreshed.expires_in * 1000),
      });
    }

    const sent = await sendGmail(accessToken, { to, subject, body });

    return Response.json({
      sent: true,
      messageId: sent.id,
      threadId: sent.threadId,
    });
  } catch (error) {
    console.error("[/api/email/compose]", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
