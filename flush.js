const fs = require('fs');
const envText = fs.readFileSync('.env.local', 'utf8');
const match = envText.match(/GOOGLE_SERVICE_ACCOUNT_KEY=([^\n]*)/);
if (match) process.env.GOOGLE_SERVICE_ACCOUNT_KEY = match[1];

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

async function flush() {
  const accountBase64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const serviceAccount = JSON.parse(Buffer.from(accountBase64, 'base64').toString());
  const app = initializeApp({ credential: cert(serviceAccount) });
  const db = getFirestore(app);

  const activeSnaps = await db.collection("jules_file_locks").where("status", "==", "active").get();
  console.log(`Found ${activeSnaps.size} active ghost locks to terminate.`);
  for (const doc of activeSnaps.docs) {
    console.log(`Deleting lock: ${doc.id}`);
    await doc.ref.delete();
  }

  const queueSnaps = await db.collection("jules_file_locks").where("status", "==", "queued").get();
  console.log(`Found ${queueSnaps.size} queued tasks.`);
  for (const doc of queueSnaps.docs) {
    console.log(`Resetting: ${doc.id}`);
    await doc.ref.update({ blockedBy: [] });
  }

  console.log("Pinging monitor...");
  await fetch("https://gravix--antigravity-hub-jcloud.us-east4.hosted.app/api/jules/monitor");
  console.log("Hooks reset.");
}
flush().catch(console.error);
