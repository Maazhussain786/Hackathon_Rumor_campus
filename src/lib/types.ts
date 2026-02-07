// ============================================================================
// TruthChain Core Types
// All domain types for the decentralized rumor verification system
// ============================================================================

/** Cryptographic pseudonym derived from ECDSA public key */
export type PseudonymId = string;

/** Unique rumor identifier */
export type RumorId = string;

/** Vote direction */
export type VoteDirection = 1 | -1; // +1 = true, -1 = false

/** Rumor lifecycle status */
export type RumorStatus =
  | 'pending'      // Newly submitted, accepting votes
  | 'stabilized'   // Met stabilization criteria, resolved
  | 'expired'      // Time window closed without stabilization
  | 'deleted';     // Soft-deleted by author

/**
 * Demo time scale: 1 minute = 1 day.
 * In production this would be 86_400_000 (real 24h).
 * For hackathon demo, 60_000ms (1 min) = 1 simulated day.
 * This means the 7-day stabilization window completes in 7 real minutes.
 */
export const DEMO_MS_PER_DAY = 60_000; // 1 minute = 1 day

/** Trust score boundaries */
export const TRUST_MIN = 0.1;
export const TRUST_MAX = 10.0;
export const TRUST_INITIAL = 0.2;
export const TRUST_VOTE_THRESHOLD = 0.15; // Minimum trust to vote

/** Stabilization gates */
export const STABILIZATION_MIN_VOTES = 10;
export const STABILIZATION_MIN_TRUST_WEIGHT = 2.0;
export const STABILIZATION_WINDOW_DAYS = 7;

/** Trust update parameters */
export const ALPHA = 0.1;       // Learning rate
export const BETA = 0.05;       // Decay baseline
export const LAMBDA = 0.01;     // Time decay constant
export const TRUST_GAIN = 0.1;  // Reward for correct vote
export const TRUST_LOSS = -0.15; // Penalty for incorrect vote
export const INACTIVITY_DECAY = 0.05; // 5% monthly decay

/** Collusion detection thresholds */
export const COLLUSION_CORRELATION_THRESHOLD = 0.85;
export const COLLUSION_MIN_SHARED_RUMORS = 20;
export const COLLUSION_MIN_WINDOW_DAYS = 30;
export const COLLUSION_WEIGHT_PENALTY = 0.6;
export const COLLUSION_TRUST_DECAY_MULTIPLIER = 2.0;

/** Consensus classification thresholds */
export const CONSENSUS_TRUE_THRESHOLD = 0.5;
export const CONSENSUS_FALSE_THRESHOLD = -0.5;

// ============================================================================
// Domain Entities
// ============================================================================

export interface User {
  pseudonymId: PseudonymId;
  publicKeyHex: string;
  emailHash: string;          // SHA256(email + salt) — never stored raw
  trustScore: number;
  createdAt: number;          // Unix timestamp
  lastActiveAt: number;
  totalVotes: number;
  correctVotes: number;
  incorrectVotes: number;
  flaggedForCollusion: boolean;
  collusionPenaltyMultiplier: number; // 1.0 = no penalty, <1.0 = penalized
}

export interface Rumor {
  id: RumorId;
  authorPseudonym: PseudonymId;
  content: string;
  category: string;
  createdAt: number;
  deadline: number;           // createdAt + STABILIZATION_WINDOW_DAYS
  status: RumorStatus;
  credibilityScore: number;   // CS ∈ [-1, 1]
  totalVotes: number;
  totalTrustWeight: number;
  resolution: 'true' | 'false' | 'uncertain' | null;
  signature: string;          // Author's cryptographic signature
  tags: string[];
  linkedRumorIds: RumorId[];  // Related rumors
}

export interface Vote {
  rumorId: RumorId;
  voterPseudonym: PseudonymId;
  direction: VoteDirection;
  timestamp: number;
  signature: string;
  voterTrustAtTime: number;   // Snapshot of trust when vote was cast
  effectiveWeight: number;    // sqrt(trust) at time of vote
}

export interface TrustUpdate {
  pseudonymId: PseudonymId;
  rumorId: RumorId;
  oldTrust: number;
  newTrust: number;
  reason: string;
  timestamp: number;
}

export interface CollusionEdge {
  userA: PseudonymId;
  userB: PseudonymId;
  correlation: number;
  sharedRumors: number;
  firstInteraction: number;
  lastInteraction: number;
  flagged: boolean;
}

export interface SystemMetrics {
  totalUsers: number;
  totalRumors: number;
  totalVotes: number;
  averageTrust: number;
  collusionFlagsActive: number;
  rumorsResolvedTrue: number;
  rumorsResolvedFalse: number;
  rumorsUncertain: number;
  attacksBlocked: number;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface RegisterRequest {
  publicKeyHex: string;
  emailHash: string;
  signature: string; // Sign the emailHash with private key
}

export interface SubmitRumorRequest {
  content: string;
  category: string;
  tags: string[];
  pseudonymId: PseudonymId;
  signature: string;
}

export interface CastVoteRequest {
  rumorId: RumorId;
  direction: VoteDirection;
  pseudonymId: PseudonymId;
  signature: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

// ============================================================================
// Consensus Result
// ============================================================================

export interface ConsensusResult {
  rumorId: RumorId;
  credibilityScore: number;
  resolution: 'true' | 'false' | 'uncertain';
  totalVotes: number;
  totalTrustWeight: number;
  trustUpdates: TrustUpdate[];
  stabilized: boolean;
}
