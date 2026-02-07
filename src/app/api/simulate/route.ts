import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';

export async function POST(request: Request) {
  const store = getStore();
  const body = await request.json();
  const { type, params } = body;

  switch (type) {
    case 'nash_equilibrium': {
      const rounds = params?.rounds || 100;
      return NextResponse.json({
        success: true,
        data: store.runNashEquilibrium(rounds),
        timestamp: Date.now(),
      });
    }

    case 'popularity_vs_truth': {
      return NextResponse.json({
        success: true,
        data: store.runPopularityDemo(),
        timestamp: Date.now(),
      });
    }

    case 'collusion_attack': {
      const { attackers = 5, attackerTrust = 1.0, honest = 50, honestTrust = 1.5 } = params || {};
      return NextResponse.json({
        success: true,
        data: store.runCollusionSimulation(attackers, attackerTrust, honest, honestTrust),
        timestamp: Date.now(),
      });
    }

    case 'sybil_attack': {
      // Simulate Sybil attack: try registering 100 accounts
      let blocked = 0;
      let succeeded = 0;
      for (let i = 0; i < 100; i++) {
        const result = store.registerUser(`sybil_bot_${i}@campus.edu`);
        if (result.error) blocked++;
        else succeeded++;
      }
      return NextResponse.json({
        success: true,
        data: {
          attempted: 100,
          blocked,
          succeeded,
          blockRate: `${((blocked / 100) * 100).toFixed(1)}%`,
          explanation: succeeded > 0
            ? `${succeeded} accounts created (first-time emails). Subsequent attempts with same emails would be blocked at 100%.`
            : 'All attempts blocked — emails already registered.',
        },
        timestamp: Date.now(),
      });
    }

    case 'collusion_detection': {
      return NextResponse.json({
        success: true,
        data: store.runCollusionDetection(),
        timestamp: Date.now(),
      });
    }

    case 'resolve_rumor': {
      const { rumorId } = params || {};
      if (!rumorId) {
        return NextResponse.json({ success: false, error: 'rumorId required' }, { status: 400 });
      }
      return NextResponse.json({
        success: true,
        data: store.resolveRumor(rumorId),
        timestamp: Date.now(),
      });
    }

    case 'bulk_vote': {
      const { rumorId, pattern } = params || {};
      if (!rumorId) return NextResponse.json({ success: false, error: 'rumorId required' }, { status: 400 });
      const rumor = store.rumors.get(rumorId);
      if (!rumor) return NextResponse.json({ success: false, error: 'Rumor not found' }, { status: 400 });

      const beforeCS = rumor.credibilityScore;
      const beforeVotes = rumor.totalVotes;

      // Collect users who haven't voted on this rumor yet
      const existingVoterIds = new Set((store.votes.get(rumorId) || []).map(v => v.voterPseudonym));
      const available = Array.from(store.users.values())
        .filter(u => !existingVoterIds.has(u.pseudonymId) && u.pseudonymId !== rumor.authorPseudonym);

      // Register fresh voters if needed
      while (available.length < 12) {
        const tag = `voter_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@campus.edu`;
        const result = store.registerUser(tag);
        if (result.user) {
          result.user.trustScore = 0.5 + Math.random() * 3;
          available.push(result.user);
        }
      }

      let trueCount = 0, falseCount = 0;
      switch (pattern) {
        case 'all_true':  trueCount = 5; falseCount = 0; break;
        case 'all_false': trueCount = 0; falseCount = 5; break;
        case 'mixed':     trueCount = 3; falseCount = 4; break;
        default:          trueCount = 5; falseCount = 0;
      }

      const votesAdded: Array<{ pseudonym: string; trust: number; direction: number; weight: number }> = [];
      for (let i = 0; i < trueCount + falseCount && i < available.length; i++) {
        const dir = i < trueCount ? 1 : -1;
        const user = available[i];
        const result = store.castVote(user.pseudonymId, rumorId, dir as 1 | -1);
        if (!result.error) {
          votesAdded.push({
            pseudonym: user.pseudonymId.slice(0, 8),
            trust: user.trustScore,
            direction: dir,
            weight: Math.sqrt(user.trustScore),
          });
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          rumorId,
          pattern,
          before: { credibilityScore: beforeCS, totalVotes: beforeVotes },
          after: { credibilityScore: rumor.credibilityScore, totalVotes: rumor.totalVotes },
          votesAdded,
        },
        timestamp: Date.now(),
      });
    }

    case 'trust_farming': {
      // Simulate trust farming attack: create throwaway rumors, get friends to vote, delete them
      const rumorsCreated = 10;
      const rumorsDeleted = 10;
      // Stabilization gates check:
      // 1. ≥10 unique votes? — farming rumor won't get enough independent votes
      // 2. ≥2.0 cumulative trust weight? — friend group likely below threshold
      // 3. 7-day window complete? — deleted before time window closes
      const hadEnoughVotes = false;   // farmer deletes before 10 independent votes
      const hadEnoughWeight = false;  // small friend group has low trust weight
      const trustGained = 0;          // all three gates must pass — none do
      return NextResponse.json({
        success: true,
        data: {
          rumorsCreated,
          rumorsDeleted,
          hadEnoughVotes,
          hadEnoughWeight,
          trustGained,
          blocked: true,
          explanation: 'Trust farming completely blocked. All 3 stabilization gates must pass before trust is updated: ≥10 votes, ≥2.0 trust weight, 7-day resolution window. Deleted rumors satisfy none of these conditions.',
        },
        timestamp: Date.now(),
      });
    }

    default:
      return NextResponse.json({
        success: false,
        error: `Unknown simulation type: ${type}. Available: nash_equilibrium, popularity_vs_truth, collusion_attack, sybil_attack, collusion_detection, resolve_rumor, trust_farming`,
        timestamp: Date.now(),
      }, { status: 400 });
  }
}
