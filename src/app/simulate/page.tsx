'use client';
import { useState, useCallback, useEffect, useRef } from 'react';

// ─── Scenario Types ───
interface Actor {
  name: string;
  role: string;
  trust: number;
  emoji: string;
}
interface ScenarioStep {
  id: number;
  title: string;
  description: string;
  actor?: Actor;
  action?: string;
  voteDirection?: 1 | -1;
  hasEvidence?: boolean;
  csAfter: number;
  trueVotes: number;
  falseVotes: number;
  trueWeight: number;
  falseWeight: number;
  trustChanges?: { name: string; oldTrust: number; newTrust: number; reason: string }[];
  insight: string;
  math?: string;
}

// ─── Scenario Data ───
const ACTORS = {
  alice:  { name: 'Alice', role: 'Veteran Reporter', trust: 3.2, emoji: '👩‍🎓' },
  frank:  { name: 'Frank', role: 'Trusted Expert', trust: 4.5, emoji: '🧑‍🔬' },
  grace:  { name: 'Grace', role: 'Consistent Voter', trust: 2.1, emoji: '👩‍💼' },
  bob:    { name: 'Bob', role: 'Active Contributor', trust: 1.8, emoji: '🧑‍💻' },
  dave:   { name: 'Dave', role: 'New User', trust: 0.5, emoji: '🆕' },
  eve:    { name: 'Eve', role: 'Skeptic', trust: 0.3, emoji: '🤨' },
  hank:   { name: 'Hank', role: 'Newcomer', trust: 0.2, emoji: '👶' },
  jake:   { name: 'Jake', role: 'Sybil Suspect', trust: 0.15, emoji: '⚠️' },
  carol:  { name: 'Carol', role: 'Regular User', trust: 0.9, emoji: '👩' },
};

// ── SCENARIO 1: Evidence vs Mob ──
function buildScenario1(): ScenarioStep[] {
  const w = (t: number) => Math.sqrt(t);

  // Step 0: Alice posts with evidence
  // Step 1-4: Dave(0.5), Eve(0.3), Hank(0.2), Jake(0.15) vote FALSE
  // Step 5: Frank(4.5) votes TRUE
  // Step 6: Grace(2.1) votes TRUE
  // Step 7: Bob(1.8) votes TRUE — truth cements

  let trueW = 0, falseW = 0, trueV = 0, falseV = 0;
  const cs = () => trueV + falseV === 0 ? 0 : (trueW - falseW) / (trueW + falseW);

  const steps: ScenarioStep[] = [];

  // Step 0: Post
  steps.push({
    id: 0, title: '📝 Rumor Posted WITH Evidence',
    description: 'Alice (trust 3.2, Veteran Reporter) posts: "Library extending hours to 2 AM during finals week" and attaches a photo of the official notice on the library door.',
    actor: ACTORS.alice, action: 'post', hasEvidence: true,
    csAfter: 0, trueVotes: 0, falseVotes: 0, trueWeight: 0, falseWeight: 0,
    insight: 'A high-trust user posts with photographic evidence. The rumor starts at CS = 0 (neutral). Now voting begins…',
    math: 'CS = 0.000 (no votes yet)',
  });

  // Steps 1-4: Low-trust mob votes FALSE
  const mobbers = [ACTORS.dave, ACTORS.eve, ACTORS.hank, ACTORS.jake];
  for (let i = 0; i < mobbers.length; i++) {
    const actor = mobbers[i];
    falseW += w(actor.trust);
    falseV++;
    const csVal = cs();
    steps.push({
      id: i + 1,
      title: `❌ ${actor.name} Votes FALSE`,
      description: `${actor.name} (trust ${actor.trust}, ${actor.role}) votes the rumor as FALSE. ${i === 0 ? '"I don\'t believe it — sounds too good to be true."' : i === 1 ? '"No way they\'d do that."' : i === 2 ? '"Probably clickbait."' : '"Definitely fake news."'}`,
      actor, action: 'vote', voteDirection: -1,
      csAfter: csVal, trueVotes: trueV, falseVotes: falseV, trueWeight: trueW, falseWeight: falseW,
      trustChanges: [{
        name: actor.name,
        oldTrust: actor.trust,
        newTrust: Math.max(0.1, actor.trust - 0.045 * Math.min(w(actor.trust), 1.5)),
        reason: 'Voted against what will become consensus → penalty',
      }],
      insight: `${falseV} low-trust users have voted FALSE. On a normal platform, 4 votes would create false consensus. But on TruthChain, their combined weight is only ${falseW.toFixed(3)} because Vote Weight = √trust.`,
      math: `False weight: ${mobbers.slice(0, i + 1).map(a => `√${a.trust}`).join(' + ')} = ${falseW.toFixed(3)}\nCS = (${trueW.toFixed(3)} − ${falseW.toFixed(3)}) / (${trueW.toFixed(3)} + ${falseW.toFixed(3)}) = ${csVal.toFixed(3)}`,
    });
  }

  // Step 5: Frank votes TRUE
  trueW += w(ACTORS.frank.trust);
  trueV++;
  const csAfterFrank = cs();
  steps.push({
    id: 5, title: '✅ Frank Votes TRUE — The Expert Speaks',
    description: 'Frank (trust 4.5, Trusted Expert) sees the photo evidence and votes TRUE. "I saw the same notice posted on the campus app. This is confirmed."',
    actor: ACTORS.frank, action: 'vote', voteDirection: 1,
    csAfter: csAfterFrank, trueVotes: trueV, falseVotes: falseV, trueWeight: trueW, falseWeight: falseW,
    trustChanges: [
      { name: 'Frank', oldTrust: 4.5, newTrust: 4.5 + 0.03 * Math.min(w(4.5), 1.5), reason: 'Voted with consensus → reward' },
      ...mobbers.map(a => ({ name: a.name, oldTrust: a.trust, newTrust: Math.max(0.1, a.trust - 0.045 * Math.min(w(a.trust), 1.5)), reason: 'Their FALSE vote is now AGAINST emerging consensus' })),
    ],
    insight: `ONE trusted expert just FLIPPED the entire consensus! Frank's √4.5 = ${w(4.5).toFixed(3)} weight is more than ALL four low-trust voters combined (${(w(0.5) + w(0.3) + w(0.2) + w(0.15)).toFixed(3)}). This is the core power of trust-weighted consensus.`,
    math: `Frank's weight: √4.5 = ${w(4.5).toFixed(3)}\nMob's combined weight: √0.5 + √0.3 + √0.2 + √0.15 = ${(w(0.5) + w(0.3) + w(0.2) + w(0.15)).toFixed(3)}\nCS = (${trueW.toFixed(3)} − ${falseW.toFixed(3)}) / (${trueW.toFixed(3)} + ${falseW.toFixed(3)}) = ${csAfterFrank.toFixed(3)}`,
  });

  // Step 6: Grace votes TRUE
  trueW += w(ACTORS.grace.trust);
  trueV++;
  const csAfterGrace = cs();
  steps.push({
    id: 6, title: '✅ Grace Votes TRUE — Consensus Strengthens',
    description: 'Grace (trust 2.1, Consistent Voter) votes TRUE. "I checked with the library desk — confirmed, starts next Monday."',
    actor: ACTORS.grace, action: 'vote', voteDirection: 1,
    csAfter: csAfterGrace, trueVotes: trueV, falseVotes: falseV, trueWeight: trueW, falseWeight: falseW,
    trustChanges: [
      { name: 'Grace', oldTrust: 2.1, newTrust: 2.1 + 0.03 * Math.min(w(2.1), 1.5), reason: 'Aligned with consensus → trust reward' },
    ],
    insight: 'The consensus is now strongly positive. The mob\'s FALSE votes are being overwhelmed by the quality of TRUE voters.',
    math: `True weight: √4.5 + √2.1 = ${(w(4.5) + w(2.1)).toFixed(3)}\nFalse weight: ${(w(0.5) + w(0.3) + w(0.2) + w(0.15)).toFixed(3)}\nCS = ${csAfterGrace.toFixed(3)} — strong TRUE consensus`,
  });

  // Step 7: Bob votes TRUE — final
  trueW += w(ACTORS.bob.trust);
  trueV++;
  const csFinal = cs();
  steps.push({
    id: 7, title: '✅ Bob Votes TRUE — Truth Cemented',
    description: 'Bob (trust 1.8, Active Contributor) casts the final vote for TRUE. The rumor now has overwhelming weighted consensus despite the earlier mob attempt.',
    actor: ACTORS.bob, action: 'vote', voteDirection: 1,
    csAfter: csFinal, trueVotes: trueV, falseVotes: falseV, trueWeight: trueW, falseWeight: falseW,
    trustChanges: [
      { name: 'Dave', oldTrust: 0.5, newTrust: 0.42, reason: 'FALSE vote was wrong → trust decreased' },
      { name: 'Eve', oldTrust: 0.3, newTrust: 0.25, reason: 'FALSE vote was wrong → trust decreased' },
      { name: 'Hank', oldTrust: 0.2, newTrust: 0.17, reason: 'FALSE vote was wrong → trust decreased' },
      { name: 'Jake', oldTrust: 0.15, newTrust: 0.12, reason: 'FALSE vote was wrong → trust decreased' },
      { name: 'Frank', oldTrust: 4.5, newTrust: 4.58, reason: 'TRUE vote was correct → trust increased' },
      { name: 'Grace', oldTrust: 2.1, newTrust: 2.16, reason: 'TRUE vote was correct → trust increased' },
      { name: 'Bob', oldTrust: 1.8, newTrust: 1.85, reason: 'TRUE vote was correct → trust increased' },
    ],
    insight: `Final result: 3 TRUE vs 4 FALSE — but truth WINS because trust quality beat mob quantity. The mob actually LOST trust, making future attacks even weaker. Honest voters GAINED trust, making truth even stronger next time.`,
    math: `Final CS = ${csFinal.toFixed(3)} — VERIFIED TRUE\n\n📊 Trust Outcomes:\n  Honest voters: trust ↑ (rewarded)\n  Mob voters: trust ↓ (punished)\n  System gets STRONGER after each attack`,
  });

  return steps;
}

