import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import { logRouteError } from '@/lib/errorLogger';

const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV || 'sandbox'],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
      'Plaid-Version': '2020-09-14',
    },
  },
});

const plaidClient = new PlaidApi(configuration);

export async function POST(request) {
  try {
    const body = await request.json();
    const { public_token, access_token, cursor } = body;

    // Exchange public token for access token
    if (public_token) {
      const response = await plaidClient.itemPublicTokenExchange({
        public_token,
      });
      return Response.json(response.data);
    }

    // Sync transactions using access token
    if (access_token) {
      const response = await plaidClient.transactionsSync({
        access_token,
        cursor, // undefined cursor syncs all available
      });
      return Response.json(response.data);
    }

    return Response.json(
      { error: 'Provide either public_token or access_token' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[/api/finance/plaid/sync] POST error:', error);
    await logRouteError(
      'runtime',
      '/api/finance/plaid/sync error',
      error,
      '/api/finance/plaid/sync'
    );
    return Response.json({ error: error.message }, { status: 500 });
  }
}
