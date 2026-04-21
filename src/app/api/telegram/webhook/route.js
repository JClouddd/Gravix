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
    const expectedChatId = String(process.env.TELEGRAM_CHAT_ID || '').trim();
    if (String(chatId) !== expectedChatId) {
      console.warn(`[Telegram Webhook] Unauthorized chatId: ${chatId}. Ignoring.`);
      return Response.json({ success: true });
    }

    // 1. Get History
    const history = await getHistory(chatId);

    // 2. Append User Message to History
    await appendHistory(chatId, 'user', text);

    const tools = [
      {
        name: "getJulesStatus",
        description: "Check the status of running, queued, or recently failed Jules autonomous CI/CD pipelines.",
        parameters: { type: "object", properties: {} }
      },
      {
        name: "getSystemErrors",
        description: "Check if there are any active runtime or pipeline errors in the Gravix backend.",
        parameters: { type: "object", properties: {} }
      }
    ];

    const systemPrompt = "You are Gravix Assistant, the deeply intelligent technical copilot for the Gravix Agentic OS. Use your tools natively to check internal data to answer user requests. Keep responses concise.";

    // 3. Generate AI Response
    let aiResponse = await geminiClient.generate({
      prompt: text,
      history: history,
      tools: tools,
      systemPrompt: systemPrompt
    });

    let finalAiText = "";

    if (aiResponse.functionCalls && aiResponse.functionCalls.length > 0) {
      const call = aiResponse.functionCalls[0];
      let functionResult = {};

      const { adminDb } = await import('@/lib/firebaseAdmin');

      if (call.name === "getJulesStatus") {
        const pipelines = await adminDb.collection("jules_pipelines").orderBy("createdAt", "desc").limit(5).get();
        functionResult = { 
          pipelines: pipelines.docs.map(d => ({ id: d.id, status: d.data().status })) 
        };
      } else if (call.name === "getSystemErrors") {
        const errs = await adminDb.collection("system_errors").orderBy("timestamp", "desc").limit(5).get();
        functionResult = { 
          errors: errs.docs.map(d => d.data().message) 
        };
      } else {
        functionResult = { error: "Unknown tool" };
      }

      const functionResponseParts = [
        { functionResponse: { name: call.name, response: functionResult } }
      ];

      const extendedHistory = [
        ...history,
        { role: "user", parts: [{ text }] },
        { role: "model", parts: [{ functionCall: call }] },
        { role: "function", parts: functionResponseParts }
      ];

      const followupResponse = await geminiClient.generate({
        prompt: "",
        history: extendedHistory,
        tools: tools,
        systemPrompt: systemPrompt
      });

      finalAiText = followupResponse.text;
    } else {
      finalAiText = aiResponse.text;
    }

    // 4. Append AI Response to History
    await appendHistory(chatId, 'model', finalAiText);

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
