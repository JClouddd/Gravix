import fs from 'fs';
import { spawn } from 'child_process';

const schemas = JSON.parse(fs.readFileSync('ui_schema.json', 'utf-8'));

const testContent = `
import { adminDb } from "@/lib/firebaseAdmin";

export async function POST(request) {
  try {
    await adminDb.collection("dynamic_ui").doc("youtube_incubation_modal").set(${JSON.stringify(schemas.modal)});
    await adminDb.collection("dynamic_ui").doc("youtube_analytics_dashboard").set(${JSON.stringify(schemas.analytics)});
    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
`;

fs.writeFileSync('src/app/api/deploy/route.js', testContent);
console.log("Created API route to deploy schemas.");
