import { adminDb } from '@/lib/firebaseAdmin';
import { logRouteError } from '@/lib/errorLogger';

export async function POST(request) {
  try {
    const payload = await request.json();
    const message = payload.message || payload.edited_message;

    if (!message || !message.chat || !message.text) {
      return Response.json({ success: true, message: 'Ignored' });
    }

    const chatId = String(message.chat.id);
    const expectedChatId = String(process.env.TELEGRAM_CHAT_ID);

    if (chatId !== expectedChatId) {
      return Response.json({ success: true, message: 'Unauthorized chat ID' });
    }

    if (message.text.includes('/status')) {
      const pipelinesRef = adminDb.collection('jules_pipelines');
      const snapshot = await pipelinesRef.where('status', 'in', ['running', 'merging']).get();

      let replyText = '';

      if (snapshot.empty) {
        replyText = '🟢 No active CI/CD pipelines currently running.';
      } else {
        replyText = '*Active Pipelines:*\n\n';
        snapshot.forEach((doc) => {
          const data = doc.data();
          replyText += `*Pipeline:* \`${doc.id}\`\n`;
          replyText += `*Status:* ${data.status}\n`;
          if (data.currentWave !== undefined && data.totalWaves !== undefined) {
            replyText += `*Wave:* ${data.currentWave} / ${data.totalWaves}\n`;
          }
          if (data.taskStatus) {
            replyText += `*Task Status:* ${data.taskStatus}\n`;
          }
          replyText += '\n';
        });
      }

      const telegramUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_DEVOPS_BOT_TOKEN}/sendMessage`;
      await fetch(telegramUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: message.chat.id,
          text: replyText,
          parse_mode: 'Markdown',
        }),
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    await logRouteError('runtime', 'Telegram health webhook error', error, '/api/telegram/health');
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
