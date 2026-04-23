import { ensureDatasetAndTable } from '@/lib/bigQueryClient';
import { logRouteError } from '@/lib/errorLogger';

const DATASET_ID = process.env.BIGQUERY_TELEMETRY_DATASET || 'agent_telemetry';
const TABLE_ID = process.env.BIGQUERY_TELEMETRY_TABLE || 'events';

// Define a basic schema for telemetry events
const TELEMETRY_SCHEMA = [
  { name: 'timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' },
  { name: 'event_type', type: 'STRING', mode: 'REQUIRED' },
  { name: 'agent_id', type: 'STRING', mode: 'NULLABLE' },
  { name: 'payload', type: 'JSON', mode: 'NULLABLE' },
];

export async function POST(request) {
  try {
    const data = await request.json();

    // Ensure we have a payload to insert
    if (!data || Object.keys(data).length === 0) {
      return Response.json({ error: 'Payload is required' }, { status: 400 });
    }

    // Prepare the row to insert
    const row = {
      timestamp: bigQueryTimestamp(data.timestamp || new Date().toISOString()),
      event_type: data.event_type || 'unknown',
      agent_id: data.agent_id || null,
      payload: data.payload ? JSON.stringify(data.payload) : null,
    };

    // Ensure the dataset and table exist
    const { table } = await ensureDatasetAndTable(DATASET_ID, TABLE_ID, TELEMETRY_SCHEMA);

    // Insert the row
    await table.insert([row]);

    return Response.json({ success: true, message: 'Telemetry data ingested successfully' }, { status: 200 });

  } catch (error) {
    // Log the error natively
    await logRouteError(
      'runtime',
      'Telemetry Ingestion Error',
      error,
      '/api/telemetry/ingest'
    );

    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Helper to format ISO strings or Date objects to BigQuery TIMESTAMP format
function bigQueryTimestamp(dateStr) {
  return new Date(dateStr).toISOString();
}
