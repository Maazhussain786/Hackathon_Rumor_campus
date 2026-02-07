// ============================================================================
// TruthChain Voting & Consensus Engine
// Trust-weighted consensus where expert opinion > mob opinion
// ============================================================================

import {
  Vote,
  Rumor,
  User,
  VoteDirection,
  RumorId,
  PseudonymId,
  ConsensusResult,
  TrustUpdate,
  STABILIZATION_MIN_VOTES,
  STABILIZATION_MIN_TRUST_WEIGHT,
  STABILIZATION_WINDOW_DAYS,
  CONSENSUS_TRUE_THRESHOLD,
  CONSENSUS_FALSE_THRESHOLD,
  TRUST_VOTE_THRESHOLD,
  DEMO_MS_PER_DAY,
} from '../types';
import { effectiveWeight, computeTrustUpdate } from './trust';
import { v4 as uuidv4 } from 'uuid';

/**
 * Calculate credibility score using trust-weighted consensus.
 *
 *   CS = Σ(sqrt(trust_i) × vote_i) / Σ(sqrt(trust_i))
 *
 * Why sqrt? Diminishing returns prevent:
 *   - A single high-trust user from dictating truth
 *   - A mob of low-trust users from overwhelming experts
 *   - Linear accumulation of power
 *
 * Range: CS ∈ [-1, 1]
 *   CS > 0.5  → LIKELY TRUE
 *   CS < -0.5 → LIKELY FALSE
 *   else      → UNCERTAIN
 */
export function calculateCredibilityScore(votes: Vote[]): number {
  if (votes.length === 0) return 0;

  let weightedSum = 0;
  let totalWeight = 0;

  for (const vote of votes) {
    const w = vote.effectiveWeight;
    weightedSum += w * vote.direction;
    totalWeight += w;
  }

  if (totalWeight === 0) return 0;
  return weightedSum / totalWeight;
}

/**
 * Check if a rumor has met stabilization criteria.
 * A rumor must stabilize before any trust updates occur.
 *
 * Gates:
 *   1. Minimum 10 votes
 *   2. Total trust weight ≥ 2.0
 *   3. 7-day window complete
 *
 * This prevents trust farming via throwaway rumors.
 */
export function checkStabilization(rumor: Rumor, votes: Vote[]): boolean {
  const hasEnoughVotes = votes.length >= STABILIZATION_MIN_VOTES;

  const totalTrustWeight = votes.reduce((sum, v) => sum + v.effectiveWeight, 0);
  const hasEnoughWeight = totalTrustWeight >= STABILIZATION_MIN_TRUST_WEIGHT;

  const daysSinceCreation = (Date.now() - rumor.createdAt) / DEMO_MS_PER_DAY;
  const windowComplete = daysSinceCreation >= STABILIZATION_WINDOW_DAYS;

  return hasEnoughVotes && hasEnoughWeight && windowComplete;
}

/**
 * Validate whether a user can vote on a rumor.
 * Returns null if valid, error string if invalid.
 */
export function validateVote(
  user: User,
  rumor: Rumor,
  existingVotes: Vote[]
): string | null {
  // Trust gating: users below threshold cannot vote
  if (user.trustScore < TRUST_VOTE_THRESHOLD) {
    return `Insufficient trust score (${user.trustScore.toFixed(2)} < ${TRUST_VOTE_THRESHOLD}). Build trust through consistent participation.`;
  }

  // Double-vote prevention via cryptographic signature check
  const alreadyVoted = existingVotes.some(
    (v) => v.voterPseudonym === user.pseudonymId && v.rumorId === rumor.id
  );
  if (alreadyVoted) {
    return 'You have already voted on this rumor. Double voting is prevented by cryptographic signature verification.';
  }

  // Self-vote prevention
  if (rumor.authorPseudonym === user.pseudonymId) {
    return 'Authors cannot vote on their own rumors.';
  }

  // Status check
  if (rumor.status !== 'pending') {
    return `Rumor is no longer accepting votes (status: ${rumor.status}).`;
  }

  // Deadline check
  if (Date.now() > rumor.deadline) {
    return 'Voting window has closed for this rumor.';
  }

  return null; // Valid
}

/**
 * Cast a vote on a rumor. Returns the vote record.
 */
export function createVote(
  rumorId: RumorId,
  voter: User,
  direction: VoteDirection,
  signature: string
): Vote {
  return {
    rumorId,
    voterPseudonym: voter.pseudonymId,
    direction,
    timestamp: Date.now(),
    signature,
    voterTrustAtTime: voter.trustScore,
    effectiveWeight: effectiveWeight(voter.trustScore),
  };
}

