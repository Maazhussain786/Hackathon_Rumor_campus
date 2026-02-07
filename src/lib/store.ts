// ============================================================================
// TruthChain In-Memory Data Store
// Singleton store for hackathon demo — in production, backed by blockchain + DB
// ============================================================================

import {
  User,
  Rumor,
  Vote,
  TrustUpdate,
  CollusionEdge,
  SystemMetrics,
  PseudonymId,
  RumorId,
} from './types';
import {
  createUser,
  createRumor,
  createVote,
  calculateCredibilityScore,
  resolveRumor,
  validateVote,
  buildCorrelationGraph,
  detectCollusionClusters,
  applyCollusionPenalties,
  generateDemoKeyPair,
  generateSeededKeyPair,
  hashEmail,
  createDemoSignature,
  effectiveWeight,
  nashEquilibriumPayoffs,
  popularityVsTruthDemo,
  simulateCollusionAttack,
} from './engine';
import { VoteDirection, DEMO_MS_PER_DAY } from './types';

class TruthChainStore {
  users: Map<PseudonymId, User> = new Map();
  rumors: Map<RumorId, Rumor> = new Map();
  votes: Map<RumorId, Vote[]> = new Map();
  trustHistory: TrustUpdate[] = [];
  collusionEdges: CollusionEdge[] = [];
  emailHashes: Set<string> = new Set(); // Sybil prevention registry
  attacksBlocked: number = 0;

  constructor() {
    this.seed();
  }

  /** Seed with realistic demo data */
  private seed() {
    // Create diverse user pool
    const userProfiles = [
      { email: 'alice@campus.edu', trust: 3.2, name: 'Veteran Reporter' },
      { email: 'bob@campus.edu', trust: 1.8, name: 'Active Contributor' },
      { email: 'carol@campus.edu', trust: 0.9, name: 'Regular User' },
      { email: 'dave@campus.edu', trust: 0.5, name: 'New User' },
      { email: 'eve@campus.edu', trust: 0.3, name: 'Skeptic' },
      { email: 'frank@campus.edu', trust: 4.5, name: 'Trusted Expert' },
      { email: 'grace@campus.edu', trust: 2.1, name: 'Consistent Voter' },
      { email: 'hank@campus.edu', trust: 0.2, name: 'Newcomer' },
      { email: 'ivy@campus.edu', trust: 1.2, name: 'Moderate User' },
      { email: 'jake@campus.edu', trust: 0.15, name: 'Flagged Sybil Suspect' },
    ];

    for (const profile of userProfiles) {
      const { publicKeyHex, pseudonym } = generateSeededKeyPair(profile.email);
      const eHash = hashEmail(profile.email);
      const user = createUser(pseudonym, publicKeyHex, eHash);
      user.trustScore = profile.trust;
      user.totalVotes = Math.floor(profile.trust * 15);
      user.correctVotes = Math.floor(user.totalVotes * 0.7);
      user.incorrectVotes = user.totalVotes - user.correctVotes;
      if (profile.email === 'jake@campus.edu') {
        user.flaggedForCollusion = true;
        user.collusionPenaltyMultiplier = 0.6;
      }
      this.users.set(pseudonym, user);
      this.emailHashes.add(eHash);
    }

    // Create demo rumors
    const rumorData = [
      {
        content: 'Library extending hours to 2 AM during finals week',
        category: 'Campus Services',
        tags: ['library', 'finals', 'hours'],
        votePattern: [1, 1, 1, 1, 1, 1, -1, 1, 1, 1] as VoteDirection[],
      },
      {
        content: 'New dining hall opening in the science building next semester',
        category: 'Campus Development',
        tags: ['dining', 'food', 'construction'],
        votePattern: [1, 1, -1, -1, 1, 1, -1, 1, 1, -1] as VoteDirection[],
      },
      {
        content: 'Professor Smith cancelling all Monday lectures for the rest of the semester',
        category: 'Academics',
        tags: ['lectures', 'professor', 'schedule'],
        votePattern: [-1, -1, 1, -1, -1, -1, -1, 1, -1, -1] as VoteDirection[],
      },
      {
        content: 'Campus WiFi upgrade to 10Gbps happening this weekend',
        category: 'Technology',
        tags: ['wifi', 'internet', 'IT'],
        votePattern: [1, 1, 1, -1, 1, 1, 1, -1, 1, 1] as VoteDirection[],
      },
      {
        content: 'Free concert by major artist at the amphitheater on Friday',
        category: 'Events',
        tags: ['concert', 'music', 'free'],
        votePattern: [-1, -1, -1, 1, -1, 1, -1, -1, -1, 1] as VoteDirection[],
      },
      {
        content: 'Parking garage on East side closing permanently due to structural issues',
        category: 'Infrastructure',
        tags: ['parking', 'safety', 'closure'],
        votePattern: [1, -1, 1, 1, -1, 1, 1, 1] as VoteDirection[],
      },
    ];

    const userList = Array.from(this.users.values());

    // Assign authors from users 5-9 so users 0-4 are always free for manual voting
    const authorPool = userList.slice(5);

    for (let ri = 0; ri < rumorData.length; ri++) {
      const data = rumorData[ri];
      const author = authorPool[ri % authorPool.length];
      const sig = createDemoSignature(data.content, author.pseudonymId);
      const rumor = createRumor(author.pseudonymId, data.content, data.category, data.tags, sig);

      // Backdate rumors: some 8+ "days" old (ready to resolve), some 2-5 "days" (still maturing)
      // Since 1 min = 1 day, 8 days = 8 minutes of real time
      const backdateMinutes = ri < 3 ? 8 + Math.random() * 2 : 2 + Math.random() * 3; // first 3 rumors are resolvable
      rumor.createdAt = Date.now() - backdateMinutes * DEMO_MS_PER_DAY;
      rumor.deadline = rumor.createdAt + 30 * DEMO_MS_PER_DAY;

      this.rumors.set(rumor.id, rumor);

      // Cast votes from ONLY users 4-9 (indices 4+) so the first 4 users
      // (alice, bob, carol, dave) are always available for manual voting
      const rumorVotes: Vote[] = [];
      const seedVoters = userList.slice(4); // skip first 4 users
      for (let i = 0; i < data.votePattern.length && i < seedVoters.length; i++) {
        const voter = seedVoters[i];
        if (voter.pseudonymId === author.pseudonymId) continue;

        const dir = data.votePattern[i] || (1 as VoteDirection);
        const vote = createVote(
          rumor.id,
          voter,
          dir,
          createDemoSignature(rumor.id, voter.pseudonymId)
        );
        vote.timestamp = rumor.createdAt + Math.random() * 3 * DEMO_MS_PER_DAY;
        rumorVotes.push(vote);
      }

      this.votes.set(rumor.id, rumorVotes);

      // Update rumor metrics
      rumor.totalVotes = rumorVotes.length;
      rumor.totalTrustWeight = rumorVotes.reduce((s, v) => s + v.effectiveWeight, 0);
      rumor.credibilityScore = calculateCredibilityScore(rumorVotes);
    }
  }

