import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { generate } from "@/lib/geminiClient";
import { googleApiRequest, refreshAccessToken } from "@/lib/googleAuth";

export async function GET() {
  try {
    const templatesRef = adminDb.collection("email_templates");
    const snapshot = await templatesRef.get();
    const templates = snapshot.docs.map(doc => doc.data());
    return NextResponse.json({ templates });
  } catch (error) {
    console.error("Error fetching email templates:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    // 1. Get OAuth token from Firestore
    const oauthDoc = await adminDb.collection("settings").doc("google_oauth").get();
    if (!oauthDoc.exists) {
      return NextResponse.json({ error: "Google OAuth not configured" }, { status: 400 });
    }

    let { access_token, refresh_token, expiry_date } = oauthDoc.data();

    // Check if token is expired and refresh if necessary
    if (Date.now() >= expiry_date) {
      try {
        const newTokens = await refreshAccessToken(refresh_token);
        access_token = newTokens.access_token;
        // Optionally update the stored token here
      } catch (e) {
        console.error("Failed to refresh token", e);
        return NextResponse.json({ error: "Failed to refresh OAuth token" }, { status: 401 });
      }
    }

    // 2. Read sent emails from Gmail API
    let sentMessages;
    try {
      const msgsRes = await googleApiRequest(
        access_token,
        "https://gmail.googleapis.com/gmail/v1/users/me/messages?q=in:sent&maxResults=20"
      );
      sentMessages = msgsRes.messages || [];
    } catch (e) {
       console.error("Failed to fetch sent emails from Gmail", e);
       return NextResponse.json({ error: "Failed to fetch sent emails" }, { status: 500 });
    }

    if (sentMessages.length === 0) {
      return NextResponse.json({ templatesCreated: 0, message: "No sent emails found." });
    }

    // Fetch message details
    const fetchPromises = sentMessages.map(async (msg) => {
      try {
        const fullMsg = await googleApiRequest(
          access_token,
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`
        );

        let subject = "";
        const headers = fullMsg.payload?.headers || [];
        const subjectHeader = headers.find(h => h.name.toLowerCase() === "subject");
        if (subjectHeader) subject = subjectHeader.value;

        // Try to get body snippet or plain text
        let body = fullMsg.snippet || "";
        return `Subject: ${subject}\nBody:\n${body}\n`;
      } catch (e) {
        console.error(`Failed to fetch details for msg ${msg.id}`, e);
        return null; // Return null on failure so it can be filtered out
      }
    });

    const results = await Promise.all(fetchPromises);
    const emailTexts = results.filter(text => text !== null);

    if (emailTexts.length === 0) {
       return NextResponse.json({ templatesCreated: 0, message: "No email content extracted." });
    }

    const emailsCombinedText = emailTexts.join("\n---\n");

    // 3. Send to Gemini to extract templates
    const prompt = `Analyze these sent emails for recurring patterns. Group similar emails and create reusable templates.

Respond ONLY with a JSON object in this exact format:
{
  "templates": [
    {
      "name": "string (name of template)",
      "subject": "string (template subject)",
      "bodyTemplate": "string (template body with placeholders like [Name])",
      "frequency": "string (estimated frequency)",
      "tags": ["string", "string"]
    }
  ]
}

Sent Emails:
${emailsCombinedText.slice(0, 50000)} // Limit to avoid token overflow`;

    const generatedText = await generate(prompt, "system", "gemini-2.5-flash");

    // Extract JSON from response
    let parsedData = { templates: [] };
    try {
      const jsonStr = generatedText.replace(/```json\n?|```/g, "").trim();
      const startIdx = jsonStr.indexOf('{');
      const endIdx = jsonStr.lastIndexOf('}');
      if (startIdx !== -1 && endIdx !== -1) {
        parsedData = JSON.parse(jsonStr.substring(startIdx, endIdx + 1));
      }
    } catch (e) {
      console.error("Failed to parse Gemini output as JSON", e);
    }

    // 4. Store in Firestore
    let storedCount = 0;
    if (parsedData.templates && Array.isArray(parsedData.templates)) {
      const batch = adminDb.batch();
      for (const template of parsedData.templates) {
        const docId = template.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const docRef = adminDb.collection("email_templates").doc(docId);
        batch.set(docRef, {
          ...template,
          updatedAt: new Date()
        });
        storedCount++;
      }
      if (storedCount > 0) {
        await batch.commit();
      }
    }

    return NextResponse.json({
      templatesCreated: storedCount,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error creating email templates:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
