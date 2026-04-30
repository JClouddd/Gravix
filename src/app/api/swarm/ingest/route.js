import { google } from "googleapis";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { vid_id, url } = await req.json();

    if (!vid_id || !url) {
      return NextResponse.json({ error: "missing vid_id or url" }, { status: 400 });
    }

    const auth = new google.auth.GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });

    const batch = google.batch({ version: "v1", auth });
    const projectId = "antigravity-hub-jcloud";
    const location = "us-central1";

    const jobId = `swarm-ingest-${vid_id.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now()}`;

    await batch.projects.locations.jobs.create({
      parent: `projects/${projectId}/locations/${location}`,
      jobId: jobId,
      requestBody: {
        taskGroups: [
          {
            taskSpec: {
              runnables: [
                {
                  container: {
                    imageUri: "us-east4-docker.pkg.dev/antigravity-hub-jcloud/cloud-run-source-deploy/gravix-agent-engine:latest",
                    entrypoint: "python3",
                    commands: ["cloud_chunker.py", "--action", "ingest", "--vid_id", vid_id, "--url", url],
                  },
                  environment: {
                    variables: {
                      "GEMINI_API_KEY": process.env.GEMINI_API_KEY
                    }
                  }
                },
              ],
              computeResource: {
                cpuMilli: 2000,
                memoryMib: 8192,
              },
              maxRetryCount: 1,
              maxRunDuration: "86400s",
            },
            taskCount: 1,
          },
        ],
        allocationPolicy: {
          instances: [
            {
              policy: {
                machineType: "e2-standard-4",
              },
            },
          ],
        },
        logsPolicy: {
          destination: "CLOUD_LOGGING",
        },
      },
    });

    console.log(`[Swarm Ingest] Submitted job ${jobId} for ${vid_id}`);

    return NextResponse.json({
      success: true,
      message: `Successfully queued ${vid_id} for deep-dive ingestion in Google Cloud Batch.`,
      jobId,
    });
  } catch (error) {
    console.error("[Swarm Ingest API Error]:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
