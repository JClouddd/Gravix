import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(request) {
  try {
    const body = await request.json();
    await adminDb.collection('dynamic_ui').doc(body.schemaId).set(body.schema);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
