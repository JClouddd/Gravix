import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { logRouteError } from "@/lib/errorLogger";

export async function GET() {
  try {
    const notificationsRef = adminDb.collection('notifications');
    const snapshot = await notificationsRef
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();

    const notifications = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : data.timestamp
      };
    });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    logRouteError("runtime", "/api/notifications/history error", error, "/api/notifications/history");
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
    }

    const notificationRef = adminDb.collection('notifications').doc(id);
    await notificationRef.update({
      read: true
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    logRouteError("runtime", "/api/notifications/history error", error, "/api/notifications/history");
    return NextResponse.json({ error: 'Failed to mark notification as read' }, { status: 500 });
  }
}
