import { generate } from "@/lib/geminiClient";
import { googleApiRequest } from "@/lib/googleAuth";
import { logRouteError } from "@/lib/errorLogger";

export async function POST(request) {
  try {
    const { topic, accessToken } = await request.json();

    if (!topic || !accessToken) {
      return Response.json({ error: "topic and accessToken are required" }, { status: 400 });
    }

    // 1. Generate YouTube script with Gemini
    const geminiPrompt = `Write a short, engaging YouTube video script about the following topic: ${topic}. Include an intro, main points, and an outro.`;
    const geminiResponse = await generate({
      prompt: geminiPrompt,
      systemPrompt: "You are an expert YouTube content creator and scriptwriter.",
      complexity: "pro", // or "flash" based on instructions
    });

    const scriptText = geminiResponse.text;

    if (!scriptText) {
      throw new Error("Failed to generate script from Gemini");
    }

    // 2. Create Google Document
    const createDocResponse = await googleApiRequest(
      accessToken,
      "https://docs.googleapis.com/v1/documents",
      {
        method: "POST",
        body: JSON.stringify({
          title: `YouTube Script: ${topic}`,
        }),
      }
    );

    const documentId = createDocResponse.documentId;

    if (!documentId) {
      throw new Error("Failed to create Google Document");
    }

    // 3. Insert text into Document
    await googleApiRequest(
      accessToken,
      `https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`,
      {
        method: "POST",
        body: JSON.stringify({
          requests: [
            {
              insertText: {
                location: {
                  index: 1,
                },
                text: scriptText,
              },
            },
          ],
        }),
      }
    );

    return Response.json({ documentId });

  } catch (error) {
    await logRouteError("youtube", "Error generating YouTube script", error, "/api/youtube/script");
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
