import { NextResponse } from 'next/server';

import { adminDb } from "@/lib/firebaseAdmin";
import { logRouteError } from "@/lib/errorLogger";

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Client ID is required" }, { status: 400 });
    }

    const communications = [];
    let totalEmails = 0;
    let totalMeetings = 0;

    // 1. Fetch client_emails
    try {
      const emailsRef = adminDb.collection('client_emails');
      const emailsQuery = emailsRef.where('matchedClient', '==', id);
      const emailsSnapshot = await emailsQuery.get();

      emailsSnapshot.forEach(doc => {
        const data = doc.data();
        totalEmails++;
        communications.push({
          id: doc.id,
          type: 'email',
          date: data.timestamp || data.date || new Date().toISOString(),
          title: data.subject || 'Email',
          snippet: data.snippet || data.body || '',
          ...data
        });
      });
    } catch (e) {
      logRouteError("runtime", "/api/clients/[id]/communications error", e, "/api/clients/[id]/communications");
      console.warn("Could not fetch emails:", e);
    }

    // 2. Fetch meeting_decisions
    try {
      const meetingsRef = adminDb.collection('meeting_decisions');
      // Look for meetings related to this client
      const meetingsQuery = meetingsRef.where('clientId', '==', id);
      const meetingsSnapshot = await meetingsQuery.get();

      meetingsSnapshot.forEach(doc => {
        const data = doc.data();
        totalMeetings++;
        communications.push({
          id: doc.id,
          type: 'meeting',
          date: data.timestamp || data.date || new Date().toISOString(),
          title: data.title || 'Meeting',
          snippet: data.summary || data.decisions || '',
          ...data
        });
      });
    } catch (e) {
      logRouteError("runtime", "/api/clients/[id]/communications error", e, "/api/clients/[id]/communications");
      console.warn("Could not fetch meetings:", e);
    }

    // Combine and sort by timestamp (newest first)
    communications.sort((a, b) => new Date(b.date) - new Date(a.date));

    return NextResponse.json({
      communications,
      totalEmails,
      totalMeetings
    }, { status: 200 });

  } catch (error) {
    console.error("Error fetching communications:", error);
    logRouteError("runtime", "/api/clients/[id]/communications error", error, "/api/clients/[id]/communications");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
