import { NextResponse } from 'next/server';
import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.YOUTUBE_CLIENT_ID,
  process.env.YOUTUBE_CLIENT_SECRET,
  process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3000/api/youtube/callback'
    : 'https://gravix--antigravity-hub-jcloud.us-east4.hosted.app/api/youtube/callback'
);

// Define the scopes needed for YouTube Data and Analytics
const SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/yt-analytics.readonly',
];

export async function GET() {
  try {
    // Generate a secure URL to redirect the user to Google's consent screen
    const authorizeUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Requests a refresh token
      scope: SCOPES,
      prompt: 'consent'       // Forces the consent screen to ensure we get a refresh token
    });

    return NextResponse.redirect(authorizeUrl);
  } catch (error) {
    console.error('Error generating YouTube Auth URL:', error);
    return NextResponse.json({ error: 'Failed to initiate OAuth flow' }, { status: 500 });
  }
}
