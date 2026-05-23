import { NextResponse } from 'next/server';
import { getWAStatus, initWA, logoutWA } from '@/lib/wa';

export async function GET() {
  return NextResponse.json(getWAStatus());
}

export async function POST() {
  await initWA(true);
  return NextResponse.json({ success: true, ...getWAStatus() });
}

export async function DELETE() {
  await logoutWA();
  return NextResponse.json({ success: true });
}
