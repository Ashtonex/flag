import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'db.json');

export async function GET() {
  try {
    const fileContents = await fs.readFile(dbPath, 'utf8');
    const data = JSON.parse(fileContents);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error reading db.json:', error);
    return NextResponse.json({ error: 'Failed to read database' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Read current data
    let currentData = { members: [], attendance: [] };
    try {
      const fileContents = await fs.readFile(dbPath, 'utf8');
      currentData = JSON.parse(fileContents);
    } catch (readError) {
      // If file doesn't exist or is invalid, we'll just use the empty default
      console.warn('Could not read existing db.json, starting fresh.', readError);
    }

    // Merge or update based on what is sent
    const newData = {
      members: body.members || currentData.members,
      attendance: body.attendance || currentData.attendance
    };

    // Write back to file
    await fs.writeFile(dbPath, JSON.stringify(newData, null, 2), 'utf8');
    
    return NextResponse.json({ success: true, data: newData });
  } catch (error) {
    console.error('Error writing to db.json:', error);
    return NextResponse.json({ error: 'Failed to update database' }, { status: 500 });
  }
}
