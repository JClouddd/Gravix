import { generate } from "@/lib/geminiClient";

/**
 * POST /api/email/compose — AI-drafted email composition
 */
export async function POST(request) {
  try {
    const { to, subject, context, tone = "professional", replyTo = null } = await request.json();

    if (!context) {
      return Response.json({ error: "context is required — describe what the email should say" }, { status: 400 });
    }

    const systemPrompt = `You are an email composition assistant. Draft professional emails based on the user's context. 
Tone: ${tone}
${replyTo ? `This is a reply to: "${replyTo}"` : "This is a new email."}
${to ? `Recipient: ${to}` : ""}
${subject ? `Subject: ${subject}` : ""}

Write only the email body. Be concise and appropriate for the tone specified.`;

    const result = await generate({
      prompt: context,
      systemPrompt,
      complexity: "flash",
    });

    return Response.json({
      draft: {
        to: to || "",
        subject: subject || "",
        body: result.text,
        tone,
      },
      model: result.model,
      tokens: result.tokens,
      cost: result.cost,
    });
  } catch (error) {
    console.error("[/api/email/compose]", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
