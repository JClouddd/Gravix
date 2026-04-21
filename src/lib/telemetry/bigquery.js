import { BigQueryWriteClient, managedwriter, adapt } from '@google-cloud/bigquery-storage';

const { WriterClient, JSONWriter } = managedwriter;

/**
 * Initializes a JSONWriter for BigQuery Storage Write API to stream agent telemetry.
 *
 * @param {string} projectId - The Google Cloud Project ID.
 * @param {string} datasetId - The BigQuery Dataset ID.
 * @param {string} tableId - The BigQuery Table ID.
 * @param {Object} schema - The BigQuery storage schema for the table.
 * @returns {Promise<managedwriter.JSONWriter>}
 */
export async function createAgentTelemetryStream(projectId, datasetId, tableId, schema) {
  const writeClient = new BigQueryWriteClient();
  const writeStreamPath = writeClient.projectDatasetTablePath(
    projectId,
    datasetId,
    tableId
  );

  // Use the default stream for high-throughput appends without needing manual commits
  const streamId = `${writeStreamPath}/streams/_default`;

  const writerClient = new WriterClient({
    client: writeClient,
  });

  const connection = await writerClient.createStreamConnection({
    streamId: streamId,
  });

  // Convert BigQuery storage schema to Proto2 Descriptor for JSONWriter
  const protoDescriptor = adapt.convertStorageSchemaToProto2Descriptor(schema, 'root');

  const writerOptions = {
    connection,
    protoDescriptor,
  };

  const jsonWriter = new JSONWriter(writerOptions);
  return jsonWriter;
}

/**
 * Posts agent payload into bigquery storage using ManagedJSONWriter.
 *
 * @param {managedwriter.JSONWriter} jsonWriter - The initialized JSONWriter.
 * @param {Object} payload - The agent payload object to insert.
 */
export async function writeAgentPayload(jsonWriter, payload) {
  try {
    // appendRows expects an array of rows
    const pendingWrite = await jsonWriter.appendRows([payload]);

    // Wait for the append operation to complete
    const result = await pendingWrite.getResult();
    return result;
  } catch (error) {
    console.error('Failed to write agent payload to BigQuery:', error);
    throw error;
  }
}
