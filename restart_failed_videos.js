const { google } = require('googleapis');

async function triggerFailedVideos() {
  try {
    const urls = [
      "https://www.youtube.com/watch?v=gcuR_-rzlDw",
      "https://www.youtube.com/watch?v=cTUD_vCrY7M",
      "https://www.youtube.com/watch?v=KZeIEiBrT_w",
      "https://www.youtube.com/watch?v=-J_yF457yFI"
    ];

    const auth = new google.auth.GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
      projectId: "antigravity-hub-jcloud"
    });

    const batch = google.batch({ version: "v1", auth });
    const projectId = "antigravity-hub-jcloud";
    const location = "us-central1";

    for (const url of urls) {
      const jobId = `swarm-chunker-retry-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      console.log(`Submitting Batch Job: ${jobId} for ${url}...`);

      const res = await batch.projects.locations.jobs.create({
        parent: `projects/${projectId}/locations/${location}`,
        jobId: jobId,
        requestBody: {
          taskGroups: [
            {
              taskSpec: {
                runnables: [
                  {
                    container: {
                      imageUri: "us-east4-docker.pkg.dev/antigravity-hub-jcloud/cloud-run-source-deploy/gravix-agent-engine@sha256:a922a9f91bbacb855f04acbafa5d691557c71175a546be99c72db3f34a5808f0",
                      entrypoint: "python3",
                      commands: ["cloud_chunker.py", url],
                    },
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
      
      console.log(`Success! Job ${jobId} queued.`);
    }
    
    console.log("All failed videos successfully restarted via Google Cloud Batch.");
  } catch (error) {
    console.error("Batch Job Failed:", error.message);
  }
}

triggerFailedVideos();
