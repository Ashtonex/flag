import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

const DB_KEY = 'choir-tracker-db';

const defaultData = {
  members: [
    { "id": "1", "name": "David Chaeruka", "department": "Choir" }
  ],
  attendance: []
};

export async function GET() {
  try {
    const data = await kv.get(DB_KEY);
    return NextResponse.json(data || defaultData);
  } catch (error) {
    console.error('Error reading from KV:', error);
    // If KV is not set up, fallback to default for UI to load
    return NextResponse.json(defaultData);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    let currentData: any = await kv.get(DB_KEY);
    if (!currentData) {
      currentData = defaultData;
    }

    const newData = {
      members: body.members || currentData.members,
      attendance: body.attendance || currentData.attendance
    };

    await kv.set(DB_KEY, newData);
    
    return NextResponse.json({ success: true, data: newData });
  } catch (error) {
    console.error('Error writing to KV:', error);
    return NextResponse.json({ error: 'Failed to update database' }, { status: 500 });
  }
}
