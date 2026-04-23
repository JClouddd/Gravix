import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import { logRouteError } from '@/lib/errorLogger';

export async function POST(request) {
  try {
    const body = await request.json();
    const { access_token, cursor, count = 100 } = body;

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

    const response = await client.transactionsSync({
      access_token,
      cursor,
      count,
    });

    return Response.json(response.data);
  } catch (error) {
    await logRouteError('runtime', 'Plaid Sync Error', error, '/api/finance/plaid/sync');
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
