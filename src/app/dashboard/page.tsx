'use client';
import { useState, useEffect, useCallback } from 'react';

interface Metrics {
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

interface User {
  pseudonymId: string;
  trustScore: number;
  totalVotes: number;
  correctVotes: number;
  incorrectVotes: number;
  flaggedForCollusion: boolean;
}

interface Rumor {
  id: string;
  content: string;
  category: string;
  credibilityScore: number;
  totalVotes: number;
  status: string;
  resolution: string | null;
  totalTrustWeight: number;
  createdAt: number;
}

const MS_PER_DAY = 60_000; // 1 min = 1 simulated day

const NAMES = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank', 'Grace', 'Hank', 'Ivy', 'Jake'];

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [rumors, setRumors] = useState<Rumor[]>([]);
  const [collusionResult, setCollusionResult] = useState<any>(null);
  const [colBusy, setColBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [m, u, r] = await Promise.all([
        fetch('/api/metrics').then(x => x.json()),
        fetch('/api/users').then(x => x.json()),
        fetch('/api/rumors').then(x => x.json()),
      ]);
      if (m.success) setMetrics(m.data);
      if (u.success) setUsers(u.data);
      if (r.success) setRumors(r.data);
    } catch {}
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, [load]);

  const runCollusion = async () => {
    setColBusy(true);
    try {
      const res = await fetch('/api/simulate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'collusion_detection' }) });
      const d = await res.json();
      if (d.success) setCollusionResult(d.data);
    } catch {}
    setColBusy(false);
  };

  const resolveRumor = async (rumorId: string) => {
    try {
      const res = await fetch('/api/simulate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'resolve_rumor', params: { rumorId } }) });
      await res.json();
      await load();
    } catch {}
  };

  const tc = (t: number) => t >= 2 ? 'var(--green)' : t >= 0.5 ? 'var(--amber)' : 'var(--red)';

  // Trust distribution buckets
  const trustBuckets = [
    { label: '0.1–0.3', min: 0.1, max: 0.3, color: 'var(--red)' },
    { label: '0.3–1.0', min: 0.3, max: 1.0, color: 'var(--orange)' },
    { label: '1.0–2.0', min: 1.0, max: 2.0, color: 'var(--amber)' },
    { label: '2.0–4.0', min: 2.0, max: 4.0, color: 'var(--green)' },
    { label: '4.0–10.0', min: 4.0, max: 10.0, color: 'var(--cyan)' },
  ];
  const maxBucket = Math.max(...trustBuckets.map(b => users.filter(u => u.trustScore >= b.min && u.trustScore < b.max).length), 1);

  return (
    <div className="pg">
      <div className="sec">
        <h2>📊 System Dashboard</h2>
        <p className="desc">Real-time overview of the TruthChain network: users, trust distribution, rumor resolutions, collusion detection, and attack defense metrics.</p>
      </div>

      {/* ─── KEY METRICS ─── */}
      {metrics && (
        <div className="stats">
          <div className="stat">
            <div className="sv" style={{ color: 'var(--blue)' }}>{metrics.totalUsers}</div>
            <div className="sl">Users</div>
          </div>
          <div className="stat">
            <div className="sv" style={{ color: 'var(--purple)' }}>{metrics.totalRumors}</div>
            <div className="sl">Rumors</div>
          </div>
          <div className="stat">
            <div className="sv" style={{ color: 'var(--cyan)' }}>{metrics.totalVotes}</div>
            <div className="sl">Total Votes</div>
          </div>
          <div className="stat">
            <div className="sv" style={{ color: 'var(--amber)' }}>{metrics.averageTrust.toFixed(2)}</div>
            <div className="sl">Avg Trust</div>
          </div>
          <div className="stat">
            <div className="sv" style={{ color: 'var(--red)' }}>{metrics.attacksBlocked}</div>
            <div className="sl">Attacks Blocked</div>
          </div>
          <div className="stat">
            <div className="sv" style={{ color: 'var(--orange)' }}>{metrics.collusionFlagsActive}</div>
            <div className="sl">Collusion Flags</div>
          </div>
        </div>
      )}

      {/* ─── TRUST DISTRIBUTION ─── */}
      <div className="sec" style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 18 }}>📈 Trust Score Distribution</h2>
        <p className="desc">How trust is distributed across {users.length} users. Healthy systems have a bell curve — most users in the middle tiers.</p>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', height: 140, padding: '0 10px', marginTop: 16 }}>
          {trustBuckets.map((b) => {
            const count = users.filter(u => u.trustScore >= b.min && u.trustScore < (b.max === 10 ? 11 : b.max)).length;
            const pct = count / Math.max(maxBucket, 1);
            return (
              <div key={b.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 700, color: b.color }}>{count}</span>
                <div style={{ width: '100%', height: `${Math.max(pct * 100, 8)}px`, background: b.color, borderRadius: '6px 6px 0 0', opacity: 0.8, transition: 'height .4s ease', minHeight: 8 }} />
                <span style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--mono)' }}>{b.label}</span>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10, color: 'var(--t3)' }}>
          <span>Low Trust</span>
          <span>High Trust</span>
        </div>
      </div>

      {/* ─── USER LEADERBOARD ─── */}
      <div className="sec">
        <h2 style={{ fontSize: 18 }}>👥 User Trust Leaderboard</h2>
        <p className="desc">All registered pseudonyms sorted by trust score. Trust is earned through consistent accurate voting.</p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--t3)', fontWeight: 700, borderBottom: '1px solid var(--bdr)' }}>Rank</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--t3)', fontWeight: 700, borderBottom: '1px solid var(--bdr)' }}>User</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--t3)', fontWeight: 700, borderBottom: '1px solid var(--bdr)' }}>Trust</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--t3)', fontWeight: 700, borderBottom: '1px solid var(--bdr)' }}>Weight</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--t3)', fontWeight: 700, borderBottom: '1px solid var(--bdr)' }}>Votes</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--t3)', fontWeight: 700, borderBottom: '1px solid var(--bdr)' }}>Accuracy</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--t3)', fontWeight: 700, borderBottom: '1px solid var(--bdr)' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {[...users].sort((a, b) => b.trustScore - a.trustScore).map((u, i) => {
                const origIdx = users.findIndex(x => x.pseudonymId === u.pseudonymId);
                const name = origIdx < NAMES.length ? NAMES[origIdx] : `User ${u.pseudonymId.slice(0, 6)}`;
                const acc = u.totalVotes > 0 ? Math.round(u.correctVotes / u.totalVotes * 100) : 0;
                return (
                  <tr key={u.pseudonymId}>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--bdr)', color: 'var(--t3)', fontFamily: 'var(--mono)', fontWeight: 700 }}>#{i + 1}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--bdr)', fontWeight: 600 }}>{name}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--bdr)', fontFamily: 'var(--mono)', fontWeight: 700, color: tc(u.trustScore) }}>{u.trustScore.toFixed(2)}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--bdr)', fontFamily: 'var(--mono)', color: 'var(--cyan)' }}>√{u.trustScore.toFixed(1)} = {Math.sqrt(u.trustScore).toFixed(3)}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--bdr)', fontFamily: 'var(--mono)' }}>{u.totalVotes}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--bdr)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 60, height: 6, background: 'var(--bg)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${acc}%`, height: '100%', background: acc >= 60 ? 'var(--green)' : 'var(--red)', borderRadius: 3 }} />
                        </div>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{u.totalVotes > 0 ? `${acc}%` : '—'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--bdr)' }}>
                      {u.flaggedForCollusion
                        ? <span style={{ padding: '2px 8px', borderRadius: 6, background: 'var(--red-s)', color: 'var(--red)', fontSize: 11, fontWeight: 700 }}>⚠ Flagged</span>
                        : <span style={{ padding: '2px 8px', borderRadius: 6, background: 'var(--green-s)', color: 'var(--green)', fontSize: 11, fontWeight: 700 }}>✓ Clean</span>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── RUMOR STATUS ─── */}
      <div className="sec">
        <h2 style={{ fontSize: 18 }}>📋 Rumor Resolution Status</h2>
        <p className="desc">Track each rumor through the verification lifecycle. Click &quot;Resolve&quot; to trigger stabilization check and trust updates.</p>

        {metrics && (
          <div className="stats" style={{ marginBottom: 20 }}>
            <div className="stat"><div className="sv" style={{ color: 'var(--green)' }}>{metrics.rumorsResolvedTrue}</div><div className="sl">Confirmed True</div></div>
            <div className="stat"><div className="sv" style={{ color: 'var(--red)' }}>{metrics.rumorsResolvedFalse}</div><div className="sl">Confirmed False</div></div>
            <div className="stat"><div className="sv" style={{ color: 'var(--amber)' }}>{metrics.rumorsUncertain}</div><div className="sl">Uncertain</div></div>
            <div className="stat"><div className="sv" style={{ color: 'var(--blue)' }}>{rumors.filter(r => r.status === 'pending').length}</div><div className="sl">Pending</div></div>
          </div>
        )}

        <div style={{ display: 'grid', gap: 8 }}>
          {rumors.map(r => {
            const cc = r.credibilityScore >= 0.5 ? 'var(--green)' : r.credibilityScore <= -0.5 ? 'var(--red)' : 'var(--amber)';
            const daysElapsed = (Date.now() - r.createdAt) / MS_PER_DAY;
            const stabilized = r.totalVotes >= 10 && r.totalTrustWeight >= 2.0 && daysElapsed >= 7;
            return (
              <div key={r.id} className="crd" style={{ margin: 0, padding: 16, borderLeft: `3px solid ${cc}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{r.content}</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 12, color: 'var(--t3)' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 6, background: 'var(--cyan-s)', color: 'var(--cyan)', fontWeight: 700, fontSize: 11 }}>{r.category}</span>
                      <span>{r.totalVotes} votes</span>
                      <span>Weight: {typeof r.totalTrustWeight === 'number' ? r.totalTrustWeight.toFixed(1) : r.totalTrustWeight}</span>
                      <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: cc }}>CS: {r.credibilityScore >= 0 ? '+' : ''}{r.credibilityScore.toFixed(3)}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {r.resolution ? (
                      <span style={{
                        padding: '4px 12px', borderRadius: 8, fontWeight: 700, fontSize: 12,
                        background: r.resolution === 'true' ? 'var(--green-s)' : r.resolution === 'false' ? 'var(--red-s)' : 'var(--amber-s)',
                        color: r.resolution === 'true' ? 'var(--green)' : r.resolution === 'false' ? 'var(--red)' : 'var(--amber)',
                      }}>
                        {r.resolution === 'true' ? '✅ TRUE' : r.resolution === 'false' ? '❌ FALSE' : '❓ UNCERTAIN'}
                      </span>
                    ) : (
                      <>
                        {!stabilized && (
                          <span style={{ fontSize: 11, color: 'var(--t3)' }}>
                            Need: {Math.max(0, 10 - r.totalVotes)} more votes
                          </span>
                        )}
                        <button className="btn btn-sm btn-ghost" onClick={() => resolveRumor(r.id)}>
                          ⚡ Resolve
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {/* Stabilization progress */}
                {!r.resolution && (
                  <>
                    <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 11, color: 'var(--t3)' }}>
                      <span>Votes: <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: r.totalVotes >= 10 ? 'var(--green)' : 'var(--amber)' }}>{r.totalVotes}/10</span></span>
                      <span>Weight: <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: parseFloat(String(r.totalTrustWeight)) >= 2 ? 'var(--green)' : 'var(--amber)' }}>{typeof r.totalTrustWeight === 'number' ? r.totalTrustWeight.toFixed(1) : r.totalTrustWeight}/2.0</span></span>
                      <span>⏱️ {(() => {
                        const daysElapsed = (Date.now() - r.createdAt) / MS_PER_DAY;
                        const daysRemaining = Math.max(0, 7 - daysElapsed);
                        return daysElapsed >= 7 ? '✅ Window complete' : `${daysElapsed.toFixed(1)}d / 7d (${daysRemaining.toFixed(1)}d left)`;
                      })()}</span>
                      {stabilized && (() => {
                        const daysElapsed = (Date.now() - r.createdAt) / MS_PER_DAY;
                        return daysElapsed >= 7 && <span style={{ color: 'var(--green)', fontWeight: 700 }}>✅ Ready to resolve</span>;
                      })()}
                    </div>
                    <div style={{ marginTop: 8, height: 4, background: 'var(--bg)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, (Date.now() - r.createdAt) / (MS_PER_DAY * 7) * 100)}%`, height: '100%', background: (Date.now() - r.createdAt) / MS_PER_DAY >= 7 ? 'var(--green)' : 'var(--amber)', transition: 'width 0.3s' }} />
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── COLLUSION DETECTION ─── */}
      <div className="sec">
        <h2 style={{ fontSize: 18 }}>🔍 Collusion Detection Engine</h2>
        <p className="desc">
          Run the graph-based pattern analyzer. It builds a correlation graph between all user pairs 
          and flags anyone with {'>'}85% vote agreement across {'>'}20 shared rumors over {'>'}30 days.
        </p>
        <button className={`btn btn-o ${colBusy ? 'ld' : ''}`} onClick={runCollusion} disabled={colBusy}>
          {colBusy ? '⏳ Analyzing patterns…' : '🔍 Run Collusion Detection'}
        </button>

        {collusionResult && (
          <div className="result">
            <div className="stats">
              <div className="stat"><div className="sv" style={{ color: 'var(--blue)' }}>{collusionResult.totalEdges}</div><div className="sl">User Pairs Analyzed</div></div>
              <div className="stat"><div className="sv" style={{ color: 'var(--red)' }}>{collusionResult.flaggedEdges}</div><div className="sl">Flagged Pairs</div></div>
              <div className="stat"><div className="sv" style={{ color: 'var(--amber)' }}>{collusionResult.affectedUsers}</div><div className="sl">Users Penalized</div></div>
            </div>

            {collusionResult.clusters?.length > 0 ? (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--t3)', marginBottom: 8 }}>Detected Collusion Clusters:</div>
                {collusionResult.clusters.map((c: any, i: number) => (
                  <div key={i} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--bdr)', fontSize: 12, color: 'var(--t2)', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--mono)', color: 'var(--red)', minWidth: 90 }}>{c.pseudonym.slice(0, 10)}…</span>
                    <span>Penalty: <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--red)' }}>{(c.penalty * 100).toFixed(0)}%</span></span>
                    <span>Connected: <span style={{ fontFamily: 'var(--mono)', fontWeight: 700 }}>{c.connectedWith?.length || 0}</span> users</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="verdict ok" style={{ marginTop: 12 }}>
                <span style={{ fontSize: 20 }}>✅</span>
                <span>No collusion patterns detected. All user pairs have normal correlation levels ({'<'}85%) or insufficient shared rumors ({'<'}20).</span>
              </div>
            )}

            <div className="steps" style={{ marginTop: 12 }}>
              <div className="step"><span className="si">📊</span><span>Algorithm: Compare ALL user pairs across {collusionResult.totalEdges} interactions</span></div>
              <div className="step"><span className="si">🔍</span><span>Check 3 conditions: correlation {'>'} <span className="a hl">85%</span> + shared {'>'} <span className="a hl">20</span> + window {'>'} <span className="a hl">30d</span></span></div>
              <div className="step"><span className="si">⚡</span><span>Penalty: trust × <span className="r hl">0.6</span>, decay rate <span className="r hl">2×</span>. Reversible if pattern stops for 30 days.</span></div>
            </div>
          </div>
        )}
      </div>

      <div className="foot">
        <b>TruthChain</b> — System Dashboard<br />
        Team <b>Linear Transformation</b>
      </div>
    </div>
  );
}