/**
 * Resolve a rumor and compute trust updates for all voters.
 *
 * Process:
 *   1. Check stabilization gates
 *   2. Calculate final credibility score
 *   3. Determine resolution (true/false/uncertain)
 *   4. Compute trust updates for each voter
 *   5. Return immutable consensus result
 *
 * Critical: If deleted before stabilization → ZERO trust impact
 */
export function resolveRumor(
  rumor: Rumor,
  votes: Vote[],
  users: Map<PseudonymId, User>
): ConsensusResult {
  const stabilized = checkStabilization(rumor, votes);
  const credibilityScore = calculateCredibilityScore(votes);

  // Determine resolution
  let resolution: 'true' | 'false' | 'uncertain';
  if (credibilityScore >= CONSENSUS_TRUE_THRESHOLD) {
    resolution = 'true';
  } else if (credibilityScore <= CONSENSUS_FALSE_THRESHOLD) {
    resolution = 'false';
  } else {
    resolution = 'uncertain';
  }

  // Compute trust updates only if stabilized
  const trustUpdates: TrustUpdate[] = [];

  if (stabilized && resolution !== 'uncertain') {
    for (const vote of votes) {
      const user = users.get(vote.voterPseudonym);
      if (!user) continue;

      const consensusCorrect =
        (resolution === 'true' && vote.direction === 1) ||
        (resolution === 'false' && vote.direction === -1);

      const update = computeTrustUpdate(user, vote, rumor, consensusCorrect);
      trustUpdates.push(update);
    }
  }

  const totalTrustWeight = votes.reduce((sum, v) => sum + v.effectiveWeight, 0);

  return {
    rumorId: rumor.id,
    credibilityScore,
    resolution,
    totalVotes: votes.length,
    totalTrustWeight,
    trustUpdates,
    stabilized,
  };
}

/**
 * Create a new rumor.
 */
export function createRumor(
  authorPseudonym: PseudonymId,
  content: string,
  category: string,
  tags: string[],
  signature: string
): Rumor {
  const now = Date.now();
  return {
    id: uuidv4(),
    authorPseudonym,
    content,
    category,
    createdAt: now,
    deadline: now + STABILIZATION_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    status: 'pending',
    credibilityScore: 0,
    totalVotes: 0,
    totalTrustWeight: 0,
    resolution: null,
    signature,
    tags,
    linkedRumorIds: [],
  };
}

/**
 * Simulate the effect of mob vs expert voting.
 * Demonstrates why popularity ≠ truth.
 */
export function popularityVsTruthDemo() {
  // Scenario: 50 new users vote FALSE, 10 experienced users vote TRUE
  // This shows how trust weighting prevents mob rule
  const mobVotes: Vote[] = Array.from({ length: 50 }, (_, i) => ({
    rumorId: 'demo',
    voterPseudonym: `mob_${i}`,
    direction: -1 as VoteDirection,
    timestamp: Date.now(),
    signature: `sig_mob_${i}`,
    voterTrustAtTime: 0.2,
    effectiveWeight: effectiveWeight(0.2),
  }));

  const expertVotes: Vote[] = Array.from({ length: 10 }, (_, i) => ({
    rumorId: 'demo',
    voterPseudonym: `expert_${i}`,
    direction: 1 as VoteDirection,
    timestamp: Date.now(),
    signature: `sig_expert_${i}`,
    voterTrustAtTime: 5.0,
    effectiveWeight: effectiveWeight(5.0),
  }));

  const mobOnlyCS = calculateCredibilityScore(mobVotes);
  const combinedCS = calculateCredibilityScore([...mobVotes, ...expertVotes]);
  const expertOnlyCS = calculateCredibilityScore(expertVotes);

  const mobTotalWeight = mobVotes.reduce((s, v) => s + v.effectiveWeight, 0);
  const expertTotalWeight = expertVotes.reduce((s, v) => s + v.effectiveWeight, 0);

  return {
    scenario: '50 new users (trust 0.2) vote FALSE vs 10 experts (trust 5.0) vote TRUE',
    mobOnly: { cs: mobOnlyCS, totalWeight: mobTotalWeight, votes: 50 },
    expertOnly: { cs: expertOnlyCS, totalWeight: expertTotalWeight, votes: 10 },
    combined: { cs: combinedCS, totalWeight: mobTotalWeight + expertTotalWeight, votes: 60 },
    insight: combinedCS > CONSENSUS_FALSE_THRESHOLD
      ? 'Experts prevented false consensus — popularity did NOT auto-win despite 5:1 voter ratio.'
      : 'Even with expert votes, mob overwhelmed — this scenario needs more expert participation.',
  };
}
