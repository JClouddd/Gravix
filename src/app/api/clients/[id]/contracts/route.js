import { NextResponse } from 'next/server';
import { collection, doc, getDocs, addDoc, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { logRouteError } from "@/lib/errorLogger";

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Client ID is required" }, { status: 400 });
    }

    const contractsRef = collection(db, 'clients', id, 'contracts');
    const q = query(contractsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    const contracts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const totalValue = contracts.reduce((sum, c) => sum + (Number(c.value) || 0), 0);
    const activeContracts = contracts.filter(c => c.status === 'active').length;

    return NextResponse.json({ contracts, totalValue, activeContracts }, { status: 200 });
  } catch (error) {
    console.error("Error fetching contracts:", error);
    logRouteError("runtime", "/api/clients/[id]/contracts error", error, "/api/clients/[id]/contracts");
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
    const { title, type, startDate, endDate, value, notes, status } = body;

    if (!title || !type || !status) {
       return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const validTypes = ['retainer', 'project', 'hourly', 'subscription'];
    if (!validTypes.includes(type)) {
       return NextResponse.json({ error: "Invalid contract type" }, { status: 400 });
    }

    const validStatuses = ['draft', 'active', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
       return NextResponse.json({ error: "Invalid contract status" }, { status: 400 });
    }

    const contractsRef = collection(db, 'clients', id, 'contracts');
    const newDocRef = await addDoc(contractsRef, {
      title,
      type,
      startDate: startDate || null,
      endDate: endDate || null,
      value: value ? Number(value) : 0,
      notes: notes || "",
      status,
      createdAt: new Date().toISOString()
    });

    return NextResponse.json({ created: true, contractId: newDocRef.id }, { status: 201 });
  } catch (error) {
    console.error("Error creating contract:", error);
    logRouteError("runtime", "/api/clients/[id]/contracts error", error, "/api/clients/[id]/contracts");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
