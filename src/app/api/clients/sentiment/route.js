import { logRouteError } from "@/lib/errorLogger";
import { LanguageServiceClient } from '@google-cloud/language';

export async function POST(request) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text) {
      return Response.json({ error: "Text is required" }, { status: 400 });
    }

    const client = new LanguageServiceClient();

    const document = {
      content: text,
      type: 'PLAIN_TEXT',
    };

    const [result] = await client.analyzeSentiment({ document });
    const sentiment = result.documentSentiment;

    // Routing Logic:
    // score < -0.25 -> Requires Immediate Attention
    // score > 0.25 -> Positive
    // else -> Neutral

    let priority = "Normal";
    let routing = "General Inquiry";

    if (sentiment.score < -0.25) {
      priority = "High";
      routing = "Escalation Team";
    } else if (sentiment.score > 0.25) {
      routing = "Account Management";
    }

    return Response.json({
      success: true,
      sentiment: {
        score: sentiment.score,
        magnitude: sentiment.magnitude,
      },
      routing: {
        priority,
        suggestedQueue: routing
      }
    });

  } catch (error) {
    console.error("[/api/clients/sentiment]", error);
    logRouteError("clients_sentiment", "/api/clients/sentiment error", error, "/api/clients/sentiment");
    return Response.json({ error: error.message }, { status: 500 });
  }
}
