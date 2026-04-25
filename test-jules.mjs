import { adminDb } from "./src/lib/firebaseAdmin.js";
import { triggerTask } from "./src/lib/julesClient.js";

async function run() {
  process.env.JULES_API_KEY = "REMOVED";

  // Create the session manually
  console.log("Triggering Jules...");
  const result = await triggerTask({
    title: "feat: Add ModuleSettingsPanel component",
    prompt: "Create a new generic component `src/components/shared/ModuleSettingsPanel.js`. It should be a reusable sliding panel that takes generic configuration props (e.g. settings schema, isOpen, onClose). Integrate the new ModuleSettingsPanel into `src/components/modules/KnowledgeModule.js` and `src/components/modules/AgentsModule.js` to replace any placeholder settings gear behaviors.",
    repo: "JClouddd/Gravix",
    autoApprove: true
  });
  
  const sessionId = result.sessionId.replace("sessions/", "");
  console.log("Got Session ID:", sessionId);

  // Update DB Phase 2-5 Pipeline
  const docRef = adminDb.collection("jules_pipelines").doc("EzaqZkMIQx3A8RAmbGkN");
  const doc = await docRef.get();
  const pipeline = doc.data();
  
  pipeline.waves[0].tasks[0].sessionId = sessionId;
  pipeline.waves[0].tasks[0].status = "triggered";
  pipeline.waves[0].tasks[0].error = null;
  
  await docRef.update({
    waves: pipeline.waves,
    updatedAt: new Date().toISOString()
  });
  console.log("Pipeline DB updated successfully!");
}

run().catch(console.error);
