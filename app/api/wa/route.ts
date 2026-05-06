import { NextResponse } from 'next/server';
import { initWA, getWAStatus, logoutWA } from '@/lib/wa';

export async function GET() {
  const status = getWAStatus();
  return NextResponse.json(status);
}

export async function POST() {
  await initWA();
  return NextResponse.json({ success: true, ...getWAStatus() });
}

export async function DELETE() {
  await logoutWA();
  return NextResponse.json({ success: true });
}
