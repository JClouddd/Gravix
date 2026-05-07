import { NextResponse } from 'next/server';
import { logRouteError } from "@/lib/errorLogger";
import { adminDb } from "@/lib/firebaseAdmin";
import language from "@google-cloud/language";

export async function POST(request) {
  try {
    const body = await request.json();
    const { text, clientId = "unknown" } = body;

    if (!text) {
      return NextResponse.json({ error: "Text is required for sentiment analysis" }, { status: 400 });
    }

    const client = new language.LanguageServiceClient();

    const document = {
      content: text,
      type: 'PLAIN_TEXT',
    };

    const [result] = await client.analyzeSentiment({ document });
    const sentiment = result.documentSentiment;

    const analysisResult = {
      score: sentiment.score,
      magnitude: sentiment.magnitude,
      textPreview: text.substring(0, 100),
      timestamp: Date.now()
    };

    // Store the sentiment result in Firestore
    await adminDb.collection("clients_sentiment").add({
      clientId,
      ...analysisResult
    });

    return NextResponse.json({
      message: "Sentiment analyzed successfully",
      sentiment: analysisResult
    }, { status: 201 });
  } catch (error) {
    console.error("Error analyzing sentiment:", error);
    logRouteError("clients_sentiment", "/api/clients/sentiment error", error, "/api/clients/sentiment");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