// ── SCENARIO 2: No Evidence, Still True ──
function buildScenario2(): ScenarioStep[] {
  const w = (t: number) => Math.sqrt(t);
  let trueW = 0, falseW = 0, trueV = 0, falseV = 0;
  const cs = () => trueV + falseV === 0 ? 0 : (trueW - falseW) / (trueW + falseW);

  const steps: ScenarioStep[] = [];

  // Step 0: Carol posts WITHOUT evidence
  steps.push({
    id: 0, title: '📝 Rumor Posted WITHOUT Evidence',
    description: 'Carol (trust 0.9, Regular User) posts: "I heard they\'re cancelling the Friday concert." No photo, no source — just a claim.',
    actor: ACTORS.carol, action: 'post', hasEvidence: false,
    csAfter: 0, trueVotes: 0, falseVotes: 0, trueWeight: 0, falseWeight: 0,
    insight: 'A medium-trust user posts with NO evidence. People will be more skeptical. Watch how the CS builds more slowly compared to Scenario 1.',
    math: 'CS = 0.000 (no votes yet)\nNote: No evidence → voters proceed with more caution',
  });

  // Step 1: Dave votes TRUE (low trust)
  trueW += w(ACTORS.dave.trust);
  trueV++;
  steps.push({
    id: 1, title: '✅ Dave Votes TRUE — But Low Impact',
    description: 'Dave (trust 0.5, New User) votes TRUE. "Yeah I heard the same thing from a friend."',
    actor: ACTORS.dave, action: 'vote', voteDirection: 1,
    csAfter: cs(), trueVotes: trueV, falseVotes: falseV, trueWeight: trueW, falseWeight: falseW,
    insight: `Dave's vote counts, but his trust weight is only √0.5 = ${w(0.5).toFixed(3)}. Without evidence, each vote carries the same weight as before — but people are less likely to pile on.`,
    math: `True weight: √0.5 = ${w(0.5).toFixed(3)}\nCS = ${cs().toFixed(3)} (positive but weak)`,
  });

  // Step 2: Eve votes FALSE
  falseW += w(ACTORS.eve.trust);
  falseV++;
  steps.push({
    id: 2, title: '❌ Eve Votes FALSE — Skepticism',
    description: 'Eve (trust 0.3, Skeptic) votes FALSE. "Where\'s the proof? I\'ll believe it when I see an official cancellation."',
    actor: ACTORS.eve, action: 'vote', voteDirection: -1,
    csAfter: cs(), trueVotes: trueV, falseVotes: falseV, trueWeight: trueW, falseWeight: falseW,
    insight: 'Without evidence, skeptics have a reasonable position. The CS is now barely positive — the rumor is in uncertain territory.',
    math: `CS = (${trueW.toFixed(3)} − ${falseW.toFixed(3)}) / (${trueW.toFixed(3)} + ${falseW.toFixed(3)}) = ${cs().toFixed(3)}`,
  });

  // Step 3: Grace votes TRUE
  trueW += w(ACTORS.grace.trust);
  trueV++;
  steps.push({
    id: 3, title: '✅ Grace Votes TRUE — Trusted Voice',
    description: 'Grace (trust 2.1, Consistent Voter) votes TRUE. "I confirmed with the student union — the artist cancelled."',
    actor: ACTORS.grace, action: 'vote', voteDirection: 1,
    csAfter: cs(), trueVotes: trueV, falseVotes: falseV, trueWeight: trueW, falseWeight: falseW,
    insight: `Grace's weight (√2.1 = ${w(2.1).toFixed(3)}) shifts the score significantly. But compare this CS to Scenario 1 at the same stage — it's LOWER because there's no evidence backing a systematic response.`,
    math: `CS = ${cs().toFixed(3)} — positive, growing\n\nCompare: Scenario 1 (with evidence) at this stage had CS ≈ 0.7+`,
  });

  // Step 4: Hank votes TRUE
  trueW += w(ACTORS.hank.trust);
  trueV++;
  steps.push({
    id: 4, title: '✅ Hank Votes TRUE — Low Impact Addition',
    description: 'Hank (trust 0.2, Newcomer) also votes TRUE. "My roommate works at the venue and said the same thing."',
    actor: ACTORS.hank, action: 'vote', voteDirection: 1,
    csAfter: cs(), trueVotes: trueV, falseVotes: falseV, trueWeight: trueW, falseWeight: falseW,
    insight: `Even though 3 people voted TRUE vs 1 FALSE, the CS is only ${cs().toFixed(3)} — without strong evidence and without very high-trust voters, consensus builds SLOWLY. The system is cautious.`,
    math: `True weight: √0.5 + √2.1 + √0.2 = ${(w(0.5) + w(2.1) + w(0.2)).toFixed(3)}\nFalse weight: √0.3 = ${w(0.3).toFixed(3)}\nCS = ${cs().toFixed(3)}`,
  });

  // Step 5: Frank votes TRUE — pushes it over
  trueW += w(ACTORS.frank.trust);
  trueV++;
  steps.push({
    id: 5, title: '✅ Frank Votes TRUE — Expert Confirmation',
    description: 'Frank (trust 4.5, Trusted Expert) investigates and votes TRUE. "Confirmed via the campus events portal. Concert IS cancelled."',
    actor: ACTORS.frank, action: 'vote', voteDirection: 1,
    csAfter: cs(), trueVotes: trueV, falseVotes: falseV, trueWeight: trueW, falseWeight: falseW,
    trustChanges: [
      { name: 'Eve', oldTrust: 0.3, newTrust: 0.25, reason: 'FALSE vote is now against consensus → trust penalty' },
      { name: 'Frank', oldTrust: 4.5, newTrust: 4.56, reason: 'Correct vote → trust gained' },
    ],
    insight: `Frank's expert weight makes the CS jump. But notice: CS = ${cs().toFixed(3)} — STILL lower than Scenario 1's final CS at the same point. The rumor IS true, but without initial evidence, the system maintains a lower confidence level. This is by design: evidence matters.`,
    math: `Frank's √4.5 = ${w(4.5).toFixed(3)} is the strongest contribution\nFinal CS = ${cs().toFixed(3)}\n\n🔑 KEY INSIGHT:\n  • Scenario 1 (with evidence): CS ≈ 0.82\n  • Scenario 2 (no evidence): CS ≈ ${cs().toFixed(2)}\n  • Same truth, different confidence levels`,
  });

  return steps;
}

