import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';
import { VoteDirection } from '@/lib/types';

export async function POST(request: Request) {
  const store = getStore();
  const body = await request.json();
  const { pseudonymId, rumorId, direction } = body;

  if (!pseudonymId || !rumorId || ![1, -1].includes(direction)) {
    return NextResponse.json({
      success: false,
      error: 'pseudonymId, rumorId, and direction (1 or -1) required',
      timestamp: Date.now(),
    }, { status: 400 });
  }

  const result = store.castVote(pseudonymId, rumorId, direction as VoteDirection);

  if (result.error) {
    return NextResponse.json({
      success: false,
      error: result.error,
      timestamp: Date.now(),
    }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    data: {
      vote: result.vote,
      updatedCredibilityScore: result.credibilityScore,
      updatedUser: result.updatedUser,
      trustChange: result.trustChange || null,
    },
    timestamp: Date.now(),
  });
}
