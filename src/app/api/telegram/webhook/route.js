import { logRouteError } from '@/lib/errorLogger';

export async function POST(request) {
  try {
    const body = await request.json();

    // ── Handle Telegram Inline Keyboard Callbacks ──
    if (body.callback_query) {
      const callbackData = JSON.parse(body.callback_query.data || '{}');
      const chatId = body.callback_query.message.chat.id;
      const messageId = body.callback_query.message.message_id;

      if (callbackData.action === 'rollback_pipeline') {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        
        // Asynchronously trigger the rollback API
        fetch(`${baseUrl}/api/management/rollback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId: callbackData.planId, chatId, messageId })
        }).catch(console.error);
        
        return Response.json({ success: true });
      }
      
      return Response.json({ success: true });
    }

    // ── Handle Jules CI Status Alerts (Failed or Completed) ──
    if (body.sessionId && (body.status === 'failed' || body.status === 'completed')) {
      const devopsToken = process.env.TELEGRAM_DEVOPS_BOT_TOKEN;
      const expectedChatId = String(process.env.TELEGRAM_CHAT_ID || '').trim();

      if (devopsToken && expectedChatId) {
        let text = '';
        if (body.status === 'failed') {
          text = `🔴 Jules Task Failed: ${body.title || body.sessionId}`;
        } else if (body.status === 'completed') {
          const timeStats = body.timeStats ? `\n⏱️ Time Taken: ${body.timeStats.taken}\n📊 Comparison: ${body.timeStats.comparison}` : '';
          text = `✅ Jules Task Auto-Merged & Deployed\n\n📝 Task: ${body.title || body.sessionId}${timeStats}`;
        }

        const tgUrl = `https://api.telegram.org/bot${devopsToken}/sendMessage`;
        await fetch(tgUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: expectedChatId,
            text: text,
            reply_markup: body.status === 'failed' ? {
              inline_keyboard: [
                [
                  {
                    text: 'Retry',
                    callback_data: JSON.stringify({ action: 'retry', sessionId: body.sessionId })
                  }
                ]
              ]
            } : undefined
          }),
        });
      }
      return Response.json({ success: true });
    }

    // ── Handle Firebase App Hosting & Omni-Pipeline Alerts ──
    if (body.source === 'firebase_app_hosting' || body.source === 'omni_pipeline') {
      const devopsToken = process.env.TELEGRAM_DEVOPS_BOT_TOKEN;
      const expectedChatId = String(process.env.TELEGRAM_CHAT_ID || '').trim();

      if (devopsToken && expectedChatId) {
        let text = `🚨 **Critical Pipeline Failure Detected**\n\n`;
        text += `**Source:** ${body.source === 'firebase_app_hosting' ? 'Firebase App Hosting' : 'Omni-Pipeline Swarm'}\n`;
        text += `**Status:** ${body.status || 'FAILED'}\n`;
        if (body.planId) text += `**Plan ID:** OMNI-${body.planId}\n`;
        if (body.errorMessage) text += `\n**Error Trace:**\n\`${body.errorMessage.substring(0, 200)}...\`\n`;

        const tgUrl = `https://api.telegram.org/bot${devopsToken}/sendMessage`;
        await fetch(tgUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: expectedChatId,
            text: text,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '🔄 Retry Deploy', callback_data: JSON.stringify({ action: 'retry_pipeline', planId: body.planId }) },
                  { text: '⏮️ Rollback (Safe Mode)', callback_data: JSON.stringify({ action: 'rollback_pipeline', planId: body.planId }) }
                ]
              ]
            }
          }),
        });
        
        // ── Step 3: UI Telemetry Sync ──
        // (Mocking Firestore sync for now. In production, this updates the ai_implementation_plans document to 'Fatal Error')
        console.log(`[TELEMETRY] Syncing Fatal Error state to Firestore for Plan: ${body.planId}`);
      }
      return Response.json({ success: true });
    }

    // ── Handle Standard Telegram Messages ──
    const message = body.message;
    if (!message || !message.chat || !message.text) {
      return Response.json({ success: true });
    }

    const chatId = message.chat.id;

    // Strict validation against configured TELEGRAM_CHAT_ID
    const expectedChatId = String(process.env.TELEGRAM_CHAT_ID || '').trim();
    if (String(chatId) !== expectedChatId) {
      console.warn(`[Telegram Webhook] Unauthorized chatId: ${chatId}. Ignoring.`);
      return Response.json({ success: true });
    }

    // Proxy the payload directly to the Cloud Run Orchestrator cluster (Agent Routing)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://gravix--antigravity-hub-jcloud.us-east4.hosted.app';
    const orchestratorUrl = `${baseUrl}/api/agents/route`;

    const orchestratorRes = await fetch(orchestratorUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message.text,
        execute: true
      }),
    });

    if (orchestratorRes.ok) {
      const data = await orchestratorRes.json();
      const replyText = data.response?.text || "Orchestrator successfully processed the request silently.";
      
      const botToken = process.env.TELEGRAM_ASSISTANT_BOT_TOKEN || process.env.TELEGRAM_DEVOPS_BOT_TOKEN;
      if (botToken) {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: replyText
          })
        });
      }
    }

    // Always return 200 OK so Telegram doesn't retry
    return Response.json({ success: true });
  } catch (error) {
    await logRouteError(error, request);
    // Still return 200 OK to Telegram to avoid infinite retries
    return Response.json({ success: true });
  }
}
