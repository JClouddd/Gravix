import { googleApiRequest, refreshAccessToken } from "@/lib/googleAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { logRouteError } from "@/lib/errorLogger";
import { generate } from "@/lib/geminiClient";

/**
 * GET /api/meet/transcripts
 * Fetch recent conference records using Google Meet REST API v2
 */
export async function GET() {
  try {
    const tokensDoc = await adminDb.collection("settings").doc("google_oauth").get();

    if (!tokensDoc.exists) {
      return Response.json({
        connected: false,
        connectUrl: "/api/auth/connect",
        meetings: [],
      });
    }

    const tokens = tokensDoc.data();
    let accessToken = tokens.accessToken;

    if (Date.now() > tokens.expiresAt) {
      try {
        const refreshed = await refreshAccessToken(tokens.refreshToken);
        accessToken = refreshed.access_token;

        await adminDb.collection("settings").doc("google_oauth").update({
          accessToken: refreshed.access_token,
          expiresAt: Date.now() + (refreshed.expires_in * 1000),
        });
      } catch (err) {
        logRouteError("meet", "/api/meet/transcripts error", err, "/api/meet/transcripts");
        return Response.json({
          connected: false,
          connectUrl: "/api/auth/connect",
          meetings: [],
          message: "Token expired and refresh failed.",
        });
      }
    }

    // Fetch conference records
    const conferencesData = await googleApiRequest(
      accessToken,
      "https://meet.googleapis.com/v2/conferenceRecords"
    );

    const records = conferencesData.conferenceRecords || [];

    // For each record, fetch transcripts if any
    const meetings = await Promise.all(
      records.map(async (record) => {
        let transcriptText = null;
        try {
          const transcriptsData = await googleApiRequest(
            accessToken,
            `https://meet.googleapis.com/v2/${record.name}/transcripts`
          );
          const transcripts = transcriptsData.transcripts || [];

          if (transcripts.length > 0) {
            const transcriptId = transcripts[0].name;
            const entriesData = await googleApiRequest(
              accessToken,
              `https://meet.googleapis.com/v2/${transcriptId}/entries`
            );

            const entries = entriesData.transcriptEntries || [];
            transcriptText = entries.map(entry => `[${entry.participant}] ${entry.text}`).join('\n');
            const uniqueParticipants = new Set(entries.map(entry => entry.participant));
            record.participantCount = uniqueParticipants.size;
          }
        } catch (e) {
          console.warn(`Could not fetch transcript for ${record.name}`, e);
          logRouteError("meet", "/api/meet/transcripts fetch error", e, "/api/meet/transcripts");
        }

        // Just parsing out a title and standard details from the resource
        // The space name is formatted as spaces/{spaceId}
        const spaceName = record.space || "Unknown Space";

        return {
          id: record.name, // e.g. conferenceRecords/{id}
          space: spaceName,
          startTime: record.startTime,
          endTime: record.endTime,
          participantCount: record.participantCount || 0,
          transcriptText,
        };
      })
    );

    return Response.json({
      connected: true,
      meetings: meetings.filter(m => m.transcriptText !== null), // Only return meetings that have a transcript
    });
  } catch (error) {
    console.error("[/api/meet/transcripts GET]", error);
    logRouteError("meet", "/api/meet/transcripts error", error, "/api/meet/transcripts");

    if (error.message === "TOKEN_EXPIRED") {
      return Response.json({
        connected: false,
        connectUrl: "/api/auth/connect",
        meetings: [],
        message: "Session expired. Please reconnect.",
      });
    }

    return Response.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/meet/transcripts
 * Process transcript through Gemini for analysis
 */
export async function POST(request) {
  try {
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const audioFile = formData.get("audioFile");

      if (!audioFile) {
        return Response.json({ error: "audioFile is required" }, { status: 400 });
      }

      // Placeholder standard structure to ingest audio as requested
      // In a real implementation, we would pass the audioFile to Gemini via mediaParts
      return Response.json({
        summary: "Mock analysis of uploaded meeting audio. The team discussed new features.",
        actionItems: [
          { task: "Implement audio upload", assignee: "Jules", deadline: "Today" }
        ],
        decisions: ["Use a placeholder API for now"],
        followUps: [],
        keyContacts: [],
      });
    }

    const { transcriptText } = await request.json();

    if (!transcriptText) {
      return Response.json({ error: "transcriptText is required" }, { status: 400 });
    }

    const systemPrompt = `You are an AI assistant that analyzes meeting transcripts.
Extract the following information and output ONLY valid JSON format:
{
  "summary": "A brief summary of the meeting",
  "actionItems": [{"task": "Task description", "assignee": "Name or Unknown", "deadline": "Date or Unknown"}],
  "decisions": ["Decision 1", "Decision 2"],
  "followUps": [{"item": "Follow up item", "owner": "Name or Unknown"}],
  "keyContacts": [{"name": "Name", "role": "Role or Unknown"}]
}`;

    const prompt = `--- Input Data ---\n${transcriptText}\n--- End Input Data ---`;

    const aiResponse = await generate({
      prompt,
      systemPrompt,
      complexity: "high", // Deep reasoning or standard pro models work well for extraction
    });

    // Parse out the JSON
    let resultJson;
    try {
        const text = aiResponse.text;
        // Strip markdown code blocks if any
        const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        resultJson = JSON.parse(cleanedText);
    } catch (e) {
        console.error("Failed to parse Gemini output as JSON", e, aiResponse.text);
        logRouteError("meet", "/api/meet/transcripts parse error", e, "/api/meet/transcripts");
        resultJson = {
            summary: "Failed to parse analysis.",
            actionItems: [],
            decisions: [],
            followUps: [],
            keyContacts: [],
        };
    }

    return Response.json(resultJson);

  } catch (error) {
    console.error("[/api/meet/transcripts POST]", error);
    logRouteError("meet", "/api/meet/transcripts POST error", error, "/api/meet/transcripts");
    return Response.json({ error: error.message }, { status: 500 });
  }
}
