import { PubSub } from '@google-cloud/pubsub';

const pubsub = new PubSub();
const TOPIC_NAME = process.env.PUBSUB_TOPIC_NAME || 'hub-global-events';

/**
 * Publishes an event to the global Pub/Sub event bus.
 * @param {string} eventName - The name of the event type.
 * @param {object} payload - The event data payload.
 */
export async function publishEvent(eventName, payload) {
  try {
    const messageData = JSON.stringify({
      eventName,
      payload,
      timestamp: Date.now()
    });

    const dataBuffer = Buffer.from(messageData);

    const messageId = await pubsub.topic(TOPIC_NAME).publishMessage({ data: dataBuffer });
    return messageId;
  } catch (error) {
    console.error(`Error publishing event ${eventName}:`, error);
    throw error;
  }
}

export { pubsub, TOPIC_NAME };
