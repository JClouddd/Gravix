import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { logRouteError } from "@/lib/errorLogger";

/**
 * GET /api/settings?uid=<uid>
 * Returns user preferences from Firestore
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid') || 'owner';

    const docRef = adminDb.collection('settings').doc('user_preferences');
    const snap = await docRef.get();

    if (!snap.exists) {
      // Return defaults for new users
      const defaults = {
        theme: 'dark',
        accentColor: '#6C5CE7',
        fontSize: 14,
        integrations: {
          gmail: false,
          calendar: false,
          tasks: false,
          firebase: true,
          vertexAi: false,
          jules: true,
        },
        notifications: {
          costAlerts: true,
          agentErrors: true,
          prMerged: true,
          dailyDigest: false,
        },
        sessionTimeout: 30, // minutes
      };
      return NextResponse.json({ settings: defaults, isDefault: true });
    }

    return NextResponse.json({ settings: snap.data(), isDefault: false });
  } catch (error) {
    logRouteError("runtime", "/api/settings error", error, "/api/settings");
      return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/settings
 * Saves user preferences to Firestore
 * Body: { uid, settings: { ... } }
 */
export async function POST(request) {
  try {
    const { uid = 'owner', settings } = await request.json();

    if (!settings) {
      return NextResponse.json(
        { error: 'settings required' },
        { status: 400 }
      );
    }

    const docRef = adminDb.collection('settings').doc('user_preferences');
    await docRef.set({
      ...settings,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    return NextResponse.json({ saved: true });
  } catch (error) {
    logRouteError("runtime", "/api/settings error", error, "/api/settings");
      return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
