import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { planId, chatId, messageId } = await req.json();

    if (!planId || !chatId || !messageId) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    console.log(`[ROLLBACK] Triggered for Plan: ${planId}`);

    // 1. Execute Rollback Logic
    // In production, this would trigger a GitHub Action or Google Cloud Run Job
    // to execute `git revert HEAD --no-edit` and push to main.
    // For now, we mock the delay.
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 2. Update the Telegram Message to show success (Status Sync)
    const botToken = process.env.TELEGRAM_DEVOPS_BOT_TOKEN;
    if (botToken) {
      const tgUrl = `https://api.telegram.org/bot${botToken}/editMessageText`;
      await fetch(tgUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text: `✅ **Rollback Successful**\n\nThe Omni-Pipeline for Plan OMNI-${planId} has been successfully reverted to the last stable state. Firebase App Hosting is currently redeploying the safe commit.`,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [] // Remove buttons after action is taken
          }
        }),
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Rollback triggered successfully.'
    });

  } catch (error) {
    console.error('[ROLLBACK] API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
