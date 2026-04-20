
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

    const emailPromises = emails.map(async (email) => {
      try {
        const results = await triggerPipeline("email.received", { email });

        let localTasks = 0;
        let localClients = 0;
        let localInvoices = 0;

        for (const r of results) {
          if (r.action === "createTaskIfNeeded" && r.result === "created") localTasks++;
          if (r.action === "linkToClient" && r.result === "linked") localClients++;
          if (r.action === "logIfInvoice" && r.result === "logged") localInvoices++;
        }

        return {
          success: true,
          emailId: email.id,
          results,
          localTasks,
          localClients,
          localInvoices
        };
      } catch (err) {
        console.error("Pipeline error for email", email.id, err);
        logRouteError("runtime", "/api/automation/email-pipeline error", err, "/api/automation/email-pipeline");
        return {
          success: false,
          emailId: email.id,
          error: err.message
        };
      }
    });

    const settled = await Promise.all(emailPromises);

    for (const res of settled) {
      processed++;
      if (res.success) {
        pipelineResults.push({ emailId: res.emailId, results: res.results });
        tasksCreated += res.localTasks;
        clientsLinked += res.localClients;
        invoicesLogged += res.localInvoices;
      } else {
        pipelineResults.push({ emailId: res.emailId, error: res.error });
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
