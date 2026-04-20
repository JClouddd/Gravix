
import { triggerPipeline } from "@/lib/automationEngine";
import { logRouteError } from "@/lib/errorLogger";

/**
 * POST /api/automation/email-pipeline
 * Processes classified emails through the automation pipeline.
 * Called automatically when the inbox is fetched, or manually via trigger.
 */
export async function POST(request) {
  try {
    const { emails } = await request.json();

    if (!emails || !Array.isArray(emails)) {
      return Response.json({ error: "Missing or invalid 'emails' array." }, { status: 400 });
    }

    let processed = 0;
    let tasksCreated = 0;
    let clientsLinked = 0;
    let invoicesLogged = 0;
    const pipelineResults = [];

    for (const email of emails) {
      processed++;

      try {
        // Run the email.received pipeline for each email
        const results = await triggerPipeline("email.received", { email });
        pipelineResults.push({ emailId: email.id, results });

        // Count outcomes
        for (const r of results) {
          if (r.action === "createTaskIfNeeded" && r.result === "created") tasksCreated++;
          if (r.action === "linkToClient" && r.result === "linked") clientsLinked++;
          if (r.action === "logIfInvoice" && r.result === "logged") invoicesLogged++;
        }
      } catch (err) {
        console.error("Pipeline error for email", email.id, err);
        logRouteError("runtime", "/api/automation/email-pipeline error", err, "/api/automation/email-pipeline");
        pipelineResults.push({ emailId: email.id, error: err.message });
      }
    }

    return Response.json({
      processed,
      tasksCreated,
      clientsLinked,
      invoicesLogged,
      pipelineResults,
    });
  } catch (error) {
    console.error("[/api/automation/email-pipeline]", error);
    logRouteError("runtime", "/api/automation/email-pipeline error", error, "/api/automation/email-pipeline");
    return Response.json({ error: error.message }, { status: 500 });
  }
}
