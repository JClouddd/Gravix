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
    const { user_id } = body;

    const requestObj = {
      user: {
        client_user_id: user_id || 'test_user',
      },
      client_name: 'Gravix',
      products: ['transactions'],
      country_codes: ['US'],
      language: 'en',
    };

    const response = await plaidClient.linkTokenCreate(requestObj);

    return Response.json(response.data);
  } catch (error) {
    console.error('[/api/finance/plaid/link] POST error:', error);
    await logRouteError('runtime', '/api/finance/plaid/link error', error, '/api/finance/plaid/link');
    return Response.json({ error: error.message }, { status: 500 });
  }
}
