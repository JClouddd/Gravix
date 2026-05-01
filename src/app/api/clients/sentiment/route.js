import { NextResponse } from 'next/server';
import language from '@google-cloud/language';
import { adminDb } from "@/lib/firebaseAdmin";
import { logRouteError } from "@/lib/errorLogger";

const client = new language.LanguageServiceClient();

export async function POST(request) {
  try {
    const { text, clientId } = await request.json();

    if (!text || !clientId) {
      return NextResponse.json({ error: "Missing text or clientId" }, { status: 400 });
    }

    const document = {
      content: text,
      type: 'PLAIN_TEXT',
    };

    const [result] = await client.analyzeSentiment({ document });
    const sentiment = result.documentSentiment;

    // Store the sentiment analysis result
    const sentimentData = {
      text,
      score: sentiment.score,
      magnitude: sentiment.magnitude,
      timestamp: new Date().toISOString(),
    };

    await adminDb.collection("clients").doc(clientId).collection("sentimentAnalysis").add(sentimentData);

    return NextResponse.json({ sentiment: sentimentData }, { status: 200 });
  } catch (error) {
    console.error("Error analyzing sentiment:", error);
    logRouteError("sentiment_analysis", "Failed to analyze sentiment", error, "/api/clients/sentiment");
    return NextResponse.json({ error: "Failed to analyze sentiment" }, { status: 500 });
  }
}
