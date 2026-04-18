import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { getTaskLists, getTasks, refreshAccessToken } from "@/lib/googleAuth";

function jsonToCsv(jsonArray) {
  if (!jsonArray || !jsonArray.length) return "";

  // Extract headers
  const headers = Array.from(
    new Set(jsonArray.flatMap(Object.keys))
  );

  const csvRows = [];
  csvRows.push(headers.join(','));

  for (const row of jsonArray) {
    const values = headers.map(header => {
      const val = row[header];
      if (val === null || val === undefined) return "";
      let str = String(val);
      // Escape quotes
      if (str.includes('"')) str = str.replace(/"/g, '""');
      // Wrap in quotes if it contains comma, quote or newline
      if (str.search(/("|,|\n)/g) >= 0) {
        str = `"${str}"`;
      }
      return str;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const format = searchParams.get('format') || 'json';

  if (!['costs', 'clients', 'tasks', 'knowledge', 'income', 'finance_full'].includes(type)) {
    return NextResponse.json({ error: "Invalid type parameter" }, { status: 400 });
  }

  if (!['json', 'csv'].includes(format)) {
    return NextResponse.json({ error: "Invalid format parameter" }, { status: 400 });
  }

  try {
    let dataToExport = null;

    if (type === 'costs') {
      const costsRef = adminDb.collection('api_usage');
      const snapshot = await costsRef.get();
      dataToExport = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } else if (type === 'clients') {
      const clientsRef = adminDb.collection('clients');
      const snapshot = await clientsRef.get();
      const clients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const clientsWithBilling = await Promise.all(clients.map(async (client) => {
        const billingRef = adminDb.collection('clients').doc(client.id).collection('billing');
        const bSnapshot = await billingRef.get();
        const billing = bSnapshot.docs.map(doc => doc.data());

        const totalBilled = billing.filter(b => b.type === 'invoice').reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
        const totalPaid = billing.filter(b => b.type === 'payment').reduce((sum, b) => sum + (Number(b.amount) || 0), 0);

        return {
          ...client,
          totalBilled,
          totalPaid,
          balance: totalBilled - totalPaid
        };
      }));
      dataToExport = clientsWithBilling;
    } else if (type === 'income') {
      const clientsRef = adminDb.collection('clients');
      const snapshot = await clientsRef.get();
      const clients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const allIncome = [];
      await Promise.all(clients.map(async (client) => {
        const billingRef = adminDb.collection('clients').doc(client.id).collection('billing');
        const bSnapshot = await billingRef.get();
        bSnapshot.docs.forEach(doc => {
          const d = doc.data();
          if (d.type === 'invoice' || d.type === 'payment') {
             allIncome.push({
                clientId: client.id,
                clientName: client.name,
                id: doc.id,
                ...d
             });
          }
        });
      }));
      dataToExport = allIncome;
    } else if (type === 'finance_full') {
       // Combine costs and income
       const costsRef = adminDb.collection('api_usage');
       const cSnapshot = await costsRef.get();
       const costs = cSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

       const clientsRef = adminDb.collection('clients');
       const clientsSnapshot = await clientsRef.get();
       const clients = clientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

       const allIncome = [];
       await Promise.all(clients.map(async (client) => {
         const billingRef = adminDb.collection('clients').doc(client.id).collection('billing');
         const bSnapshot = await billingRef.get();
         bSnapshot.docs.forEach(doc => {
           const d = doc.data();
           if (d.type === 'invoice' || d.type === 'payment') {
              allIncome.push({
                 clientId: client.id,
                 clientName: client.name,
                 id: doc.id,
                 ...d
              });
           }
         });
       }));

       dataToExport = {
         costs,
         income: allIncome,
         generatedAt: new Date().toISOString()
       };
    } else if (type === 'tasks') {
      const tokensDoc = await adminDb.collection("settings").doc("google_oauth").get();
      if (!tokensDoc.exists) {
        return NextResponse.json({ error: "Google OAuth not connected" }, { status: 401 });
      }

      const tokens = tokensDoc.data();
      let accessToken = tokens.accessToken;

      if (Date.now() > tokens.expiresAt) {
         try {
           const refreshed = await refreshAccessToken(tokens.refreshToken);
           accessToken = refreshed.access_token;
           await adminDb.collection("settings").doc("google_oauth").update({
             accessToken: refreshed.access_token,
             expiresAt: Date.now() + (refreshed.expires_in * 1000),
           });
         } catch (err) {
           return NextResponse.json({ error: "Token refresh failed" }, { status: 401 });
         }
      }

      const listsResponse = await getTaskLists(accessToken);
      const taskLists = listsResponse.items || [];

      const tasksPromises = taskLists.map(async (list) => {
         try {
           const tasksRes = await getTasks(accessToken, list.id);
           const tasks = tasksRes.items || [];
           return tasks.map(task => ({
              ...task,
              listId: list.id,
              listTitle: list.title
           }));
         } catch(e) {
           return [];
         }
      });
      const tasksArrays = await Promise.all(tasksPromises);
      dataToExport = tasksArrays.flat();

    } else if (type === 'knowledge') {
      const knowledgeRef = adminDb.collection('ingestion');
      const snapshot = await knowledgeRef.get();
      dataToExport = snapshot.docs.map(doc => {
         const d = doc.data();
         // Simplify classification for CSV
         let category = "";
         if (d.classification && d.classification.category) {
            category = d.classification.category;
         }
         return {
            id: doc.id,
            title: d.title,
            type: d.type,
            status: d.status,
            source: d.source,
            category,
            createdAt: d.createdAt,
            contentLength: d.contentLength
         };
      });
    }

    let responseContent;
    let contentType;
    let extension;

    if (format === 'csv') {
      if (type === 'finance_full') {
        // finance_full cannot be exported as CSV directly due to its nested structure
        return NextResponse.json({ error: "finance_full can only be exported as JSON" }, { status: 400 });
      }
      responseContent = jsonToCsv(dataToExport);
      contentType = 'text/csv';
      extension = 'csv';
    } else {
      responseContent = JSON.stringify(dataToExport, null, 2);
      contentType = 'application/json';
      extension = 'json';
    }

    return new NextResponse(responseContent, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="export-${type}-${new Date().toISOString().split('T')[0]}.${extension}"`
      }
    });

  } catch (error) {
    console.error("Export Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
