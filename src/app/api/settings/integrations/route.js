import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    integrations: [
      { id: "gemini", name: "Gemini API", status: "connected", endpoint: "/api/gemini/*", lastUsed: null },
      { id: "firebase", name: "Firebase", status: "connected", services: ["auth", "firestore"], projectId: "antigravity-hub-jcloud" },
      { id: "vertex_data_store", name: "Vertex AI Data Store", status: "connected", dataStoreId: "gravix-knowledge", engineId: "gravix-scholar" },
      { id: "gcs", name: "Cloud Storage", status: "connected", bucket: "gs://gravix-knowledge-docs" },
      { id: "jules", name: "Jules", status: "connected", repo: "JClouddd/Gravix" },
      { id: "gmail", name: "Gmail API", status: "not_configured", requires: "OAuth consent screen" },
      { id: "calendar", name: "Google Calendar", status: "not_configured", requires: "OAuth consent screen" },
      { id: "tasks", name: "Google Tasks", status: "not_configured", requires: "OAuth consent screen" },
      { id: "meet", name: "Google Meet", status: "not_configured", requires: "OAuth consent screen" },
      { id: "colab", name: "Colab Enterprise", status: "not_configured", requires: "GCS notebooks" },
      { id: "fcm", name: "Cloud Messaging", status: "not_configured", requires: "Service worker" }
    ]
  });
}
