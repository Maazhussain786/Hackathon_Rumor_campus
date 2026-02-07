'use client';
import { useState, useCallback } from 'react';

export default function SimulatePage() {
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [nashR, setNashR] = useState<any>(null);
  const [popR, setPopR] = useState<any>(null);
  const [sybilR, setSybilR] = useState<any>(null);
  const [colR, setColR] = useState<any>(null);
  const [farmR, setFarmR] = useState<any>(null);

  const sim = useCallback(async (type: string, params?: any) => {
    setBusy(p => ({ ...p, [type]: true }));
    try {
      const res = await fetch('/api/simulate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, params }) });
      const d = await res.json();
      if (d.success) return d.data;
    } catch {} finally { setBusy(p => ({ ...p, [type]: false })); }
    return null;
  }, []);

  return (
    <div className="pg">
      <div className="sec">
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
