import { google } from 'googleapis';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { logUsage } from './costTracker';

const secretManager = new SecretManagerServiceClient();

let oauth2ClientInstance = null;

/**
 * Gets an authenticated YouTube API client using the refresh token stored in Secret Manager.
 */
export async function getYouTubeClient() {
  if (oauth2ClientInstance) {
    return google.youtube({ version: 'v3', auth: oauth2ClientInstance });
  }

  const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'antigravity-hub-jcloud';
  
  try {
    // 1. Fetch the OAuth Client ID and Secret (Assuming they are in env vars for now, 
    // though ideally they should be in Secret Manager too)
    const clientId = process.env.YOUTUBE_CLIENT_ID;
    const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      throw new Error('YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET must be set');
    }

    // 2. Fetch the refresh token from Secret Manager
    const name = `projects/${projectId}/secrets/youtube-refresh-token/versions/latest`;
    const [version] = await secretManager.accessSecretVersion({ name });
    const refreshToken = version.payload.data.toString('utf8');

    // 3. Initialize the OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret
    );

    // Set the credentials using the refresh token
    // The googleapis library will automatically handle refreshing the access token
    oauth2Client.setCredentials({
      refresh_token: refreshToken
    });

    oauth2ClientInstance = oauth2Client;

    return google.youtube({ version: 'v3', auth: oauth2Client });
  } catch (error) {
    console.error('Failed to initialize YouTube client:', error);
    throw new Error('YouTube authentication failed. User may need to reconnect their account.');
  }
}

/**
 * Helper function to track YouTube API quota usage via the Cost Tracker
 */
export async function trackYouTubeQuota(operation, quotaUnits) {
  try {
    // We treat 'quota units' as a metric similar to tokens for tracking burn rates
    await logUsage({
      service: 'youtube_api',
      operation: operation,
      model: 'quota_unit',
      inputTokens: quotaUnits, // Overloading this field to track units
      outputTokens: 0,
      metadata: { note: 'YouTube Data API v3 quota usage' }
    });
  } catch (error) {
    console.error('Failed to track YouTube quota:', error);
  }
}
