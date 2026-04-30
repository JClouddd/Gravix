import { google } from "googleapis";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { urls } = await req.json();

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: "missing or invalid urls array" }, { status: 400 });
    }

    const auth = new google.auth.GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });

    const batch = google.batch({ version: "v1", auth });
    const projectId = "antigravity-hub-jcloud";
    const location = "us-central1"; // Cloud Batch usually runs best in us-central1 for quota

    const jobIds = [];

    // Natively queues each URL as a dedicated Cloud Batch job
    for (const url of urls) {
      const jobId = `swarm-chunker-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      jobIds.push(jobId);

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
                      // Using the most recent deployment hash. In production, tag with 'latest'
                      imageUri: "us-east4-docker.pkg.dev/antigravity-hub-jcloud/cloud-run-source-deploy/gravix-agent-engine:latest",
                      entrypoint: "python3",
                      commands: ["cloud_chunker.py", "--action", "scrape", "--url", url],
                    },
                    environment: {
                      variables: {
                        "GEMINI_API_KEY": process.env.GEMINI_API_KEY
                      }
                    }
                  },
                ],
                computeResource: {
                  cpuMilli: 2000,   // 2 vCPUs
                  memoryMib: 8192,  // 8 GB RAM (Needed for ffmpeg)
                },
                maxRetryCount: 1,
                maxRunDuration: "86400s", // 24 hours (Infinite execution time!)
              },
              taskCount: 1,
            },
          ],
          allocationPolicy: {
            instances: [
              {
                policy: {
                  machineType: "e2-standard-4", // Native VM sizing
                },
              },
            ],
          },
          logsPolicy: {
            destination: "CLOUD_LOGGING",
          },
        },
      });
      
      console.log(`[Swarm Batch] Submitted job ${jobId} for ${url}`);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully queued ${urls.length} video(s) in Google Cloud Batch.`,
      jobIds,
    });
  } catch (error) {
    console.error("[Swarm Batch API Error]:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
