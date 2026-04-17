import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
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
    const { title, body, data } = await request.json();

    if (!title || !body) {
      return NextResponse.json({ error: 'Missing title or body' }, { status: 400 });
    }

    // 1. Get FCM Token from Firestore
    const fcmDoc = await getDoc(doc(db, "settings", "fcm_token"));
    if (!fcmDoc.exists() || !fcmDoc.data().token) {
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