/**
 * POST /api/email/inbox — Fetch + classify inbox
 * GET /api/email/inbox — Get inbox status
 */

export async function GET() {
  return Response.json({
    connected: false,
    message: "Gmail is not connected. Complete OAuth consent screen and connect your account.",
    inbox: [],
    stats: {
      total: 0,
      unread: 0,
      actionRequired: 0,
      clientEmails: 0,
    },
    classifications: {
      actionRequired: [],
      clientRelated: [],
      invoices: [],
      calendarInvites: [],
      newsletters: [],
    },
  });
}

export async function POST(request) {
  try {
    const { action, emailId, options = {} } = await request.json();

    if (!action) {
      return Response.json({ error: "action is required (fetch, classify, archive)" }, { status: 400 });
    }

    // TODO: Wire to Gmail API once OAuth is configured
    return Response.json({
      connected: false,
      message: "Gmail API not connected. Configure OAuth consent screen first.",
      action,
    });
  } catch (error) {
    console.error("[/api/email/inbox]", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
