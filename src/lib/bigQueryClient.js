import { BigQuery } from '@google-cloud/bigquery';

let bigqueryClient = null;

/**
 * Initializes and returns the BigQuery client.
 *
 * @returns {BigQuery}
 */
export function getBigQueryClient() {
  if (!bigqueryClient) {
    bigqueryClient = new BigQuery();
  }
  return bigqueryClient;
}

/**
 * Ensures a BigQuery dataset and table exist. Creates them if they do not.
 *
 * @param {string} datasetId - The BigQuery Dataset ID.
 * @param {string} tableId - The BigQuery Table ID.
 * @param {Object} schema - The BigQuery table schema.
 * @returns {Promise<Object>} The dataset and table objects.
 */
// Cache to store verification status and avoid redundant BigQuery API calls
const verifiedTables = new Set();

export async function ensureDatasetAndTable(datasetId, tableId, schema) {
  const bigquery = getBigQueryClient();
  const dataset = bigquery.dataset(datasetId);
  const table = dataset.table(tableId);

  const cacheKey = `${datasetId}.${tableId}`;

  // If we already verified this table during this instance's lifecycle, return it
  if (verifiedTables.has(cacheKey)) {
    return { dataset, table };
  }

  // Check if dataset exists, create if not
  const [datasetExists] = await dataset.exists();
  if (!datasetExists) {
    console.log(`Dataset ${datasetId} does not exist. Creating...`);
    await bigquery.createDataset(datasetId);
  }

  // Check if table exists, create if not
  const [tableExists] = await table.exists();
  if (!tableExists) {
    console.log(`Table ${tableId} does not exist. Creating...`);
    const options = {
      schema: schema,
    };
    await dataset.createTable(tableId, options);
  }

  // Mark as verified
  verifiedTables.add(cacheKey);

  return { dataset, table };
}
