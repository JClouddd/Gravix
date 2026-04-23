import { logRouteError } from '@/lib/errorLogger';
import bigquery, { initializeDataLake } from '@/lib/bigQueryClient';

export async function POST(request) {
  try {
    const { payload, schema, datasetId, tableId } = await request.json();

    if (!payload || !schema || !datasetId || !tableId) {
      return Response.json({ success: false, error: 'Missing required parameters' }, { status: 400 });
    }

    // Ensure BigQuery dataset and table exist
    await initializeDataLake(datasetId, tableId, schema);

    // Push the telemetry log payload to BigQuery
    await bigquery.dataset(datasetId).table(tableId).insert(payload);

    return Response.json({ success: true });
  } catch (error) {
    logRouteError('runtime', 'Telemetry Ingest Error', error, '/api/telemetry/ingest');
    return Response.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
