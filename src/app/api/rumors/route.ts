import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';

export async function GET() {
  const store = getStore();
  const rumors = Array.from(store.rumors.values()).map(r => {
    const votes = store.votes.get(r.id) || [];
    return {
      ...r,
      voteBreakdown: {
        trueVotes: votes.filter(v => v.direction === 1).length,
        falseVotes: votes.filter(v => v.direction === -1).length,
        totalTrustWeight: r.totalTrustWeight.toFixed(2),
      },
      voters: votes.map(v => v.voterPseudonym),
    };
  });

  // Sort by recency
  rumors.sort((a, b) => b.createdAt - a.createdAt);

  return NextResponse.json({
    success: true,
    data: rumors,
    timestamp: Date.now(),
  });
}

export async function POST(request: Request) {
  const store = getStore();
  const body = await request.json();
  const { pseudonymId, content, category, tags } = body;

  if (!pseudonymId || !content) {
    return NextResponse.json({
      success: false,
      error: 'pseudonymId and content are required',
      timestamp: Date.now(),
    }, { status: 400 });
  }

  const result = store.submitRumor(
    pseudonymId,
    content,
    category || 'General',
    tags || []
  );

  if (result.error) {
    return NextResponse.json({
      success: false,
      error: result.error,
      timestamp: Date.now(),
    }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    data: result.rumor,
    timestamp: Date.now(),
  });
}
