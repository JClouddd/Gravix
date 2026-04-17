import { NextResponse } from 'next/server';
import { collection, doc, getDocs, addDoc, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Client ID is required" }, { status: 400 });
    }

    const billingRef = collection(db, 'clients', id, 'billing');
    const q = query(billingRef, orderBy('date', 'desc'));
    const snapshot = await getDocs(q);

    const entries = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({ entries }, { status: 200 });
  } catch (error) {
    console.error("Error fetching billing entries:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Client ID is required" }, { status: 400 });
    }

    const body = await request.json();
    const { description, amount, hours, date, type } = body;

    if (!description || !amount || !date || !type) {
       return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // validate type
    if (!["invoice", "payment", "expense"].includes(type)) {
       return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    const billingRef = collection(db, 'clients', id, 'billing');
    const newDocRef = await addDoc(billingRef, {
      description,
      amount: Number(amount),
      hours: hours ? Number(hours) : null,
      date,
      type,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({ created: true, entryId: newDocRef.id }, { status: 201 });
  } catch (error) {
    console.error("Error creating billing entry:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
