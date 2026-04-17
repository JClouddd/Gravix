import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { doc, setDoc } from "firebase/firestore";
import { app, db } from "./firebase";

/**
 * Request notification permissions from the user and get FCM token
 */
export async function requestPermission() {
  try {
    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      const messaging = getMessaging(app);

      const token = await getToken(messaging, {
        // Use default configuration. VapidKey can be provided here if needed.
      });

      if (token) {
        console.log("FCM Token obtained");

        // Save to Firestore per instructions
        await setDoc(doc(db, "settings", "fcm_token"), {
          token: token,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        return token;
      } else {
        console.warn("No registration token available. Request permission to generate one.");
        return null;
      }
    } else {
      console.warn("Notification permission denied");
      return null;
    }
  } catch (error) {
    console.error("Error requesting notification permission:", error);
    return null;
  }
}

/**
 * Listen for foreground messages
 */
export function setupForegroundMessages() {
  try {
    const messaging = getMessaging(app);

    return onMessage(messaging, (payload) => {
      console.log("Message received in foreground:", payload);

      const title = payload.notification?.title || "Gravix Notification";
      const body = payload.notification?.body || "You have a new message";

      // Simple toast implementation (using browser alert/notification if in foreground)
      if (Notification.permission === "granted") {
         new Notification(title, { body });
      } else {
         alert(`${title}: ${body}`);
      }
    });
  } catch (error) {
    console.error("Error setting up foreground messages:", error);
    return () => {}; // return empty unsubscribe function
  }
}

/**
 * Send notification via server-side API Route
 */
export async function sendNotification({ userId, title, body, data = {} }) {
  try {
    const response = await fetch("/api/notifications/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userId,
        title,
        body,
        data
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Failed to send notification: ${errorData}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error calling sendNotification API:", error);
    throw error;
  }
}