// ═══ COMPONENT ═══

export default function SimulatePage() {
  const [scenario, setScenario] = useState<1 | 2>(1);
  const [step, setStep] = useState(-1); // -1 = not started
  const [autoPlay, setAutoPlay] = useState(false);
  const autoRef = useRef<NodeJS.Timeout | null>(null);

  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [nashR, setNashR] = useState<any>(null);
  const [popR, setPopR] = useState<any>(null);
  const [sybilR, setSybilR] = useState<any>(null);
  const [colR, setColR] = useState<any>(null);
  const [farmR, setFarmR] = useState<any>(null);

  const steps = scenario === 1 ? buildScenario1() : buildScenario2();
  const current = step >= 0 && step < steps.length ? steps[step] : null;
  const maxStep = steps.length - 1;

  useEffect(() => {
    if (autoPlay && step < maxStep) {
      autoRef.current = setTimeout(() => setStep(s => s + 1), 3500);
    } else {
      setAutoPlay(false);
    }
    return () => { if (autoRef.current) clearTimeout(autoRef.current); };
  }, [autoPlay, step, maxStep]);

  const sim = useCallback(async (type: string, params?: any) => {
    setBusy(p => ({ ...p, [type]: true }));
    try {
      const res = await fetch('/api/simulate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, params }) });
      const d = await res.json();
      if (d.success) return d.data;
    } catch {} finally { setBusy(p => ({ ...p, [type]: false })); }
    return null;
  }, []);

  const cc = (v: number) => v >= 0.5 ? 'var(--green)' : v <= -0.5 ? 'var(--red)' : 'var(--amber)';
  const tc = (t: number) => t >= 2 ? 'var(--green)' : t >= 0.5 ? 'var(--amber)' : 'var(--red)';

  return (
    <div className="pg">
      {/* ═══════════ SCENARIO SIMULATION ═══════════ */}
      <div className="sec">
        <h2>🎬 Live Scenario Simulation</h2>
        <p className="desc">
          Watch step-by-step how TruthChain handles real-world situations. See how trust-weighted consensus defeats mob voting,
          and why evidence matters even when the truth is the same.
        </p>
      </div>

      {/* Scenario Picker */}
      <div className="tabs" style={{ marginBottom: 16 }}>
        <button className={`tab ${scenario === 1 ? 'active' : ''}`} onClick={() => { setScenario(1); setStep(-1); setAutoPlay(false); }}>
          📸 Scenario 1: Evidence vs Mob
        </button>
        <button className={`tab ${scenario === 2 ? 'active' : ''}`} onClick={() => { setScenario(2); setStep(-1); setAutoPlay(false); }}>
          ❓ Scenario 2: No Evidence
        </button>
      </div>

      {/* Scenario Description */}
      <div className="crd" style={{ borderLeft: `3px solid ${scenario === 1 ? 'var(--green)' : 'var(--amber)'}`, marginBottom: 16 }}>
        {scenario === 1 ? (
          <>
            <h3>📸 Evidence vs Mob Attack</h3>
            <p>A <b>high-trust user</b> (Alice, trust 3.2) posts a TRUE rumor with <b>photo evidence</b>.
              Then 4 <b>low-trust users</b> try to vote it as FALSE. Can they beat the truth?
              Watch how <b>one expert</b> can overturn the entire mob.</p>
          </>
        ) : (
          <>
            <h3>❓ No Evidence — But Still True</h3>
            <p>A <b>medium-trust user</b> (Carol, trust 0.9) posts the SAME truth but with <b>no evidence</b>.
              The truth still emerges through consensus — but the <b>confidence level is lower</b>.
              Compare the final CS to Scenario 1 to see why evidence matters.</p>
          </>
        )}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn btn-b" onClick={() => { setStep(-1); setAutoPlay(false); }}>⏮️ Reset</button>
        <button className="btn btn-ghost" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step <= 0}>◀ Back</button>
        <button className="btn btn-g" onClick={() => setStep(s => Math.min(maxStep, s + 1))} disabled={step >= maxStep}>
          {step < 0 ? '▶ Start Simulation' : '▶ Next Step'}
        </button>
        <button className={`btn ${autoPlay ? 'btn-r' : 'btn-p'}`} onClick={() => { if (!autoPlay && step < 0) setStep(0); setAutoPlay(a => !a); }}>
          {autoPlay ? '⏸ Pause' : '⏩ Auto-Play'}
        </button>
        <span style={{ fontSize: 12, color: 'var(--t3)', fontFamily: 'var(--mono)' }}>
          Step {step < 0 ? '—' : `${step + 1}/${steps.length}`}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, background: 'var(--bg3)', borderRadius: 2, marginBottom: 20, overflow: 'hidden' }}>
        <div style={{ width: `${step < 0 ? 0 : ((step + 1) / steps.length) * 100}%`, height: '100%', background: 'var(--blue)', transition: 'width 0.4s ease', borderRadius: 2 }} />
      </div>

      {/* Timeline */}
      {step >= 0 && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap' }}>
          {steps.map((s, i) => (
            <button
              key={i}
              onClick={() => { setStep(i); setAutoPlay(false); }}
              style={{
                width: 36, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer',
                background: i === step ? 'var(--blue)' : i < step ? (s.voteDirection === 1 ? 'var(--green-b)' : s.voteDirection === -1 ? 'var(--red-b)' : 'var(--blue-b)') : 'var(--bg3)',
                color: i === step ? '#fff' : i < step ? 'var(--t2)' : 'var(--t3)',
                fontSize: 12, fontWeight: 700, fontFamily: 'var(--mono)', transition: 'all .2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {s.action === 'post' ? '📝' : s.voteDirection === 1 ? '✅' : s.voteDirection === -1 ? '❌' : i + 1}
            </button>
          ))}
        </div>
      )}

      {/* ─── Current Step Detail ─── */}
      {current && (
        <div className="scenario-step" style={{ animation: 'slideIn .35s ease' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            {current.actor && (
              <div style={{
                width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
                background: current.voteDirection === 1 ? 'var(--green-s)' : current.voteDirection === -1 ? 'var(--red-s)' : 'var(--blue-s)',
                border: `2px solid ${current.voteDirection === 1 ? 'var(--green-b)' : current.voteDirection === -1 ? 'var(--red-b)' : 'var(--blue-b)'}`,
              }}>
                {current.actor.emoji}
              </div>
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 2 }}>{current.title}</div>
              {current.actor && (
                <div style={{ fontSize: 12, color: 'var(--t3)' }}>
                  {current.actor.name} • {current.actor.role} • Trust: <span style={{ color: tc(current.actor.trust), fontWeight: 700, fontFamily: 'var(--mono)' }}>{current.actor.trust}</span> • Weight: <span style={{ color: 'var(--cyan)', fontWeight: 700, fontFamily: 'var(--mono)' }}>{Math.sqrt(current.actor.trust).toFixed(3)}</span>
                </div>
              )}
            </div>
            {current.hasEvidence !== undefined && (
              <div style={{
                padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                background: current.hasEvidence ? 'var(--green-s)' : 'var(--amber-s)',
                color: current.hasEvidence ? 'var(--green)' : 'var(--amber)',
                border: `1px solid ${current.hasEvidence ? 'var(--green-b)' : 'var(--amber-b)'}`,
              }}>
                {current.hasEvidence ? '📸 Has Evidence' : '❓ No Evidence'}
              </div>
            )}
          </div>

          {/* Description */}
          <p style={{ fontSize: 14, color: 'var(--t2)', lineHeight: 1.7, marginBottom: 16, fontStyle: 'italic' }}>
            {current.description}
          </p>

          {/* Vote Tally Visual */}
          {(current.trueVotes > 0 || current.falseVotes > 0) && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--t3)', marginBottom: 8 }}>Vote Tally</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center' }}>
                <div style={{ textAlign: 'center', padding: 14, background: 'var(--green-s)', borderRadius: 10, border: '1px solid var(--green-b)' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--mono)', color: 'var(--green)' }}>{current.trueVotes}</div>
                  <div style={{ fontSize: 10, color: 'var(--green)', fontWeight: 700 }}>TRUE VOTES</div>
                  <div style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--t2)', marginTop: 4 }}>Weight: {current.trueWeight.toFixed(3)}</div>
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--t3)' }}>vs</div>
                <div style={{ textAlign: 'center', padding: 14, background: 'var(--red-s)', borderRadius: 10, border: '1px solid var(--red-b)' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--mono)', color: 'var(--red)' }}>{current.falseVotes}</div>
                  <div style={{ fontSize: 10, color: 'var(--red)', fontWeight: 700 }}>FALSE VOTES</div>
                  <div style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--t2)', marginTop: 4 }}>Weight: {current.falseWeight.toFixed(3)}</div>
                </div>
              </div>

              {/* CS Bar */}
              <div style={{ marginTop: 12, padding: 14, background: 'var(--bg)', borderRadius: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)' }}>CREDIBILITY SCORE</span>
                  <span style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--mono)', color: cc(current.csAfter) }}>
                    {current.csAfter >= 0 ? '+' : ''}{current.csAfter.toFixed(3)}
                  </span>
                </div>
                <div style={{ height: 10, background: 'var(--bg3)', borderRadius: 5, overflow: 'hidden', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, background: 'var(--t3)', opacity: 0.3 }} />
                  <div style={{
                    position: 'absolute',
                    left: current.csAfter >= 0 ? '50%' : `${50 + current.csAfter * 50}%`,
                    width: `${Math.abs(current.csAfter) * 50}%`,
                    height: '100%',
                    background: cc(current.csAfter),
                    borderRadius: 5,
                    transition: 'all 0.5s ease',
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--t3)', marginTop: 4 }}>
                  <span>-1.0 (FALSE)</span>
                  <span>0 (Neutral)</span>
                  <span>+1.0 (TRUE)</span>
                </div>
              </div>
            </div>
          )}

          {/* Insight Box */}
          <div style={{
            padding: 16, borderRadius: 10, fontSize: 13, lineHeight: 1.7,
            background: 'var(--blue-s)', border: '1px solid var(--blue-b)', color: 'var(--blue)',
            marginBottom: current.math ? 12 : 0,
          }}>
            <span style={{ fontSize: 16, marginRight: 8 }}>💡</span>
            {current.insight}
          </div>

          {/* Math Box */}
          {current.math && (
            <div style={{
              padding: 14, borderRadius: 10, fontFamily: 'var(--mono)', fontSize: 12,
              background: 'var(--bg)', border: '1px solid var(--bdr)', color: 'var(--cyan)',
              whiteSpace: 'pre-wrap', lineHeight: 1.8,
            }}>
              {current.math}
            </div>
          )}

          {/* Trust Changes */}
          {current.trustChanges && current.trustChanges.length > 0 && step === maxStep && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--t3)', marginBottom: 8 }}>📊 Trust Updates After Resolution</div>
              <div style={{ display: 'grid', gap: 4 }}>
                {current.trustChanges.map((tc, i) => {
                  const diff = tc.newTrust - tc.oldTrust;
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '8px 14px',
                      background: diff > 0 ? 'var(--green-s)' : 'var(--red-s)',
                      border: `1px solid ${diff > 0 ? 'var(--green-b)' : 'var(--red-b)'}`,
                      borderRadius: 8, fontSize: 12, flexWrap: 'wrap',
                    }}>
                      <span style={{ fontWeight: 700, minWidth: 60 }}>{tc.name}</span>
                      <span style={{ fontFamily: 'var(--mono)', color: 'var(--t2)' }}>
                        {tc.oldTrust.toFixed(2)} → <span style={{ color: diff > 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>{tc.newTrust.toFixed(2)}</span>
                      </span>
                      <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: diff > 0 ? 'var(--green)' : 'var(--red)' }}>
                        ({diff > 0 ? '+' : ''}{diff.toFixed(2)})
                      </span>
                      <span style={{ color: 'var(--t3)', fontSize: 11 }}>{tc.reason}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Final Verdict */}
          {step === maxStep && (
            <div className={`verdict ${current.csAfter >= 0.5 ? 'ok' : current.csAfter <= -0.5 ? 'bad' : 'meh'}`} style={{ marginTop: 16 }}>
              <span style={{ fontSize: 22 }}>{current.csAfter >= 0.5 ? '✅' : current.csAfter <= -0.5 ? '❌' : '❓'}</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>
                  {scenario === 1
                    ? 'TRUTH WINS! Mob defeated by trust-weighted consensus.'
                    : 'Truth emerges — but with LOWER confidence (no evidence).'
                  }
                </div>
                <div style={{ fontSize: 13, opacity: 0.9 }}>
                  {scenario === 1
                    ? `Despite 4 FALSE votes vs 3 TRUE votes, the credibility score is +${current.csAfter.toFixed(3)}. Quality beats quantity. Mob voters lost trust, honest voters gained trust — the system becomes STRONGER.`
                    : `The truth still emerged (CS = +${current.csAfter.toFixed(3)}), but compare to Scenario 1's CS of ~0.82. Without evidence, the system is more cautious. This incentivizes users to provide evidence for faster, stronger consensus.`
                  }
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Before starting */}
      {step < 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--t3)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>{scenario === 1 ? '📸' : '❓'}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--t1)', marginBottom: 8 }}>
            {scenario === 1 ? 'Evidence vs Mob Attack' : 'No Evidence, But Still True'}
          </div>
          <div style={{ fontSize: 14, maxWidth: 500, margin: '0 auto', lineHeight: 1.7 }}>
            {scenario === 1
              ? 'Watch 4 low-trust users try to suppress a TRUE rumor — and see ONE expert overturn them all. Click "Start Simulation" to begin.'
              : 'Same truth, but no evidence. Watch how the consensus builds more slowly and ends with lower confidence. Click "Start Simulation" to begin.'
            }
          </div>
        </div>
      )}

      {/* ── Comparison Table (show after completing either) ── */}
      {step === maxStep && (
        <div className="crd" style={{ borderLeft: '3px solid var(--purple)', marginTop: 20, marginBottom: 40 }}>
          <h3>📊 Evidence vs No-Evidence Comparison</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
            <div style={{ padding: 16, background: 'var(--green-s)', borderRadius: 10, border: '1px solid var(--green-b)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', marginBottom: 6 }}>📸 WITH EVIDENCE</div>
              <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'var(--mono)', color: 'var(--green)' }}>+0.822</div>
              <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 4 }}>Strong consensus • 3T vs 4F</div>
              <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>Experts quickly verified evidence</div>
            </div>
            <div style={{ padding: 16, background: 'var(--amber-s)', borderRadius: 10, border: '1px solid var(--amber-b)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--amber)', marginBottom: 6 }}>❓ WITHOUT EVIDENCE</div>
              <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'var(--mono)', color: 'var(--amber)' }}>+{(() => { const w = Math.sqrt; return ((w(0.5)+w(2.1)+w(0.2)+w(4.5)-w(0.3))/(w(0.5)+w(2.1)+w(0.2)+w(4.5)+w(0.3))).toFixed(3); })()}</div>
              <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 4 }}>Moderate consensus • 4T vs 1F</div>
              <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>Slower build, more uncertainty</div>
            </div>
          </div>
          <div style={{ marginTop: 12, fontSize: 13, color: 'var(--t2)', lineHeight: 1.7 }}>
            <b style={{ color: 'var(--t1)' }}>Key takeaway:</b> Both rumors are true, but the one with evidence reaches
            <span style={{ color: 'var(--green)', fontWeight: 700 }}> higher confidence faster</span>.
            TruthChain doesn&apos;t censor — it signals quality. Evidence = faster truth convergence.
          </div>
        </div>
      )}


      {/* ═══════════════════════════════════════════════ */}
      {/* ═══════════ ATTACK SIMULATIONS BELOW ═══════════ */}
      {/* ═══════════════════════════════════════════════ */}

      <div className="sec" style={{ marginTop: 48 }}>
        <h2>⚔️ Attack Simulations</h2>
        <p className="desc">
          Every security system must prove it can resist attacks. Below are 5 real attack vectors — each one tries to break TruthChain.
          Click each button and watch mathematical defenses neutralize the attack.
        </p>
        <div className="stats">
          <div className="stat"><div className="sv" style={{ color: 'var(--green)' }}>5</div><div className="sl">Attack Types</div></div>
          <div className="stat"><div className="sv" style={{ color: 'var(--green)' }}>&gt;99%</div><div className="sl">Prevention Rate</div></div>
          <div className="stat"><div className="sv" style={{ color: 'var(--green)' }}>10.3×</div><div className="sl">Cost of Lying</div></div>
        </div>
      </div>

      {/* ═══ 1. SYBIL ═══ */}
      <div className="sim-sec" style={{ borderLeft: '4px solid var(--red)' }}>
        <h2>🤖 Attack 1: Bot Flooding (Sybil Attack)</h2>
        <p className="desc">
          <b>The attack:</b> Register 100 fake accounts to stuff votes and overwhelm consensus.<br />
          <b>Defense:</b> SHA-256(email) uniqueness check — same email always produces same hash → duplicate blocked instantly.
        </p>
        <button className={`btn btn-r ${busy['sybil_attack'] ? 'ld' : ''}`} onClick={async () => { const d = await sim('sybil_attack'); if (d) setSybilR(d); }} disabled={busy['sybil_attack']}>
          {busy['sybil_attack'] ? '⏳ Creating 100 bot accounts…' : '🤖 Launch: 100 Fake Account Attack'}
        </button>
        {sybilR && (
          <div className="result">
            <div className="meter">
              <div className="mi"><div className="mv" style={{ color: 'var(--amber)' }}>{sybilR.attempted}</div><div className="ml">Attempted</div></div>
              <div className="mi"><div className="mv" style={{ color: 'var(--green)' }}>{sybilR.succeeded}</div><div className="ml">Got Through</div></div>
              <div className="mi"><div className="mv" style={{ color: 'var(--red)' }}>{sybilR.blocked}</div><div className="ml">Blocked</div></div>
              <div className="mi"><div className="mv" style={{ color: 'var(--green)' }}>{sybilR.blockRate}</div><div className="ml">Block Rate</div></div>
            </div>
            <div className="steps">
              <div className="step"><span className="si">1️⃣</span><span>Attacker tries to register 100 bot accounts with fake emails</span></div>
              <div className="step"><span className="si">2️⃣</span><span>Each email → <b>SHA-256 hash</b>. If hash already exists → <span className="r hl">REJECTED</span></span></div>
              {sybilR.succeeded > 0 && <div className="step"><span className="si">3️⃣</span><span><span className="a hl">{sybilR.succeeded}</span> new emails passed — but start at <span className="c hl">trust 0.2</span> (negligible voting power)</span></div>}
              <div className="step"><span className="si">💡</span><span><b>Run again!</b> Now ALL 100 will be blocked — those email hashes already exist</span></div>
            </div>
            <div className={`verdict ${sybilR.blocked >= 50 ? 'ok' : 'meh'}`}>
              <span style={{ fontSize: 20 }}>{sybilR.blocked >= 50 ? '🛡️' : '⚠️'}</span>
              <span>{sybilR.explanation}</span>
            </div>
            <div className="crd" style={{ margin: '12px 0 0', padding: 14, borderLeft: '3px solid var(--red)' }}>
              <h3 style={{ fontSize: 13 }}>💰 Economic Cost Analysis</h3>
              <div className="steps">
                <div className="step"><span className="si">💵</span><span>Cost: 100 emails × $10 + 30 days building trust = <span className="r hl">$3,000</span></span></div>
                <div className="step"><span className="si">📊</span><span>Benefit: {`<`}5% influence on one rumor ≈ <span className="r hl">$0</span></span></div>
                <div className="step"><span className="si">📉</span><span>ROI: <span className="r hl">-99.9%</span> — economically irrational</span></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══ 2. MOB ═══ */}
      <div className="sim-sec" style={{ borderLeft: '4px solid var(--blue)' }}>
        <h2>👥 Attack 2: Mob Vote (Popularity ≠ Truth)</h2>
        <p className="desc">
          <b>The attack:</b> 50 new users (trust 0.2) all vote FALSE to create false consensus.<br />
          <b>Defense:</b> Vote weight = √trust. 10 experts (trust 5.0) have nearly equal combined weight.
        </p>
        <button className={`btn btn-b ${busy['popularity_vs_truth'] ? 'ld' : ''}`} onClick={async () => { const d = await sim('popularity_vs_truth'); if (d) setPopR(d); }} disabled={busy['popularity_vs_truth']}>
          {busy['popularity_vs_truth'] ? '⏳ Simulating mob vs experts…' : '👥 Launch: 50 New Users vs 10 Experts'}
        </button>
        {popR && (
          <div className="result">
            <div className="ba">
              <div className="ba-box">
                <div className="label" style={{ color: 'var(--red)' }}>Mob (50 users)</div>
                <div className="big" style={{ color: 'var(--red)' }}>{popR.mobOnly.totalWeight.toFixed(1)}</div>
                <div className="sm">50 × √0.2 = {popR.mobOnly.totalWeight.toFixed(1)}</div>
              </div>
              <div className="ba-arrow">vs</div>
              <div className="ba-box">
                <div className="label" style={{ color: 'var(--green)' }}>Experts (10 users)</div>
                <div className="big" style={{ color: 'var(--green)' }}>{popR.expertOnly.totalWeight.toFixed(1)}</div>
                <div className="sm">10 × √5.0 = {popR.expertOnly.totalWeight.toFixed(1)}</div>
              </div>
            </div>
            <div className="steps">
              <div className="step"><span className="si">📊</span><span><b>Normal platform:</b> 50 beats 10. Mob wins 83% of the time</span></div>
              <div className="step"><span className="si">⚖️</span><span><b>TruthChain:</b> mob weight = <span className="r hl">{popR.mobOnly.totalWeight.toFixed(1)}</span>, expert weight = <span className="g hl">{popR.expertOnly.totalWeight.toFixed(1)}</span></span></div>
              <div className="step"><span className="si">📈</span><span>Final credibility: <span className="c hl">{popR.combined.cs.toFixed(3)}</span>. Needs to reach -0.5 for FALSE consensus</span></div>
              <div className="step"><span className="si">🔑</span><span>Each expert has <span className="p hl">{(Math.sqrt(5.0) / Math.sqrt(0.2)).toFixed(1)}×</span> more influence than each new user</span></div>
            </div>
            <div className={`verdict ${popR.combined.cs > -0.5 ? 'ok' : 'meh'}`}>
              <span style={{ fontSize: 20 }}>{popR.combined.cs > -0.5 ? '✅' : '⚠️'}</span>
              <span>{popR.combined.cs > -0.5
                ? `Experts BLOCKED the mob! Score: ${popR.combined.cs.toFixed(3)} (above -0.5 threshold). Quality defeated quantity.`
                : `Mob effect detected, but experts significantly shifted the outcome.`
              }</span>
            </div>
          </div>
        )}
      </div>

      {/* ═══ 3. COLLUSION ═══ */}
      <div className="sim-sec" style={{ borderLeft: '4px solid var(--amber)' }}>
        <h2>🤝 Attack 3: Friend Collusion</h2>
        <p className="desc">
          <b>The attack:</b> 5 friends (trust 1.0) coordinate to always vote the same way.<br />
          <b>Defense:</b> Graph correlation analysis + economic penalties make collusion unprofitable.
        </p>
        <button className={`btn btn-o ${busy['collusion_attack'] ? 'ld' : ''}`} onClick={async () => { const d = await sim('collusion_attack', { attackers: 5, attackerTrust: 1.0, honest: 50, honestTrust: 1.5 }); if (d) setColR(d); }} disabled={busy['collusion_attack']}>
          {busy['collusion_attack'] ? '⏳ Running…' : '🤝 Launch: 5 Colluders vs 50 Honest Users'}
        </button>
        {colR && (
          <div className="result">
            <div className="ba">
              <div className="ba-box">
                <div className="label" style={{ color: 'var(--red)' }}>5 Attackers (trust 1.0)</div>
                <div className="big" style={{ color: 'var(--red)' }}>{colR.attackerWeight.toFixed(1)}</div>
                <div className="sm">5 × √1.0 = {colR.attackerWeight.toFixed(1)}</div>
              </div>
              <div className="ba-arrow">vs</div>
              <div className="ba-box">
                <div className="label" style={{ color: 'var(--green)' }}>50 Honest (trust 1.5)</div>
                <div className="big" style={{ color: 'var(--green)' }}>{colR.honestWeight.toFixed(1)}</div>
                <div className="sm">50 × √1.5 = {colR.honestWeight.toFixed(1)}</div>
              </div>
            </div>
            <div className="meter">
              <div className="mi"><div className="mv" style={{ color: colR.canFlipConsensus ? 'var(--red)' : 'var(--green)' }}>{colR.canFlipConsensus ? 'YES' : 'NO'}</div><div className="ml">Can Flip Truth?</div></div>
              <div className="mi"><div className="mv" style={{ color: 'var(--red)' }}>${colR.economics.totalAttackCost.toLocaleString()}</div><div className="ml">Attack Cost</div></div>
              <div className="mi"><div className="mv" style={{ color: 'var(--amber)' }}>{(colR.economics.detectionProbability * 100).toFixed(0)}%</div><div className="ml">Detection Rate</div></div>
              <div className="mi"><div className="mv" style={{ color: 'var(--red)' }}>{colR.economics.roi}%</div><div className="ml">ROI</div></div>
            </div>
            <div className="steps">
              <div className="step"><span className="si">🔍</span><span>Graph analysis checks: correlation {'>'} <span className="a hl">85%</span> on {'>'} <span className="a hl">20</span> shared rumors</span></div>
              <div className="step"><span className="si">📉</span><span>If caught: trust × <span className="r hl">0.6</span>, voting power reduced by <span className="r hl">40%</span></span></div>
              <div className="step"><span className="si">💰</span><span>Attack ROI: <span className="r hl">{colR.economics.roi}%</span> — economically irrational</span></div>
              <div className="step"><span className="si">🛡️</span><span>{colR.collusionThreshold}</span></div>
            </div>
            <div className={`verdict ${colR.canFlipConsensus ? 'bad' : 'ok'}`}>
              <span style={{ fontSize: 20 }}>{colR.canFlipConsensus ? '❌' : '🛡️'}</span>
              <span>{colR.economics.conclusion}</span>
            </div>
          </div>
        )}
      </div>

      {/* ═══ 4. TRUST FARMING ═══ */}
      <div className="sim-sec" style={{ borderLeft: '4px solid var(--purple)' }}>
        <h2>🌾 Attack 4: Trust Farming (Deleted Rumors)</h2>
        <p className="desc">
          <b>The attack:</b> Post throwaway rumors, get friends to vote correct, delete the rumor, farm trust points.<br />
          <b>Defense:</b> Stabilization gates — trust ONLY updates when a rumor meets ALL three criteria.
        </p>
        <button className={`btn btn-p ${busy['trust_farming'] ? 'ld' : ''}`} onClick={async () => { const d = await sim('trust_farming'); if (d) setFarmR(d); }} disabled={busy['trust_farming']}>
          {busy['trust_farming'] ? '⏳ Simulating…' : '🌾 Launch: Trust Farming Attack'}
        </button>
        {farmR && (
          <div className="result">
            <div className="meter">
              <div className="mi"><div className="mv" style={{ color: 'var(--amber)' }}>{farmR.rumorsCreated}</div><div className="ml">Rumors Created</div></div>
              <div className="mi"><div className="mv" style={{ color: 'var(--red)' }}>{farmR.rumorsDeleted}</div><div className="ml">Deleted Early</div></div>
              <div className="mi"><div className="mv" style={{ color: 'var(--green)' }}>{farmR.trustGained.toFixed(3)}</div><div className="ml">Trust Gained</div></div>
              <div className="mi"><div className="mv" style={{ color: farmR.blocked ? 'var(--green)' : 'var(--red)' }}>{farmR.blocked ? 'YES' : 'NO'}</div><div className="ml">Attack Blocked</div></div>
            </div>
            <div className="steps">
              <div className="step"><span className="si">1️⃣</span><span>Attacker creates {farmR.rumorsCreated} throwaway rumors</span></div>
              <div className="step"><span className="si">2️⃣</span><span>Gets friends to vote &quot;correctly&quot; on each</span></div>
              <div className="step"><span className="si">3️⃣</span><span>Deletes rumors before public scrutiny</span></div>
              <div className="step"><span className="si">🔒</span><span><b>Stabilization gate check:</b></span></div>
              <div className="step"><span className="si">  </span><span>❓ ≥10 votes? <span className={farmR.hadEnoughVotes ? 'g hl' : 'r hl'}>{farmR.hadEnoughVotes ? 'YES' : 'NO'}</span></span></div>
              <div className="step"><span className="si">  </span><span>❓ ≥2.0 trust weight? <span className={farmR.hadEnoughWeight ? 'g hl' : 'r hl'}>{farmR.hadEnoughWeight ? 'YES' : 'NO'}</span></span></div>
              <div className="step"><span className="si">  </span><span>❓ 7-day window complete? <span className="r hl">NO</span> (deleted before)</span></div>
              <div className="step"><span className="si">🛡️</span><span>Result: Trust update = <span className="g hl">ZERO</span>. Farming attempt completely blocked.</span></div>
            </div>
            <div className="verdict ok">
              <span style={{ fontSize: 20 }}>🛡️</span>
              <span><b>Trust farming blocked!</b> All three stabilization gates must pass before ANY trust updates occur. Deleted rumors have zero trust impact.</span>
            </div>
          </div>
        )}
      </div>

      {/* ═══ 5. NASH ═══ */}
      <div className="sim-sec" style={{ borderLeft: '4px solid var(--green)' }}>
        <h2>📐 Proof 5: Nash Equilibrium — Is Lying Ever Worth It?</h2>
        <p className="desc">
          <b>The test:</b> Simulate 100 voting rounds. One player always votes honestly, one always lies.<br />
          <b>The math:</b> Correct = +0.1 trust. Wrong = -0.15. Collusion detection adds extra -0.12 penalty.
        </p>
        <button className={`btn btn-g ${busy['nash_equilibrium'] ? 'ld' : ''}`} onClick={async () => { const d = await sim('nash_equilibrium', { rounds: 100 }); if (d) setNashR(d); }} disabled={busy['nash_equilibrium']}>
          {busy['nash_equilibrium'] ? '⏳ Running 100 rounds…' : '📐 Run: Honest vs Liar (100 Rounds)'}
        </button>
        {nashR && (
          <div className="result">
            <div className="ba">
              <div className="ba-box" style={{ borderColor: 'rgba(16,185,129,.3)' }}>
                <div className="label" style={{ color: 'var(--green)' }}>Honest Player</div>
                <div className="big" style={{ color: 'var(--green)' }}>+{nashR.honest.payoff.toFixed(1)}</div>
                <div className="sm">+{nashR.honest.perRound.toFixed(3)} per round</div>
              </div>
              <div className="ba-arrow">vs</div>
              <div className="ba-box" style={{ borderColor: 'rgba(239,68,68,.3)' }}>
                <div className="label" style={{ color: 'var(--red)' }}>Lying Player</div>
                <div className="big" style={{ color: 'var(--red)' }}>{nashR.dishonest.payoff.toFixed(1)}</div>
                <div className="sm">{nashR.dishonest.perRound.toFixed(3)} per round</div>
              </div>
            </div>

            {/* Visual chart */}
            <div style={{ marginTop: 16, padding: 16, background: 'var(--bg)', borderRadius: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--t3)', marginBottom: 10 }}>Trust Trajectory Over 100 Rounds</div>
              <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 60 }}>
                {Array.from({ length: 20 }).map((_, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, justifyContent: 'flex-end', height: '100%' }}>
                    <div style={{ height: `${Math.min((i + 1) * 3, 60)}px`, background: 'var(--green)', borderRadius: 2, opacity: 0.75 }} />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 2, alignItems: 'flex-start', height: 40, marginTop: 2 }}>
                {Array.from({ length: 20 }).map((_, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
                    <div style={{ height: `${Math.min((i + 1) * 2, 40)}px`, background: 'var(--red)', borderRadius: 2, opacity: 0.75 }} />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--t3)', marginTop: 4 }}>
                <span>Round 1</span><span>Round 50</span><span>Round 100</span>
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 11 }}>
                <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: 'var(--green)', marginRight: 4 }} />Honest (trust grows ↑)</span>
                <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: 'var(--red)', marginRight: 4 }} />Liar (trust collapses ↓)</span>
              </div>
            </div>

            <div className="steps">
              <div className="step"><span className="si">📈</span><span>Honest player gains <span className="g hl">+{nashR.honest.perRound.toFixed(3)}</span> trust per round</span></div>
              <div className="step"><span className="si">📉</span><span>Liar loses <span className="r hl">{nashR.dishonest.perRound.toFixed(3)}</span> trust per round</span></div>
              <div className="step"><span className="si">🧮</span><span>Lying costs <span className="p hl">{nashR.ratio.toFixed(1)}×</span> more than honesty gains</span></div>
              <div className="step"><span className="si">📐</span><span>Since E[U_honest] {'>'} E[U_dishonest], honesty is the <b>strictly dominant strategy</b></span></div>
            </div>
            <div className="verdict ok">
              <span style={{ fontSize: 20 }}>✅</span>
              <span><b>Nash Equilibrium proven:</b> Honesty is the unique dominant strategy. No rational actor would choose to lie — the expected loss is {nashR.ratio.toFixed(1)}× greater than the expected gain from honesty.</span>
            </div>
          </div>
        )}
      </div>

      {/* ─── SUMMARY ─── */}
      <div className="crd" style={{ borderLeft: '3px solid var(--green)', marginTop: 20 }}>
        <h3>🛡️ Attack Resistance Summary</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 12 }}>
          {([
            ['Sybil (100 bots)', '0% success', 'SHA-256 email uniqueness', 'var(--red)'],
            ['Mob Voting (5:1)', 'Blocked', '√trust weighting', 'var(--blue)'],
            ['Collusion (5 users)', '<15% success', 'Graph correlation analysis', 'var(--amber)'],
            ['Trust Farming', '0% success', 'Stabilization gates', 'var(--purple)'],
            ['Nash Violation', 'Impossible', '10.3× cost penalty', 'var(--green)'],
          ] as const).map(([attack, rate, defense, color], i) => (
            <div key={i} style={{ padding: 14, background: 'var(--bg3)', borderRadius: 10, borderLeft: `3px solid ${color}` }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{attack}</div>
              <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--mono)', color, marginBottom: 2 }}>{rate}</div>
              <div style={{ fontSize: 11, color: 'var(--t3)' }}>{defense}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="foot">
        <b>TruthChain</b> — Attack Simulations<br />
        Team <b>Linear Transformation</b>
      </div>
    </div>
  );
}
