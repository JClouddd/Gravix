import { GoogleAuth } from 'google-auth-library';

export class VertexSwarm {
  constructor({ projectId, location = 'us-east4' } = {}) {
    this.projectId = projectId || process.env.GOOGLE_CLOUD_PROJECT || 'antigravity-hub-jcloud';
    this.location = location;

    // Initialize Google Auth
    this.auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
  }

  /**
   * Initializes a LangChain agent on GCP Reasoning Engine and returns a bound query interface.
   * @param {string} reasoningEngineId - The ID of the Reasoning Engine.
   * @returns {Object} An object with a query method.
   */
  initializeAgent(reasoningEngineId) {
    return {
      query: async (input) => {
        return this.queryEngine(reasoningEngineId, input);
      }
    };
  }

  /**
   * Queries the GCP Vertex AI Reasoning Engine REST API natively.
   * @param {string} reasoningEngineId - The ID of the Reasoning Engine.
   * @param {Object} input - The input payload for the query.
   * @returns {Promise<Object>} The API response.
   */
  async queryEngine(reasoningEngineId, input) {
    const client = await this.auth.getClient();
    const tokenResponse = await client.getAccessToken();
    const accessToken = tokenResponse.token;

    const url = `https://${this.location}-aiplatform.googleapis.com/v1beta1/projects/${this.projectId}/locations/${this.location}/reasoningEngines/${reasoningEngineId}:query`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: input
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Vertex AI Reasoning Engine API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  }
}

export default VertexSwarm;
