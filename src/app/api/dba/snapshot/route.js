import { adminDb } from "@/lib/firebaseAdmin";
import { logRouteError } from "@/lib/errorLogger";
import { google } from 'googleapis';

function getFirestoreClient() {
  const client = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/datastore', 'https://www.googleapis.com/auth/cloud-platform'],
  });

  return google.firestore({
    version: 'v1',
    auth: client
  });
}

export async function POST(request) {
  try {
    const backupId = `snapshot-${Date.now()}`;
    const timestamp = new Date().toISOString();

    // We are going to use Firestore Admin API to trigger a real backup
    const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'antigravity-hub-jcloud';
    const firestoreAdmin = getFirestoreClient();
    const bucketName = process.env.FIRESTORE_BACKUP_BUCKET || `${projectId}-firestore-backups`;

    let operationName = null;
    try {
      const response = await firestoreAdmin.projects.databases.exportDocuments({
        name: `projects/${projectId}/databases/(default)`,
        requestBody: {
          outputUriPrefix: `gs://${bucketName}/${backupId}`
        }
      });
      operationName = response.data.name;
    } catch (exportError) {
      await logRouteError("dba_snapshot_trigger", exportError);
      throw new Error(`Failed to trigger Firestore export: ${exportError.message}`);
    }

    await adminDb.collection("dba_snapshots").doc(backupId).set({
      id: backupId,
      timestamp,
      status: "pending",
      type: "full",
      operationName
    });

    return Response.json({ success: true, backupId });
  } catch (error) {
    await logRouteError("dba_snapshot", error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const snapshotsRef = adminDb.collection("dba_snapshots");

    // Check for pending snapshots to update their status
    const pendingSnapshots = await snapshotsRef
      .where("status", "==", "pending")
      .get();

    if (!pendingSnapshots.empty) {
      const firestoreAdmin = getFirestoreClient();

      for (const doc of pendingSnapshots.docs) {
        const data = doc.data();
        if (data.operationName) {
          try {
            const operationResponse = await firestoreAdmin.projects.databases.operations.get({
              name: data.operationName
            });

            const operation = operationResponse.data;
            if (operation.done) {
              if (operation.error) {
                await doc.ref.update({ status: "failed", error: operation.error });
              } else {
                await doc.ref.update({ status: "completed" });
              }
            }
          } catch (opError) {
             await logRouteError("dba_snapshot_operation_check", opError);
          }
        }
      }
    }

    // Now get the latest completed snapshot
    const querySnapshot = await snapshotsRef
      .where("status", "==", "completed")
      .orderBy("timestamp", "desc")
      .limit(1)
      .get();

    if (querySnapshot.empty) {
      return Response.json({ success: true, hasSnapshot: false, latestSnapshot: null });
    }

    const latestSnapshot = querySnapshot.docs[0].data();
    return Response.json({ success: true, hasSnapshot: true, latestSnapshot });
  } catch (error) {
    await logRouteError("dba_snapshot_verify", error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
