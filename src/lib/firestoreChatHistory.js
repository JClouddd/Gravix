import { adminDb } from './firebaseAdmin';

/**
 * Retrieves the chat history for a given chat ID from the `telegram_sessions` collection.
 *
 * @param {string|number} chatId - The ID of the Telegram chat.
 * @returns {Promise<Array<{role: string, content: string}>>} The chat history array.
 */
export async function getHistory(chatId) {
  try {
    const docRef = adminDb.collection('telegram_sessions').doc(String(chatId));
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      const data = docSnap.data();
      return Array.isArray(data.history) ? data.history : [];
    }

    return [];
  } catch (error) {
    console.error(`[firestoreChatHistory] Error fetching history for chatId ${chatId}:`, error);
    return [];
  }
}

/**
 * Appends a new message to the chat history for a given chat ID in the `telegram_sessions` collection.
 *
 * @param {string|number} chatId - The ID of the Telegram chat.
 * @param {string} role - The role of the message sender ('user' or 'model').
 * @param {string} content - The content of the message.
 * @returns {Promise<void>}
 */
export async function appendHistory(chatId, role, content) {
  try {
    const docRef = adminDb.collection('telegram_sessions').doc(String(chatId));
    const docSnap = await docRef.get();

    let history = [];
    if (docSnap.exists) {
      const data = docSnap.data();
      if (Array.isArray(data.history)) {
        history = data.history;
      }
    }

    history.push({ role, content });

    // We only store the last 50 messages to keep document size manageable
    if (history.length > 50) {
      history = history.slice(history.length - 50);
    }

    await docRef.set({ history }, { merge: true });
  } catch (error) {
    console.error(`[firestoreChatHistory] Error appending history for chatId ${chatId}:`, error);
  }
}
