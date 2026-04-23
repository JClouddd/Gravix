import { pubsub, TOPIC_NAME } from '@/lib/eventBus';
import EventEmitter from 'events';
import { logRouteError } from '@/lib/errorLogger';
import crypto from 'crypto';

const sseEmitter = new EventEmitter();

// Increased limit for potential concurrent connections to the single instance
sseEmitter.setMaxListeners(0);

let subscription = null;
const baseSubscriptionName = process.env.PUBSUB_SUBSCRIPTION_NAME || 'hub-global-events-sse-sub';
const instanceId = crypto.randomUUID();
// Unique subscription per server instance for broadcast fan-out
const SUBSCRIPTION_NAME = `${baseSubscriptionName}-${instanceId}`;

// Initialize the shared Pub/Sub subscription for this instance
async function initSubscription() {
  if (subscription) return;

  try {
    // Create an ephemeral subscription that expires if not used
    const [sub] = await pubsub.topic(TOPIC_NAME).createSubscription(SUBSCRIPTION_NAME, {
      expirationPolicy: {
        ttl: {
          seconds: 86400 // 1 day
        }
      }
    });

    subscription = sub;

    subscription.on('message', message => {
      try {
        const data = message.data.toString();
        // Broadcast to all connected SSE clients
        sseEmitter.emit('event', data);
        message.ack();
      } catch (err) {
        console.error('Error processing Pub/Sub message:', err);
        message.nack();
      }
    });

    subscription.on('error', error => {
      console.error('Pub/Sub Subscription Error:', error);
    });
  } catch (error) {
    console.error('Failed to initialize Pub/Sub subscription:', error);
  }
}

// Ensure the subscription is started
initSubscription();

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const onEvent = (data) => {
          try {
            // Keep it as an unnamed message by not prefixing with `event:`
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          } catch (e) {
            // Fallback for raw data
             controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
        };

        sseEmitter.on('event', onEvent);

        // Send initial connection success message
        controller.enqueue(encoder.encode(`data: {"status": "connected"}\n\n`));

        // Handle client disconnect
        request.signal.addEventListener('abort', () => {
          sseEmitter.off('event', onEvent);
          try {
             controller.close();
          } catch (e) {
             // Ignore if already closed
          }
        });
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    logRouteError("runtime", "SSE Connection Error", error, "/api/events/sse");
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
