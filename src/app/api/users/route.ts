import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';

export async function GET() {
  const store = getStore();
  const users = Array.from(store.users.values()).map((u, i) => ({
    pseudonymId: u.pseudonymId,
    trustScore: u.trustScore,
    totalVotes: u.totalVotes,
    correctVotes: u.correctVotes,
    incorrectVotes: u.incorrectVotes,
    flaggedForCollusion: u.flaggedForCollusion,
    collusionPenaltyMultiplier: u.collusionPenaltyMultiplier,
    createdAt: u.createdAt,
    lastActiveAt: u.lastActiveAt,
    emailHash: u.emailHash,
  }));

  return NextResponse.json({
    success: true,
    data: users,
    timestamp: Date.now(),
  });
}

export async function POST(request: Request) {
  const store = getStore();
  const body = await request.json();
  const { email } = body;

  if (!email || !email.includes('@')) {
    return NextResponse.json({
      success: false,
      error: 'Valid campus email required',
      timestamp: Date.now(),
    }, { status: 400 });
  }

  const result = store.registerUser(email);

  if (result.error) {
    return NextResponse.json({
      success: false,
      error: result.error,
      timestamp: Date.now(),
    }, { status: 409 });
  }

  return NextResponse.json({
    success: true,
    data: {
      pseudonymId: result.user.pseudonymId,
      trustScore: result.user.trustScore,
      message: 'Registration successful. Your pseudonym is your identity — no PII stored.',
    },
    timestamp: Date.now(),
  });
}
