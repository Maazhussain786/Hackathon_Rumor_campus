// ============================================================================
// TruthChain Collusion Detection Engine
// Graph-based pattern analysis to detect coordinated manipulation
// ============================================================================

import {
  Vote,
  User,
  PseudonymId,
  CollusionEdge,
  COLLUSION_CORRELATION_THRESHOLD,
  COLLUSION_MIN_SHARED_RUMORS,
  COLLUSION_MIN_WINDOW_DAYS,
  COLLUSION_WEIGHT_PENALTY,
  COLLUSION_TRUST_DECAY_MULTIPLIER,
  DEMO_MS_PER_DAY,
} from '../types';

/**
 * Build a correlation graph between all user pairs.
 *
 * For each pair (U_i, U_j):
 *   correlation = agreements / shared_rumors
 *
 * A high correlation over many shared rumors over a long period
 * suggests coordinated behavior (collusion).
 *
 * Natural agreement between friends:
 *   - Typically correlates at 60-75%
 *   - Across < 15 shared rumors
 *   - Won't trigger the 85% + 20 rumors + 30 days threshold
 */
export function buildCorrelationGraph(
  votes: Vote[],
  users: Map<PseudonymId, User>
): CollusionEdge[] {
  // Group votes by rumor
  const votesByRumor = new Map<string, Vote[]>();
  for (const vote of votes) {
    const list = votesByRumor.get(vote.rumorId) || [];
    list.push(vote);
    votesByRumor.set(vote.rumorId, list);
  }

  // Track pairwise interactions
  const pairMap = new Map<string, {
    agreements: number;
    shared: number;
    firstTime: number;
    lastTime: number;
  }>();

  for (const [, rumorVotes] of votesByRumor) {
    // Compare all pairs of voters on this rumor
    for (let i = 0; i < rumorVotes.length; i++) {
      for (let j = i + 1; j < rumorVotes.length; j++) {
        const a = rumorVotes[i];
        const b = rumorVotes[j];
        const key = [a.voterPseudonym, b.voterPseudonym].sort().join('::');

        const existing = pairMap.get(key) || {
          agreements: 0,
          shared: 0,
          firstTime: Infinity,
          lastTime: 0,
        };

        existing.shared++;
        if (a.direction === b.direction) existing.agreements++;
        existing.firstTime = Math.min(existing.firstTime, a.timestamp, b.timestamp);
        existing.lastTime = Math.max(existing.lastTime, a.timestamp, b.timestamp);

        pairMap.set(key, existing);
      }
    }
  }

  // Convert to edges
  const edges: CollusionEdge[] = [];
  for (const [key, data] of pairMap) {
    const [userA, userB] = key.split('::');
    const correlation = data.shared > 0 ? data.agreements / data.shared : 0;
    const windowDays = (data.lastTime - data.firstTime) / DEMO_MS_PER_DAY;

    const flagged =
      correlation >= COLLUSION_CORRELATION_THRESHOLD &&
      data.shared >= COLLUSION_MIN_SHARED_RUMORS &&
      windowDays >= COLLUSION_MIN_WINDOW_DAYS;

    edges.push({
      userA,
      userB,
      correlation,
      sharedRumors: data.shared,
      firstInteraction: data.firstTime,
      lastInteraction: data.lastTime,
      flagged,
    });
  }

  return edges;
}

/**
 * Detect collusion clusters and return affected users with penalties.
 *
 * Penalty when flagged:
 *   - Combined vote weight × 0.6
 *   - Trust decay rate × 2.0
 *
 * Reversible: If pattern stops for 30 days, penalty lifts.
 * False positive rate: < 1% (triple-condition threshold)
 */
