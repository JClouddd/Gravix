import { BigQuery } from '@google-cloud/bigquery';

const bigquery = new BigQuery();

/**
 * Initializes a dataset and table if they do not already exist.
 *
 * @param {string} datasetId - The BigQuery Dataset ID.
 * @param {string} tableId - The BigQuery Table ID.
 * @param {Object} schema - The BigQuery table schema.
 */
export async function initializeDataLake(datasetId, tableId, schema) {
  const dataset = bigquery.dataset(datasetId);

  // Check if dataset exists, create if not
  const [datasetExists] = await dataset.exists();
  if (!datasetExists) {
    await bigquery.createDataset(datasetId);
    console.log(`Dataset ${datasetId} created.`);
  }

  const table = dataset.table(tableId);

  // Check if table exists, create if not
  const [tableExists] = await table.exists();
  if (!tableExists) {
    const options = {
      schema: schema,
    };
    await dataset.createTable(tableId, options);
    console.log(`Table ${tableId} created in dataset ${datasetId}.`);
  }
}

export default bigquery;
