import { NextResponse } from 'next/server';
import { adminDb } from "@/lib/firebaseAdmin";

import crypto from 'crypto';

/**
 * Creates a JWT using standard node crypto for a Google Service Account
 */
function createJwt(serviceAccount) {
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');

  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signatureInput);
  const signature = sign.sign(serviceAccount.private_key, 'base64url');

  return `${signatureInput}.${signature}`;
}

/**
 * Gets an access token using the service account credentials
 */
async function getAccessToken(serviceAccount) {
  const jwt = createJwt(serviceAccount);

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });

  if (!response.ok) {
    throw new Error('Failed to obtain access token');
  }

  const data = await response.json();
  return data.access_token;
}

export async function POST(request) {
  try {
    const { title, body, data, type, source } = await request.json();

    if (!title || !body) {
      return NextResponse.json({ error: 'Missing title or body' }, { status: 400 });
    }

    // Store notification in Firestore history first
    const notificationType = type || 'info';
    const notificationDoc = {
      title,
      body,
      type: notificationType,
      source: source || 'system',
      read: false,
      timestamp: new Date(),
      data: data || {}
    };

    await adminDb.collection('notifications').add(notificationDoc);

    // Check notification preferences
    const prefsDoc = await adminDb.collection('settings').doc('notification_prefs').get();
    const prefs = prefsDoc.exists ? prefsDoc.data() : {};

    // If it's a specific type, check if it's disabled in preferences
    if (notificationType === 'critical' && prefs.healthAlerts === false) {
      return NextResponse.json({ success: true, stored: true, message: 'Notification stored but not sent due to user preferences (health alerts disabled)' });
    }

    // For specific sources or custom types check their toggles if mapped
    if (source === 'agent_proposals' && prefs.agentProposals === false) {
       return NextResponse.json({ success: true, stored: true, message: 'Notification stored but not sent due to user preferences (agent proposals disabled)' });
    }
    if (source === 'meeting_summaries' && prefs.meetingSummaries === false) {
       return NextResponse.json({ success: true, stored: true, message: 'Notification stored but not sent due to user preferences (meeting summaries disabled)' });
    }
    if (type === 'warning' && data?.cost && prefs.costAlerts === false) {
       return NextResponse.json({ success: true, stored: true, message: 'Notification stored but not sent due to user preferences (cost alerts disabled)' });
    }

    // 1. Get FCM Token from Firestore
    const fcmDoc = await adminDb.collection("settings").doc("fcm_token").get();
    if (!fcmDoc.exists || !fcmDoc.data().token) {
      return NextResponse.json({ error: 'No FCM token found. User might not have enabled notifications.' }, { status: 404 });
    }
    const fcmToken = fcmDoc.data().token;

    // 2. Get Service Account from ENV
    if (!process.env.FCM_SERVICE_ACCOUNT_KEY) {
      console.warn("FCM_SERVICE_ACCOUNT_KEY not provided. Notification request ignored in dev.");
      return NextResponse.json({ success: false, message: 'FCM_SERVICE_ACCOUNT_KEY not configured' }, { status: 500 });
    }

    let serviceAccount;
    try {
      serviceAccount = JSON.parse(process.env.FCM_SERVICE_ACCOUNT_KEY);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid FCM_SERVICE_ACCOUNT_KEY format' }, { status: 500 });
    }

    // 3. Obtain Access Token
    const accessToken = await getAccessToken(serviceAccount);
    const projectId = serviceAccount.project_id;

    // 4. Send via FCM HTTP v1 API
    const messagePayload = {
      message: {
        token: fcmToken,
        notification: {
          title: title,
          body: body
        },
        data: data || {}
      }
    };

    const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(messagePayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('FCM API Error:', errorText);
      return NextResponse.json({ error: 'Failed to send FCM notification', details: errorText }, { status: 500 });
    }

    const responseData = await response.json();
    return NextResponse.json({ success: true, result: responseData });

  } catch (error) {
    console.error('Error sending notification:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}