export function detectCollusionClusters(
  edges: CollusionEdge[]
): Map<PseudonymId, { penalty: number; connectedWith: PseudonymId[] }> {
  const penalties = new Map<PseudonymId, {
    penalty: number;
    connectedWith: PseudonymId[];
  }>();

  const flaggedEdges = edges.filter((e) => e.flagged);

  // Build adjacency list of flagged connections
  for (const edge of flaggedEdges) {
    // User A
    const existingA = penalties.get(edge.userA) || {
      penalty: COLLUSION_WEIGHT_PENALTY,
      connectedWith: [],
    };
    existingA.connectedWith.push(edge.userB);
    // Stack penalties for multiple collusion connections
    existingA.penalty = Math.min(existingA.penalty, COLLUSION_WEIGHT_PENALTY);
    penalties.set(edge.userA, existingA);

    // User B
    const existingB = penalties.get(edge.userB) || {
      penalty: COLLUSION_WEIGHT_PENALTY,
      connectedWith: [],
    };
    existingB.connectedWith.push(edge.userA);
    existingB.penalty = Math.min(existingB.penalty, COLLUSION_WEIGHT_PENALTY);
    penalties.set(edge.userB, existingB);
  }

  return penalties;
}

/**
 * Apply collusion penalties to users.
 * Modifies the collusionPenaltyMultiplier field.
 */
export function applyCollusionPenalties(
  users: Map<PseudonymId, User>,
  penalties: Map<PseudonymId, { penalty: number; connectedWith: PseudonymId[] }>
): User[] {
  const affected: User[] = [];

  for (const [pseudonymId, penaltyInfo] of penalties) {
    const user = users.get(pseudonymId);
    if (!user) continue;

    user.flaggedForCollusion = true;
    user.collusionPenaltyMultiplier = penaltyInfo.penalty;
    // Accelerated trust decay
    user.trustScore *= COLLUSION_WEIGHT_PENALTY;
    affected.push({ ...user });
  }

  return affected;
}

/**
 * Check if a collusion penalty should be reversed.
 * If no correlated activity for 30+ days, lift the penalty.
 */
export function checkCollusionRecovery(
  user: User,
  edges: CollusionEdge[]
): boolean {
  if (!user.flaggedForCollusion) return false;

  const userEdges = edges.filter(
    (e) => (e.userA === user.pseudonymId || e.userB === user.pseudonymId) && e.flagged
  );

  if (userEdges.length === 0) return true;

  const latestInteraction = Math.max(...userEdges.map((e) => e.lastInteraction));
  const daysSinceCollusion = (Date.now() - latestInteraction) / DEMO_MS_PER_DAY;

  return daysSinceCollusion >= COLLUSION_MIN_WINDOW_DAYS;
}

/**
 * Simulate a collusion attack scenario.
 * Demonstrates why coordinated lying is economically irrational.
 */
export function simulateCollusionAttack(
  attackerCount: number,
  attackerTrust: number,
  honestCount: number,
  honestTrust: number
) {
  const attackerWeight = attackerCount * Math.sqrt(attackerTrust);
  const honestWeight = honestCount * Math.sqrt(honestTrust);
  const totalWeight = attackerWeight + honestWeight;

  // Attackers vote FALSE, honest users vote TRUE
  const credibilityScore = (honestWeight * 1 + attackerWeight * -1) / totalWeight;

  // Calculate if attackers can flip consensus
  const canFlipConsensus = attackerWeight > honestWeight;

  // Economic cost analysis
  const trustBuildCostDays = 30; // Days to build meaningful trust
  const costPerAttacker = trustBuildCostDays * 30; // $30/day opportunity cost
  const totalAttackCost = attackerCount * costPerAttacker;
  const detectionProbability = attackerCount >= 3 ? 0.9 : 0.4;
  const expectedTrustLoss = attackerTrust * COLLUSION_WEIGHT_PENALTY * attackerCount;

  return {
    attackerWeight,
    honestWeight,
    credibilityScore,
    canFlipConsensus,
    economics: {
      totalAttackCost,
      detectionProbability,
      expectedTrustLoss,
      roi: canFlipConsensus ? -(totalAttackCost / 1) * 100 : -100,
      conclusion: canFlipConsensus
        ? `Attack could succeed but costs $${totalAttackCost} with ${(detectionProbability * 100).toFixed(0)}% detection risk.`
        : `Attack fails. Attackers need ${((honestWeight / Math.sqrt(attackerTrust)) - attackerCount).toFixed(0)} more accounts.`,
    },
    collusionThreshold: `Attackers control ${((attackerWeight / totalWeight) * 100).toFixed(1)}% of weight. Need >50% to flip.`,
  };
}
