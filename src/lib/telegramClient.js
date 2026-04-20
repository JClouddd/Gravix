/**
 * Telegram Client Utility
 * Handles sending alerts and messages via Telegram bots.
 */

/**
 * Sends a devops alert message to the configured Telegram chat.
 *
 * @param {string} text - The message to send.
 */
export async function sendDevOpsAlert(text) {
  const token = process.env.TELEGRAM_DEVOPS_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn('[TelegramClient] Missing TELEGRAM_DEVOPS_BOT_TOKEN or TELEGRAM_CHAT_ID. Skipping alert.');
    return;
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
      }),
    });

    if (!response.ok) {
      console.error(`[TelegramClient] Failed to send message. Status: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error('[TelegramClient] Error sending message:', error);
  }
}
