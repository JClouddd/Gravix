require('dotenv').config({ path: './gravix/.env.local' });
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

async function flush() {
  const accountBase64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!accountBase64) {
    console.error("No service account key found in gravix/.env.local");
    return;
  }
  
  const serviceAccount = JSON.parse(Buffer.from(accountBase64, 'base64').toString());
  const app = initializeApp({ credential: cert(serviceAccount) });
  const db = getFirestore(app);

  const activeSnaps = await db.collection("jules_file_locks").where("status", "==", "active").get();
  console.log(`Found ${activeSnaps.size} active ghost locks to terminate.`);
  
  for (const doc of activeSnaps.docs) {
    console.log(`Deleting ghost lock: ${doc.id} (Session: ${doc.data().sessionId || 'unknown'})`);
    await doc.ref.delete();
  }

  const queueSnaps = await db.collection("jules_file_locks").where("status", "==", "queued").get();
  console.log(`Found ${queueSnaps.size} queued tasks.`);
  for (const doc of queueSnaps.docs) {
    console.log(`Resetting blockedBy constraints for queued task: ${doc.id}`);
    await doc.ref.update({ blockedBy: [] });
  }

  // Once the locks are flushed, auto-trigger the queue by hitting the Live REST API.
  console.log("Hooks reset. Pinging the monitor cron...");
  const res = await fetch("https://gravix--antigravity-hub-jcloud.us-east4.hosted.app/api/jules/monitor");
  console.log("Monitor ping status:", res.status);

  console.log("Locks completely flushed. The pipeline should instantly resume.");
}

flush().catch(console.error);
