import { generate } from "@/lib/geminiClient";

export async function GET() {
  return Response.json({
    connected: false,
    message: "Process a meeting to see results",
  });
}

export async function POST(request) {
  try {
    const { transcriptText, meetingId = "manual-upload" } = await request.json();

    if (!transcriptText) {
      return Response.json({ error: "transcriptText is required" }, { status: 400 });
    }

    const systemPrompt = `
      Analyze the provided meeting transcript and extract the following in structured JSON format:
      - summary: A concise summary of the meeting.
      - actionItems: An array of objects, each containing:
          - task: A description of the action item.
          - owner: The person responsible (if mentioned, else "Unassigned").
          - deadline: The deadline (if mentioned, else null).
      - decisions: An array of strings representing key decisions made.
      - followUps: An array of objects, each containing:
          - item: A description of the follow-up needed.
      - contacts: An array of strings representing new contacts mentioned.
    `;

    const jsonSchema = {
      type: "object",
      properties: {
        summary: { type: "string" },
        actionItems: {
          type: "array",
          items: {
            type: "object",
            properties: {
              task: { type: "string" },
              owner: { type: "string" },
              deadline: { type: "string", nullable: true },
            },
            required: ["task", "owner"]
          }
        },
        decisions: {
          type: "array",
          items: { type: "string" }
        },
        followUps: {
          type: "array",
          items: {
             type: "object",
             properties: { item: { type: "string" } },
             required: ["item"]
          }
        },
        contacts: {
          type: "array",
          items: { type: "string" }
        }
      },
      required: ["summary", "actionItems", "decisions", "followUps", "contacts"]
    };

    // Analyze transcript using Gemini structured output
    const analysisStr = await generate({
      prompt: transcriptText,
      systemPrompt,
      complexity: "pro", // meeting transcripts can be long and require good extraction
      jsonSchema,
    });

    let analysis;
    try {
      analysis = JSON.parse(analysisStr);
    } catch (e) {
      console.error("Failed to parse Gemini output as JSON", analysisStr);
      return Response.json({ error: "Failed to parse analysis." }, { status: 500 });
    }

    // Call the meeting pipeline internally
    const origin = new URL(request.url).origin;
    const pipelineResponse = await fetch(`${origin}/api/automation/meeting-pipeline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        meetingId,
        transcript: transcriptText,
        analysis,
      }),
    });

    if (!pipelineResponse.ok) {
      const errorText = await pipelineResponse.text();
      throw new Error(`Pipeline execution failed: ${errorText}`);
    }

    const pipelineResult = await pipelineResponse.json();

    return Response.json({
      success: true,
      analysis,
      pipelineResult
    });

  } catch (error) {
    console.error("[/api/meet/transcripts] Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
