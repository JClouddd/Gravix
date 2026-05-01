import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const secretManager = new SecretManagerServiceClient();

const oauth2Client = new google.auth.OAuth2(
  process.env.YOUTUBE_CLIENT_ID,
  process.env.YOUTUBE_CLIENT_SECRET,
  process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3000/api/youtube/callback'
    : 'https://gravix--antigravity-hub-jcloud.us-east4.hosted.app/api/youtube/callback'
);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: 'No authorization code provided' }, { status: 400 });
    }

    // Exchange the authorization code for access and refresh tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    // We strictly need the refresh token to maintain persistent access
    if (tokens.refresh_token) {
      console.log('Successfully acquired YouTube refresh token.');
      
      // Store the refresh token securely in Secret Manager
      // We will create/update a secret called 'youtube-refresh-token'
      const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'antigravity-hub-jcloud';
      const secretId = 'youtube-refresh-token';
      const parent = `projects/${projectId}`;
      
      try {
        // Try to create the secret (will fail if it already exists)
        await secretManager.createSecret({
          parent,
          secretId,
          secret: {
            replication: {
              automatic: {},
            },
          },
        }).catch(err => {
          if (err.code !== 6) { // 6 is ALREADY_EXISTS
            throw err;
          }
        });
        
        // Add the new token as a version
        const payload = Buffer.from(tokens.refresh_token, 'utf8');
        await secretManager.addSecretVersion({
          parent: `${parent}/secrets/${secretId}`,
          payload: {
            data: payload,
          },
        });
        
        console.log('YouTube refresh token stored in Secret Manager.');
      } catch (smError) {
        console.error('Failed to store refresh token in Secret Manager:', smError);
        // Fallback or warning
      }
    } else {
      console.warn('OAuth flow completed but no refresh token was returned. The user may need to revoke access and try again.');
    }

    const baseUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3000'
      : 'https://gravix--antigravity-hub-jcloud.us-east4.hosted.app';

    // Redirect back to the YouTube Factory UI module with a success flag
    return NextResponse.redirect(`${baseUrl}/?module=youtube&auth=success`);

  } catch (error) {
    console.error('Error during YouTube OAuth callback:', error);
    const baseUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3000'
      : 'https://gravix--antigravity-hub-jcloud.us-east4.hosted.app';
    return NextResponse.redirect(`${baseUrl}/?module=youtube&auth=error`);
  }
}
