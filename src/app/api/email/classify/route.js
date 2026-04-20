import { structuredGenerate } from "@/lib/geminiClient";
import { logRouteError } from "@/lib/errorLogger";

export async function POST(request) {
  try {
    const { emails } = await request.json();

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return Response.json({ error: "emails array is required" }, { status: 400 });
    }

    const schema = {
      type: "object",
      properties: {
        classifications: {
          type: "array",
          description: "List of email classifications",
          items: {
            type: "object",
            properties: {
              emailId: {
                type: "string",
                description: "The ID of the email"
              },
              category: {
                type: "string",
                enum: ["client", "work", "personal", "newsletter", "notification", "spam"],
                description: "The category of the email"
              },
              urgency: {
                type: "string",
                enum: ["low", "medium", "high"],
                description: "The urgency of the email"
              },
              reason: {
                type: "string",
                description: "Brief reason for this classification"
              }
            },
            required: ["emailId", "category", "urgency", "reason"]
          }
        }
      },
      required: ["classifications"]
    };

    // Format emails for the prompt to reduce token usage
    const emailDataStr = emails.map(e => `ID: ${e.id}\nFrom: ${e.from}\nSubject: ${e.subject}\nSnippet: ${e.snippet}\n---`).join("\n");

    const prompt = `
      Classify the following emails into exactly one of these categories: client, work, personal, newsletter, notification, spam.
      Also determine the urgency level: low, medium, or high.
      Provide a brief reason for the classification.

      Emails to classify:
      ${emailDataStr}
    `;

    const result = await structuredGenerate(prompt, schema);

    return Response.json(result);

  } catch (error) {
    console.error("[/api/email/classify]", error);
    logRouteError("gmail", "/api/email/classify error", error, "/api/email/classify");
    return Response.json({ error: error.message }, { status: 500 });
  }
}
