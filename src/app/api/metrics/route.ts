import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';

export async function GET() {
  const store = getStore();
  return NextResponse.json({
    success: true,
    data: store.getMetrics(),
    timestamp: Date.now(),
  });
}
