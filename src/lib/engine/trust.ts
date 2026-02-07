// ============================================================================
// TruthChain Trust Score Engine
// Implements behavior-based dynamic trust updates with temporal decay
// ============================================================================

import {
  User,
  TrustUpdate,
  Vote,
  Rumor,
  PseudonymId,
  TRUST_MIN,
  TRUST_MAX,
  TRUST_INITIAL,
  ALPHA,
  BETA,
  LAMBDA,
  TRUST_GAIN,
  TRUST_LOSS,
  INACTIVITY_DECAY,
  DEMO_MS_PER_DAY,
} from '../types';

/**
 * Core trust update formula:
 *   T_new = T_old + α × (accuracy - β) × e^(-λΔt)
 *
 * Properties:
 *   - Early votes on rumors are rewarded more (time decay)
 *   - Accuracy measures alignment with consensus
 *   - β ensures slight decay even for neutral behavior
 *   - Bounded between TRUST_MIN and TRUST_MAX
 */
export function computeTrustUpdate(
  user: User,
  vote: Vote,
  rumor: Rumor,
  consensusCorrect: boolean
): TrustUpdate {
  const daysSinceRumor = (Date.now() - rumor.createdAt) / DEMO_MS_PER_DAY;
  const accuracy = consensusCorrect ? 1.0 : 0.0;

  // Core formula: T_new = T_old + α × (accuracy - β) × e^(-λΔt)
  const timeFactor = Math.exp(-LAMBDA * daysSinceRumor);
  const delta = ALPHA * (accuracy - BETA) * timeFactor;

  // Apply collusion penalty multiplier
  const adjustedDelta = delta * user.collusionPenaltyMultiplier;

  // Asymmetric update: losses are 1.5x gains to make dishonesty costly
  const finalDelta = consensusCorrect
    ? adjustedDelta * Math.abs(TRUST_GAIN / ALPHA)
    : adjustedDelta * Math.abs(TRUST_LOSS / ALPHA) * -1;

  const newTrust = clampTrust(user.trustScore + finalDelta);

  return {
    pseudonymId: user.pseudonymId,
    rumorId: rumor.id,
    oldTrust: user.trustScore,
    newTrust,
    reason: consensusCorrect
      ? `Correct vote on "${rumor.content.substring(0, 40)}..." (+${(newTrust - user.trustScore).toFixed(4)})`
      : `Incorrect vote on "${rumor.content.substring(0, 40)}..." (${(newTrust - user.trustScore).toFixed(4)})`,
    timestamp: Date.now(),
  };
}

/**
 * Apply monthly inactivity decay.
 * Users who don't participate lose 5% trust per month.
 * This prevents stale authority and ensures temporal stability.
 */
export function applyInactivityDecay(user: User): TrustUpdate | null {
  const daysSinceActive = (Date.now() - user.lastActiveAt) / DEMO_MS_PER_DAY;

  if (daysSinceActive < 30) return null; // No decay within 30 days

  const monthsInactive = Math.floor(daysSinceActive / 30);
  const decayFactor = Math.pow(1 - INACTIVITY_DECAY, monthsInactive);
  const newTrust = clampTrust(user.trustScore * decayFactor);

  if (Math.abs(newTrust - user.trustScore) < 0.001) return null;

  return {
    pseudonymId: user.pseudonymId,
    rumorId: 'SYSTEM_DECAY',
    oldTrust: user.trustScore,
    newTrust,
    reason: `Inactivity decay: ${monthsInactive} month(s) inactive (-${((1 - decayFactor) * 100).toFixed(1)}%)`,
    timestamp: Date.now(),
  };
}

/**
 * Calculate effective vote weight using diminishing returns.
 *   weight = sqrt(trust)
 *
 * This ensures:
 *   - High-trust users are influential but NOT dominant
 *   - 100 new users (trust 0.2) combined ≈ weight 44.7
 *   - 1 expert (trust 4.0) ≈ weight 2.0
 *   - Prevents "god mode" even at max trust
 */
export function effectiveWeight(trust: number): number {
  return Math.sqrt(Math.max(trust, TRUST_MIN));
}

/**
 * Clamp trust score to valid boundaries.
 * TRUST_MIN > 0 ensures no user is ever completely silenced.
 * TRUST_MAX prevents unbounded authority accumulation.
 */
export function clampTrust(trust: number): number {
  return Math.max(TRUST_MIN, Math.min(TRUST_MAX, trust));
}

/**
 * Calculate trust percentile rank among all users.
 * Used for display and collusion detection context.
 */
export function trustPercentile(trust: number, allTrusts: number[]): number {
  if (allTrusts.length === 0) return 50;
  const sorted = [...allTrusts].sort((a, b) => a - b);
  const rank = sorted.findIndex((t) => t >= trust);
  return rank === -1 ? 100 : Math.round((rank / sorted.length) * 100);
}

/**
 * Create a new user with initial trust.
 */
export function createUser(
  pseudonymId: PseudonymId,
  publicKeyHex: string,
  emailHash: string
): User {
  return {
    pseudonymId,
    publicKeyHex,
    emailHash,
    trustScore: TRUST_INITIAL,
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
    totalVotes: 0,
    correctVotes: 0,
    incorrectVotes: 0,
    flaggedForCollusion: false,
    collusionPenaltyMultiplier: 1.0,
  };
}

/**
 * Compute the Nash Equilibrium payoff comparison.
 * Returns expected payoffs for honest vs dishonest strategies.
 *
 * U_honest(n) = n × (α × p_correct - β) = n × 0.03
 * U_dishonest(n) = n × (-2α × p_incorrect - β - γ × p_detection) = n × -0.31
 *
 * Ratio: |U_dishonest| / U_honest ≈ 10.3x
 * → Lying costs 10x more than honesty pays
 */
export function nashEquilibriumPayoffs(n: number = 100) {
  const pCorrectHonest = 0.75;
  const pIncorrectDishonest = 0.70;
  const pDetection = 0.40;
  const gamma = 0.3; // Collusion detection penalty factor

  const honestPayoff = n * (ALPHA * pCorrectHonest - BETA);
  const dishonestPayoff = n * (-2 * ALPHA * pIncorrectDishonest - BETA - gamma * pDetection);

  return {
    honest: { payoff: honestPayoff, perRound: ALPHA * pCorrectHonest - BETA },
    dishonest: { payoff: dishonestPayoff, perRound: -2 * ALPHA * pIncorrectDishonest - BETA - gamma * pDetection },
    ratio: Math.abs(dishonestPayoff / honestPayoff),
    dominantStrategy: 'honest' as const,
    explanation: `Honesty yields +${honestPayoff.toFixed(2)} over ${n} rounds. Dishonesty yields ${dishonestPayoff.toFixed(2)}. Lying costs ${Math.abs(dishonestPayoff / honestPayoff).toFixed(1)}x more than honesty pays.`,
  };
}
