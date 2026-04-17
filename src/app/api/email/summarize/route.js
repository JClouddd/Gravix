import { refreshAccessToken, googleApiRequest } from "@/lib/googleAuth";
import { generate } from "@/lib/geminiClient";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function POST(request) {
  try {
    const body = await request.json();
    const { threadId, emailIds } = body;

    if (!threadId && (!emailIds || emailIds.length === 0)) {
      return Response.json({ error: "threadId or emailIds array is required" }, { status: 400 });
    }

    // 1. Get OAuth tokens
    const tokensDoc = await getDoc(doc(db, "settings", "google_oauth"));
    if (!tokensDoc.exists()) {
      return Response.json({ error: "Gmail is not connected." }, { status: 401 });
    }

    const tokens = tokensDoc.data();
    let accessToken = tokens.accessToken;

    // Refresh if expired
    if (Date.now() > tokens.expiresAt) {
      try {
        const refreshed = await refreshAccessToken(tokens.refreshToken);
        accessToken = refreshed.access_token;
        await updateDoc(doc(db, "settings", "google_oauth"), {
          accessToken: refreshed.access_token,
          expiresAt: Date.now() + (refreshed.expires_in * 1000),
        });
      } catch (err) {
        return Response.json({ error: "Token expired and refresh failed." }, { status: 401 });
      }
    }

    // 2. Fetch full email(s) or thread content
    let fullTextContent = "";

    if (threadId) {
      const threadData = await googleApiRequest(
        accessToken,
        `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=full`
      );

      if (threadData && threadData.messages) {
         for (const msg of threadData.messages) {
           fullTextContent += `\n--- Email from ${msg.payload.headers.find(h => h.name === 'From')?.value || 'Unknown'} ---\n`;
           // Extremely simplified body extraction for context (real one would parse parts properly)
           if (msg.snippet) {
              fullTextContent += msg.snippet + "\n";
           }
         }
      }
    } else if (emailIds) {
      for (const id of emailIds) {
        const msg = await googleApiRequest(
          accessToken,
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`
        );
        if (msg) {
          fullTextContent += `\n--- Email from ${msg.payload.headers.find(h => h.name === 'From')?.value || 'Unknown'} ---\n`;
          if (msg.snippet) {
             fullTextContent += msg.snippet + "\n";
          }
        }
      }
    }

    if (!fullTextContent.trim()) {
      return Response.json({ error: "Could not extract text from the requested emails." }, { status: 400 });
    }

    // 3. Summarize with Gemini
    const prompt = `
      Summarize this email thread.
      Extract the following:
      1) Summary (max 2 sentences)
      2) Action items (bullet points or list, or "None")
      3) Key decisions (bullet points or list, or "None")
      4) Urgency level (return exactly one of: "low", "medium", "high")

      Return the result as a valid JSON object with the exact keys:
      {
        "summary": "string",
        "actionItems": "string",
        "decisions": "string",
        "urgency": "string"
      }

      Email Thread Content:
      ${fullTextContent}
    `;

    // Using basic generate, parsing json out of the text response
    const aiResponse = await generate(prompt);

    let resultData = {
        summary: "Could not generate summary.",
        actionItems: "None",
        decisions: "None",
        urgency: "low"
    };

    try {
        // Strip markdown blocks if gemini returns them
        let cleanJsonStr = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        resultData = JSON.parse(cleanJsonStr);
    } catch (parseError) {
        console.warn("Failed to parse Gemini JSON output for summarize route:", parseError, "Raw output:", aiResponse);
        // Fallback to unstructured text inside summary
        resultData.summary = aiResponse;
    }

    return Response.json(resultData);

  } catch (error) {
    console.error("[/api/email/summarize]", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
