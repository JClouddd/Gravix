const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const serviceAccount = require("./service-account.json");

if (!serviceAccount) throw new Error("Missing service-account.json");

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function run() {
  const pipes = await db.collection("jules_pipelines").where("status", "in", ["running", "merging"]).get();
  for (const doc of pipes.docs) {
    const pipeline = doc.data();
    const currentWave = pipeline.waves[pipeline.currentWave];
    
    if (currentWave?.status === "merging") {
      console.log(`Fixing pipeline ${doc.id} "${pipeline.name}"`);
      currentWave.status = "completed";
      currentWave.completedAt = new Date().toISOString();
      
      const nextWaveIdx = pipeline.currentWave + 1;
      
      if (nextWaveIdx >= pipeline.totalWaves) {
        pipeline.status = "completed";
        console.log(`Pipeline ${doc.id} completely finished, marking completed.`);
      } else {
        pipeline.currentWave = nextWaveIdx;
        pipeline.waves[nextWaveIdx].status = "running";
        console.log(`Advancing pipeline ${doc.id} to wave ${nextWaveIdx + 1}`);
      }
      
      await doc.ref.update({
        status: pipeline.status,
        waves: pipeline.waves,
        currentWave: pipeline.currentWave
      });
      console.log(`Updated Firestore for ${doc.id}`);
    } else {
      console.log(`Pipeline ${doc.id} is in status ${currentWave?.status}. Skipping.`);
    }
  }
}
run().catch(console.error);