  // ========== User Operations ==========

  registerUser(email: string): { user: User; error?: string } {
    const eHash = hashEmail(email);

    if (this.emailHashes.has(eHash)) {
      this.attacksBlocked++;
      return { user: null as any, error: 'Email already registered. One account per campus email. (Sybil attack blocked)' };
    }

    const { publicKeyHex, pseudonym } = generateDemoKeyPair();
    const user = createUser(pseudonym, publicKeyHex, eHash);
    this.users.set(pseudonym, user);
    this.emailHashes.add(eHash);

    return { user };
  }

  // ========== Rumor Operations ==========

  submitRumor(pseudonymId: PseudonymId, content: string, category: string, tags: string[]): { rumor?: Rumor; error?: string } {
    const user = this.users.get(pseudonymId);
    if (!user) return { error: 'User not found' };
    if (user.trustScore < 0.15) return { error: 'Insufficient trust to submit rumors' };

    const sig = createDemoSignature(content, pseudonymId);
    const rumor = createRumor(pseudonymId, content, category, tags, sig);
    this.rumors.set(rumor.id, rumor);
    this.votes.set(rumor.id, []);

    user.lastActiveAt = Date.now();
    return { rumor };
  }

  // ========== Vote Operations ==========

  castVote(pseudonymId: PseudonymId, rumorId: RumorId, direction: VoteDirection): { vote?: Vote; error?: string; credibilityScore?: number; updatedUser?: { trustScore: number; totalVotes: number }; trustChange?: { old: number; new_: number; reason: string } } {
    const user = this.users.get(pseudonymId);
    if (!user) return { error: 'User not found' };

    const rumor = this.rumors.get(rumorId);
    if (!rumor) return { error: 'Rumor not found' };

    const existingVotes = this.votes.get(rumorId) || [];
    const validationError = validateVote(user, rumor, existingVotes);
    if (validationError) {
      this.attacksBlocked++;
      return { error: validationError };
    }

    const sig = createDemoSignature(rumorId + direction, pseudonymId);
    const vote = createVote(rumorId, user, direction, sig);
    existingVotes.push(vote);
    this.votes.set(rumorId, existingVotes);

    // Update rumor metrics
    rumor.totalVotes = existingVotes.length;
    rumor.totalTrustWeight = existingVotes.reduce((s, v) => s + v.effectiveWeight, 0);
    rumor.credibilityScore = calculateCredibilityScore(existingVotes);

    user.lastActiveAt = Date.now();
    user.totalVotes++;

    // ── Immediate trust feedback ──
    // Give a small trust nudge based on alignment with current consensus.
    // This is a "live preview" — the full trust update happens at resolution.
    // Aligning with consensus → small reward; going against → small penalty.
    const oldTrust = user.trustScore;
    let trustReason = '';
    if (existingVotes.length >= 3) {
      // Only apply feedback once enough votes exist for meaningful consensus
      const alignsWithConsensus =
        (rumor.credibilityScore > 0 && direction === 1) ||
        (rumor.credibilityScore < 0 && direction === -1);
      const weight = effectiveWeight(user.trustScore);
      const timeFactor = Math.exp(-0.01 * (Date.now() - rumor.createdAt) / DEMO_MS_PER_DAY);
      if (alignsWithConsensus) {
        const gain = 0.03 * timeFactor * Math.min(weight, 1.5);
        user.trustScore = Math.min(10.0, user.trustScore + gain);
        user.correctVotes++;
        trustReason = `+${gain.toFixed(4)} (aligned with consensus, timeFactor=${timeFactor.toFixed(3)})`;
      } else {
        const loss = 0.045 * timeFactor * Math.min(weight, 1.5);
        user.trustScore = Math.max(0.1, user.trustScore - loss);
        user.incorrectVotes++;
        trustReason = `-${loss.toFixed(4)} (against current consensus, timeFactor=${timeFactor.toFixed(3)})`;
      }
    } else {
      // First few votes — small participation reward
      user.trustScore = Math.min(10.0, user.trustScore + 0.005);
      trustReason = '+0.005 (early participation reward)';
    }

    const trustChange = oldTrust !== user.trustScore ? { old: oldTrust, new_: user.trustScore, reason: trustReason } : undefined;

    return { vote, credibilityScore: rumor.credibilityScore, updatedUser: { trustScore: user.trustScore, totalVotes: user.totalVotes }, trustChange };
  }

