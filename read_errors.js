const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || fs.readFileSync('./service-account.json', 'utf8'));
if (!getApps().length) {
    initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

async function run() {
    const snaps = await db.collection('system_errors').orderBy('timestamp', 'desc').limit(5).get();
    snaps.forEach(doc => {
        console.log(doc.id, doc.data());
    });
}
run().catch(console.error);
