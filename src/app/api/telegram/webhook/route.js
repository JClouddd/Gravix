import { logRouteError } from '@/lib/errorLogger';

export async function POST(request) {
  try {
    const body = await request.json();

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
