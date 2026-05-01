import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin'; // Use admin db for secure server-side checks

/**
 * POST /api/finance/plaid/link
 * Generates a Plaid Link Token based on the configured environment.
 */
export async function POST(req) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: missing userId' }, { status: 401 });
    }

    // 1. Fetch Plaid Environment Setting from Firestore
    // The SettingsModule will write to 'settings/plaid_config'
    const settingsDoc = await adminDb.collection('settings').doc('plaid_config').get();
    let plaidEnv = 'sandbox'; // Default
    if (settingsDoc.exists) {
      plaidEnv = settingsDoc.data().environment || 'sandbox';
    }

    // 2. We mock the Plaid endpoint call for now to scaffold the architecture
    // When ready to wire, we will use the `plaid` Node SDK.
    const mockTokenResponse = {
      link_token: `link-${plaidEnv}-${Math.random().toString(36).substring(7)}`,
      expiration: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      environment: plaidEnv
    };

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return NextResponse.json({ 
      success: true, 
      data: mockTokenResponse,
      message: `Successfully generated Plaid link token for ${plaidEnv} environment`
    });

  } catch (error) {
    console.error('Failed to generate Plaid link token:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
