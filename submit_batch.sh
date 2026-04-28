#!/bin/bash
URLS=(
  "https://www.youtube.com/watch?v=gcuR_-rzlDw"
  "https://www.youtube.com/watch?v=cTUD_vCrY7M"
  "https://www.youtube.com/watch?v=KZeIEiBrT_w"
  "https://www.youtube.com/watch?v=-J_yF457yFI"
)

IMAGE="us-east4-docker.pkg.dev/antigravity-hub-jcloud/cloud-run-source-deploy/gravix-agent-engine@sha256:a922a9f91bbacb855f04acbafa5d691557c71175a546be99c72db3f34a5808f0"

for i in "${!URLS[@]}"; do
  URL="${URLS[$i]}"
  JOB_ID="swarm-retry-$(date +%s)-$i"
  
  cat << JSON > /tmp/job.json
{
  "taskGroups": [{
    "taskSpec": {
      "runnables": [{
        "container": {
          "imageUri": "$IMAGE",
          "entrypoint": "python3",
          "commands": ["cloud_chunker.py", "$URL"]
        },
        "environment": {
          "variables": {
            "GEMINI_API_KEY": "$GEMINI_API_KEY"
          }
        }
      }],
      "computeResource": {
        "cpuMilli": 2000,
        "memoryMib": 8192
      },
      "maxRunDuration": "86400s"
    },
    "taskCount": 1
  }],
  "allocationPolicy": {
    "instances": [{"policy": {"machineType": "e2-standard-4"}}]
  },
  "logsPolicy": {"destination": "CLOUD_LOGGING"}
}
JSON

  gcloud batch jobs submit $JOB_ID --location us-central1 --config /tmp/job.json
done
