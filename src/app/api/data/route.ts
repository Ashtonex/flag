import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import fs from 'fs/promises';
import path from 'path';

// Support both Upstash integration and legacy Vercel KV integration
const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

const kv = url && token ? new Redis({ url, token }) : null;
const DB_KEY = 'choir-tracker-db';

const defaultData = {
  members: [
    { "id": "1", "name": "David Chaeruka", "department": "Choir" }
  ],
  attendance: []
};

// Helper for local dev fallback
async function getLocalDbPath() {
  return path.join(process.cwd(), 'data', 'db.json');
}

export async function GET() {
  try {
    if (kv) {
      const data = await kv.get(DB_KEY);
      return NextResponse.json(data || defaultData);
    } else {
      // Fallback for local development
      const dbPath = await getLocalDbPath();
      const fileContents = await fs.readFile(dbPath, 'utf8');
      return NextResponse.json(JSON.parse(fileContents));
    }
  } catch (error) {
    console.error('Error reading DB:', error);
    return NextResponse.json(defaultData);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    if (kv) {
      let currentData: any = await kv.get(DB_KEY) || defaultData;
      
      const newData = {
        members: body.members || currentData.members,
        attendance: body.attendance || currentData.attendance
      };

      await kv.set(DB_KEY, newData);
      return NextResponse.json({ success: true, data: newData });
    } else {
      // Fallback for local development
      const dbPath = await getLocalDbPath();
      let currentData = defaultData;
      
      try {
        const fileContents = await fs.readFile(dbPath, 'utf8');
        currentData = JSON.parse(fileContents);
      } catch (e) {
        // file might not exist
      }

      const newData = {
        members: body.members || currentData.members,
        attendance: body.attendance || currentData.attendance
      };

      await fs.mkdir(path.dirname(dbPath), { recursive: true });
      await fs.writeFile(dbPath, JSON.stringify(newData, null, 2));
      
      return NextResponse.json({ success: true, data: newData });
    }
  } catch (error) {
    console.error('Error writing to DB:', error);
    return NextResponse.json({ error: 'Failed to update database' }, { status: 500 });
  }
}
