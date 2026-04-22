import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Native-First Bidirectional Telegram Health Webhook
 * 
 * Handles:
 * 1. Automated pushes from GitHub Actions & EventArc (Authorization header required)
 * 2. Inbound messages from the user via Telegram Bot Webhook (Chat ID verification required)
 */

export async function POST(req) {
  try {
    const authHeader = req.headers.get('authorization');
    const systemToken = process.env.SYSTEM_CRON_SECRET || process.env.GITHUB_WEBHOOK_SECRET;
    const telegramToken = process.env.TELEGRAM_DEVOPS_BOT_TOKEN;
    const adminChatId = String(process.env.TELEGRAM_CHAT_ID || '').trim();

    if (!telegramToken || !adminChatId) {
      console.error("[Telegram Health] Missing Bot Token or Chat ID in environment.", {
        hasDevOpsToken: !!telegramToken,
        hasChatId: !!adminChatId
      });
      return NextResponse.json({ 
        error: "Missing Telegram config.", 
        hasDevOpsToken: !!telegramToken,
        hasChatId: !!adminChatId
      }, { status: 500 });
    }

    const body = await req.json();

    // ==========================================
    // 1. INBOUND TELEGRAM MESSAGE (Bidirectional)
    // ==========================================
    if (body.message && body.message.chat) {
      // Security: Only respond to our designated admin chat ID
      if (body.message.chat.id.toString() !== adminChatId) {
        return NextResponse.json({ error: "Unauthorized Chat ID." }, { status: 403 });
      }

      const text = body.message.text || "";

      // Handle the /status command
      if (text.startsWith('/status')) {
        // Fetch live Jules status from the local monitor route natively
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://gravix--antigravity-hub-jcloud.us-east4.hosted.app';
        const julesUrl = `${baseUrl}/api/jules/monitor`;
        let statusMessage = "🤖 *Jules Telemetry Report*\n\n";
        
        try {
          const res = await fetch(julesUrl);
          const data = await res.json();
          
          if (data && data.summary) {
            statusMessage += `*Active Tasks:* ${data.summary.IN_PROGRESS || 0}\n`;
            statusMessage += `*Queued:* ${data.summary.QUEUED || 0}\n`;
            statusMessage += `*Completed:* ${data.summary.COMPLETED || 0}\n`;
            statusMessage += `*Failed:* ${data.summary.FAILED || 0}\n`;
          } else {
            statusMessage += "Status data unavailable.\n";
          }
        } catch (e) {
          statusMessage += "❌ Error fetching Jules telemetry: " + e.message;
        }

        // Send the response back to Telegram
        await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: adminChatId,
            text: statusMessage,
            parse_mode: 'Markdown'
          })
        });

        return NextResponse.json({ success: true });
      }

      // Ignore other messages
      return NextResponse.json({ success: true, message: "Ignored." });
    }

    // ==========================================
    // 2. AUTOMATED PUSH (GitHub / EventArc)
    // ==========================================
    if (!authHeader || authHeader !== `Bearer ${systemToken}`) {
      return NextResponse.json({ error: "Unauthorized native webhook caller." }, { status: 401 });
    }
    
    const source = body.source || 'UNKNOWN';
    const status = body.status || 'INFO';
    const title = body.title || 'Pipeline Update';
    const detail = body.detail || '';

    const statusIcon = status === 'SUCCESS' ? '✅' : status === 'FAILED' ? '❌' : status === 'RETRYING' ? '♻️' : '⏳';
    const sourceIcon = source === 'GITHUB_JULES' ? '🐙' : source === 'FIREBASE_HOSTING' ? '🔥' : '🤖';

    const message = `
${statusIcon} *${sourceIcon} ${title}*
*Status:* ${status}
*Details:* ${detail}

_Native Orchestrator Alert_
    `.trim();

    const telegramRes = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: adminChatId,
        text: message,
        parse_mode: 'Markdown'
      })
    });

    if (!telegramRes.ok) {
      console.error("[Telegram Health] Failed to push to Telegram");
      return NextResponse.json({ error: "Telegram push failed" }, { status: 502 });
    }

    return NextResponse.json({ success: true, message: "Native telemetry alert broadcasted." });

  } catch (error) {
    console.error("[Telegram Health] Error processing webhook:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