  // ========== Resolution ==========

  resolveRumor(rumorId: RumorId) {
    const rumor = this.rumors.get(rumorId);
    if (!rumor) return { error: 'Rumor not found' };

    const votes = this.votes.get(rumorId) || [];
    const result = resolveRumor(rumor, votes, this.users);

    if (result.stabilized) {
      rumor.status = 'stabilized';
      rumor.resolution = result.resolution;
      rumor.credibilityScore = result.credibilityScore;

      // Apply trust updates
      for (const update of result.trustUpdates) {
        const user = this.users.get(update.pseudonymId);
        if (user) {
          user.trustScore = update.newTrust;
          if (update.newTrust > update.oldTrust) {
            user.correctVotes++;
          } else {
            user.incorrectVotes++;
          }
        }
        this.trustHistory.push(update);
      }
    }

    return result;
  }

  // ========== Collusion Detection ==========

  runCollusionDetection() {
    const allVotes = Array.from(this.votes.values()).flat();
    this.collusionEdges = buildCorrelationGraph(allVotes, this.users);
    const clusters = detectCollusionClusters(this.collusionEdges);
    const affected = applyCollusionPenalties(this.users, clusters);

    return {
      totalEdges: this.collusionEdges.length,
      flaggedEdges: this.collusionEdges.filter((e) => e.flagged).length,
      affectedUsers: affected.length,
      clusters: Array.from(clusters.entries()).map(([id, info]) => ({
        pseudonym: id,
        penalty: info.penalty,
        connectedWith: info.connectedWith,
      })),
    };
  }

  // ========== Metrics ==========

  getMetrics(): SystemMetrics {
    const users = Array.from(this.users.values());
    const rumors = Array.from(this.rumors.values());
    const totalTrust = users.reduce((s, u) => s + u.trustScore, 0);

    return {
      totalUsers: users.length,
      totalRumors: rumors.length,
      totalVotes: Array.from(this.votes.values()).reduce((s, v) => s + v.length, 0),
      averageTrust: users.length > 0 ? totalTrust / users.length : 0,
      collusionFlagsActive: users.filter((u) => u.flaggedForCollusion).length,
      rumorsResolvedTrue: rumors.filter((r) => r.resolution === 'true').length,
      rumorsResolvedFalse: rumors.filter((r) => r.resolution === 'false').length,
      rumorsUncertain: rumors.filter((r) => r.resolution === 'uncertain').length,
      attacksBlocked: this.attacksBlocked,
    };
  }

  // ========== Simulations ==========

  runNashEquilibrium(rounds: number = 100) {
    return nashEquilibriumPayoffs(rounds);
  }

  runPopularityDemo() {
    return popularityVsTruthDemo();
  }

  runCollusionSimulation(
    attackers: number,
    attackerTrust: number,
    honest: number,
    honestTrust: number
  ) {
    return simulateCollusionAttack(attackers, attackerTrust, honest, honestTrust);
  }
}

// Singleton instance
let storeInstance: TruthChainStore | null = null;

export function getStore(): TruthChainStore {
  if (!storeInstance) {
    storeInstance = new TruthChainStore();
  }
  return storeInstance;
}

export type { TruthChainStore };
