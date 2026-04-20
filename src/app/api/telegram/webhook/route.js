import { getHistory, appendHistory } from '@/lib/firestoreChatHistory';
import geminiClient from '@/lib/geminiClient';
import { logRouteError } from '@/lib/errorLogger';

export async function POST(request) {
  try {
    const body = await request.json();

    // Ensure we handle various kinds of updates (we only care about normal messages for now)
    const message = body.message;
    if (!message || !message.chat || !message.text) {
      return Response.json({ success: true });
    }

    const chatId = message.chat.id;
    const text = message.text;

    // Strict validation against configured TELEGRAM_CHAT_ID
    if (String(chatId) !== String(process.env.TELEGRAM_CHAT_ID)) {
      console.warn(`[Telegram Webhook] Unauthorized chatId: ${chatId}. Ignoring.`);
      return Response.json({ success: true });
    }

    // 1. Get History
    const history = await getHistory(chatId);

    // 2. Append User Message to History
    await appendHistory(chatId, 'user', text);

    // 3. Generate AI Response
    const aiResponse = await geminiClient.generate({
      prompt: text,
      history: history,
      systemPrompt: "You are a helpful and intelligent Telegram assistant for the Gravix system.",
    });

    // 4. Append AI Response to History
    await appendHistory(chatId, 'model', aiResponse.text);

    // 5. Send Response back to Telegram via API
    const botToken = process.env.TELEGRAM_ASSISTANT_BOT_TOKEN || process.env.TELEGRAM_DEVOPS_BOT_TOKEN; // Fallback if needed
    if (!botToken) {
      throw new Error("Missing TELEGRAM_ASSISTANT_BOT_TOKEN");
    }

    const tgUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const tgResponse = await fetch(tgUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: aiResponse.text,
      }),
    });

    if (!tgResponse.ok) {
      const tgErrorText = await tgResponse.text();
      throw new Error(`Telegram API Error: ${tgResponse.status} ${tgErrorText}`);
    }

    // Always return 200 OK so Telegram doesn't retry
    return Response.json({ success: true });
  } catch (error) {
    await logRouteError(error, request);
    // Still return 200 OK to Telegram to avoid infinite retries
    return Response.json({ success: true });
  }
}
