import fs from 'fs';

let content = fs.readFileSync('src/lib/firebaseAdmin.js', 'utf8');

const updated = `import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getMessaging } from "firebase-admin/messaging";

let app;

if (getApps().length === 0) {
  try {
    const serviceAccount = JSON.parse(
      Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, "base64").toString()
    );

    app = initializeApp({
      credential: cert(serviceAccount),
    });
  } catch(e) {
    app = initializeApp({ projectId: 'demo-project' });
  }
} else {
  app = getApps()[0];
}

export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);
export const adminMessaging = getMessaging(app);
`;

fs.writeFileSync('src/lib/firebaseAdmin.js', updated);
console.log('patched firebaseAdmin');
