import { NextResponse } from "next/server";
import { structuredGenerate, generate } from "@/lib/geminiClient";
import { adminDb } from "@/lib/firebaseAdmin";

export async function POST(request) {
  try {
    const body = await request.json();
    const { clientName, clientEmail, needs, notes } = body;

    if (!clientName || !needs) {
      return NextResponse.json({ error: "Missing required fields: clientName, needs" }, { status: 400 });
    }

    let tasksCreated = 0;
    let kickoffScheduled = false;
    let welcomeDrafted = false;

    // 1. Fetch OAuth token
    const oauthDoc = await adminDb.collection("settings").doc("google_oauth").get();
    if (!oauthDoc.exists || !oauthDoc.data().access_token) {
      return NextResponse.json({ error: "Google Workspace not connected (no OAuth token)" }, { status: 401 });
    }
    const accessToken = oauthDoc.data().access_token;

    // 2. Generate project plan using Gemini structured output
    const planSchema = {
      type: "object",
      properties: {
        tasks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              dueDaysFromNow: { type: "number" }
            },
            required: ["title", "description", "dueDaysFromNow"]
          }
        }
      },
      required: ["tasks"]
    };

    let plan;
    try {
      const response = await structuredGenerate({
        prompt: `Create a project plan for client ${clientName}. They need: ${needs}. Additional notes: ${notes || 'none'}. Generate 5-8 specific tasks with titles, descriptions, and estimated deadlines (in days from now).`,
        schema: planSchema,
        systemPrompt: "You are an expert project manager agent for the Gravix platform."
      });
      plan = JSON.parse(response.text);
    } catch (err) {
      console.error("Gemini project plan generation failed:", err);
      return NextResponse.json({ error: "Failed to generate project plan" }, { status: 500 });
    }

    // 3. Create Google Tasks
    if (plan && plan.tasks) {
      const taskResults = await Promise.all(plan.tasks.map(async (task) => {
        try {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + (task.dueDaysFromNow || 0));

          const taskRes = await fetch("https://tasks.googleapis.com/tasks/v1/lists/@default/tasks", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              title: `[${clientName}] ${task.title}`,
              notes: task.description,
              due: dueDate.toISOString()
            })
          });

          if (taskRes.ok) {
            return true;
          } else {
            console.error("Failed to create task:", await taskRes.text());
            return false;
          }
        } catch (err) {
          console.error("Task creation error:", err);
          return false;
        }
      }));

      tasksCreated = taskResults.filter(Boolean).length;
    }

    // 4. Schedule kickoff meeting via Calendar API
    try {
      const kickoffStart = new Date();
      kickoffStart.setDate(kickoffStart.getDate() + 7); // 1 week from now
      kickoffStart.setHours(10, 0, 0, 0); // Default to 10:00 AM

      const kickoffEnd = new Date(kickoffStart);
      kickoffEnd.setHours(11, 0, 0, 0); // 60 min duration

      const eventPayload = {
        summary: `Kickoff: ${clientName}`,
        description: `Project Kickoff Meeting for ${clientName}\nNeeds: ${needs}`,
        start: { dateTime: kickoffStart.toISOString(), timeZone: "UTC" },
        end: { dateTime: kickoffEnd.toISOString(), timeZone: "UTC" },
      };

      if (clientEmail) {
        eventPayload.attendees = [{ email: clientEmail }];
      }

      const calendarRes = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(eventPayload)
      });

      if (calendarRes.ok) {
        kickoffScheduled = true;
      } else {
        console.error("Failed to schedule kickoff:", await calendarRes.text());
      }
    } catch (err) {
      console.error("Kickoff scheduling error:", err);
    }

    // 5. Draft welcome email
    if (clientEmail) {
      try {
        const emailResponse = await generate({
          prompt: `Draft a professional welcome email for client ${clientName}. They are onboarding for: ${needs}. Mention that a kickoff meeting has been scheduled for next week and tasks are being prepared. Keep it warm and concise.`,
          systemPrompt: "You are the Gravix Courier agent, drafting professional client communications."
        });

        await adminDb.collection("email_drafts").add( {
          to: clientEmail,
          subject: `Welcome to Gravix, ${clientName}!`,
          body: emailResponse.text,
          timestamp: new Date().toISOString()
        });

        welcomeDrafted = true;
      } catch (err) {
        console.error("Welcome email drafting error:", err);
      }
    }

    return NextResponse.json({
      tasksCreated,
      kickoffScheduled,
      welcomeDrafted
    });

  } catch (error) {
    console.error("[/api/automation/client-onboard]", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
