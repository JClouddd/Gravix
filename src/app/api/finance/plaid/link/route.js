import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import { logRouteError } from '@/lib/errorLogger';

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      client_user_id = 'user-id',
      client_name = 'Gravix App',
      products = ['auth', 'transactions'],
      country_codes = ['US'],
      language = 'en',
    } = body;

    const configuration = new Configuration({
      basePath: PlaidEnvironments[process.env.PLAID_ENV || 'sandbox'],
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
          'PLAID-SECRET': process.env.PLAID_SECRET,
        },
      },
    });

    const client = new PlaidApi(configuration);

    const response = await client.linkTokenCreate({
      user: {
        client_user_id,
      },
      client_name,
      products,
      country_codes,
      language,
    });

    return Response.json(response.data);
  } catch (error) {
    await logRouteError('runtime', 'Plaid Link Error', error, '/api/finance/plaid/link');
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
