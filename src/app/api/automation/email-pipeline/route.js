
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

    const processEmail = async (email) => {
      try {
        // Run the email.received pipeline for each email
        const results = await triggerPipeline("email.received", { email });

        let localTasksCreated = 0;
        let localClientsLinked = 0;
        let localInvoicesLogged = 0;

        // Count outcomes
        for (const r of results) {
          if (r.action === "createTaskIfNeeded" && r.result === "created") localTasksCreated++;
          if (r.action === "linkToClient" && r.result === "linked") localClientsLinked++;
          if (r.action === "logIfInvoice" && r.result === "logged") localInvoicesLogged++;
        }
        return { emailId: email.id, results, tasksCreated: localTasksCreated, clientsLinked: localClientsLinked, invoicesLogged: localInvoicesLogged };
      } catch (err) {
        console.error("Pipeline error for email", email.id, err);
        logRouteError("runtime", "/api/automation/email-pipeline error", err, "/api/automation/email-pipeline");
        return { emailId: email.id, error: err.message, tasksCreated: 0, clientsLinked: 0, invoicesLogged: 0 };
      }
    };

    const allResults = await Promise.all(emails.map(processEmail));

    for (const res of allResults) {
      processed++;
      tasksCreated += res.tasksCreated;
      clientsLinked += res.clientsLinked;
      invoicesLogged += res.invoicesLogged;
      pipelineResults.push({ emailId: res.emailId, results: res.results, error: res.error });
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
