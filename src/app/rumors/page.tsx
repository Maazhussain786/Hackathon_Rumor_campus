'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

interface U { pseudonymId: string; trustScore: number; totalVotes: number; correctVotes: number; incorrectVotes: number; flaggedForCollusion: boolean; emailHash: string; }
interface R { id: string; authorPseudonym: string; content: string; category: string; createdAt: number; status: string; credibilityScore: number; totalVotes: number; totalTrustWeight: number; resolution: string | null; tags: string[]; voteBreakdown: { trueVotes: number; falseVotes: number; totalTrustWeight: string; }; voters: string[]; }
interface T { msg: string; ok: boolean; id: number; }

const NAMES = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank', 'Grace', 'Hank', 'Ivy', 'Jake'];
const ROLES = ['Veteran Reporter', 'Active Contributor', 'Regular User', 'New User', 'Skeptic', 'Trusted Expert', 'Consistent Voter', 'Newcomer', 'Moderate User', 'Sybil Suspect'];

export default function RumorsPage() {
  const [users, setUsers] = useState<U[]>([]);
  const [rumors, setRumors] = useState<R[]>([]);
  const [uid, setUid] = useState('');
  const [toasts, setToasts] = useState<T[]>([]);
  const [newR, setNewR] = useState('');
  const [newCat, setNewCat] = useState('General');
  const [newImg, setNewImg] = useState('');
  const [images, setImages] = useState<Record<string, string>>({});
  const [simRumor, setSimRumor] = useState('');
  const [simResult, setSimResult] = useState<any>(null);
  const [simBusy, setSimBusy] = useState(false);
  const [votingId, setVotingId] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [regBusy, setRegBusy] = useState(false);
  const [trustChanges, setTrustChanges] = useState<Record<string, { old: number; new_: number; diff: number }>>({});
  const [tab, setTab] = useState<'feed' | 'lab' | 'users'>('feed');
  const initRef = useRef(false);

  const toast = useCallback((msg: string, ok = true) => {
    const id = Date.now() + Math.random();
    setToasts(p => [...p, { msg, ok, id }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  }, []);

  const load = useCallback(async () => {
    try {
      const [u, r] = await Promise.all([
        fetch('/api/users').then(x => x.json()),
        fetch('/api/rumors').then(x => x.json()),
      ]);
      if (u.success) {
        setUsers(u.data);
        if (!initRef.current && u.data.length) {
          setUid(u.data[0].pseudonymId);
          initRef.current = true;
        }
      }
      if (r.success) setRumors(r.data);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (rumors.length && !simRumor) setSimRumor(rumors[0].id); }, [rumors, simRumor]);

  const me = users.find(u => u.pseudonymId === uid);
  const tc = (t: number) => t >= 2 ? 'var(--green)' : t >= 0.5 ? 'var(--amber)' : 'var(--red)';
  const cc = (cs: number) => cs >= 0.5 ? 'var(--green)' : cs <= -0.5 ? 'var(--red)' : 'var(--amber)';

  const handleImg = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => setNewImg(ev.target?.result as string);
    reader.readAsDataURL(f);
  };

  const register = async () => {
    if (!newEmail.trim() || !newEmail.includes('@')) { toast('Enter a valid email (e.g. name@campus.edu)', false); return; }
    setRegBusy(true);
    try {
      const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: newEmail.trim() }) });
      const d = await res.json();
      if (d.success) {
        toast(`Account created! Pseudonym: ${d.data.pseudonymId.slice(0, 10)}… | Trust: ${d.data.trustScore}`);
        setNewEmail('');
        setUid(d.data.pseudonymId);
        await load();
      } else toast(d.error, false);
    } catch { toast('Network error', false); }
    setRegBusy(false);
  };

  const post = async () => {
    if (!uid || !newR.trim()) { toast('Select an identity and type your rumor', false); return; }
    try {
      const res = await fetch('/api/rumors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pseudonymId: uid, content: newR, category: newCat, tags: [] }) });
      const d = await res.json();
      if (d.success) {
        const rid = d.data?.id;
        if (newImg && rid) setImages(p => ({ ...p, [rid]: newImg }));
        toast('Rumor posted anonymously!');
        setNewR(''); setNewImg('');
        await load();
      } else toast(d.error, false);
    } catch { toast('Network error', false); }
  };

  const vote = async (rid: string, dir: 1 | -1) => {
    if (!uid) { toast('Pick a user identity first', false); return; }
    setVotingId(rid + dir);
    try {
      const res = await fetch('/api/votes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pseudonymId: uid, rumorId: rid, direction: dir }) });
      const d = await res.json();
      if (d.success) {
        const cs = d.data.updatedCredibilityScore;
        const tc = d.data.trustChange;
        if (tc) {
          setTrustChanges(p => ({ ...p, [uid]: { old: tc.old, new_: tc.new_, diff: tc.new_ - tc.old } }));
          setTimeout(() => setTrustChanges(p => { const c = { ...p }; delete c[uid]; return c; }), 5000);
        }
        const weight = Math.sqrt(d.data.updatedUser?.trustScore ?? 0);
        toast(`Vote recorded! CS → ${cs.toFixed(3)} | Trust: ${d.data.updatedUser?.trustScore.toFixed(3)} | Weight: ${weight.toFixed(3)}${tc ? ` | ${tc.reason}` : ''}`);
        await load();
      } else toast(d.error, false);
    } catch { toast('Network error', false); }
    setVotingId('');
  };

  const simVote = async (pattern: string) => {
    if (!simRumor) return;
    setSimBusy(true);
    try {
      const res = await fetch('/api/simulate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'bulk_vote', params: { rumorId: simRumor, pattern } }) });
      const d = await res.json();
      if (d.success) { setSimResult(d.data); await load(); }
      else toast(d.error, false);
    } catch { toast('Network error', false); }
    setSimBusy(false);
  };

  return (
    <div className="pg">
      {/* ─── HEADER ─── */}
      <div className="sec">
        <h2>📢 Campus Rumors</h2>
        <p className="desc">Post anonymous rumors. Vote on them. Watch trust-weighted consensus determine truth — it&apos;s not about how many vote, it&apos;s about WHO votes.</p>
      </div>

      {/* ─── IDENTITY PANEL ─── */}
      <div className="usel">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <label>🔑 Your Identity</label>
          <select value={uid} onChange={e => setUid(e.target.value)} style={{ flex: 1, minWidth: 200 }}>
            {users.map((u, i) => (
              <option key={u.pseudonymId} value={u.pseudonymId}>
                {i < NAMES.length ? NAMES[i] : `User ${u.pseudonymId.slice(0, 8)}`} — Trust {u.trustScore.toFixed(2)}{u.flaggedForCollusion ? ' ⚠️' : ''}
              </option>
            ))}
          </select>
        </div>

        {me && (
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', fontSize: 13 }}>
            <span>Trust: <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: tc(me.trustScore) }}>{me.trustScore.toFixed(3)}</span></span>
            <span>Weight: <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--cyan)' }}>√{me.trustScore.toFixed(2)} = {Math.sqrt(me.trustScore).toFixed(3)}</span></span>
            <span>Votes: <span style={{ fontFamily: 'var(--mono)', fontWeight: 700 }}>{me.totalVotes}</span></span>
            <span>Accuracy: <span style={{ fontFamily: 'var(--mono)', fontWeight: 700 }}>{me.totalVotes > 0 ? `${Math.round(me.correctVotes / me.totalVotes * 100)}%` : '—'}</span></span>
            {me.flaggedForCollusion && <span style={{ color: 'var(--red)', fontWeight: 700 }}>⚠️ Collusion Flagged</span>}
            {trustChanges[uid] && (
              <span style={{
                padding: '3px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, fontFamily: 'var(--mono)',
                background: trustChanges[uid].diff > 0 ? 'var(--green-s)' : 'var(--red-s)',
                color: trustChanges[uid].diff > 0 ? 'var(--green)' : 'var(--red)',
                animation: 'popIn .3s ease',
              }}>
                Trust: {trustChanges[uid].old.toFixed(3)} → {trustChanges[uid].new_.toFixed(3)} ({trustChanges[uid].diff > 0 ? '+' : ''}{trustChanges[uid].diff.toFixed(3)})
              </span>
            )}
          </div>
        )}

        {/* Register */}
        <div style={{ borderTop: '1px solid var(--bdr)', paddingTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--t3)' }}>➕ Register New Account</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              placeholder="yourname@campus.edu"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && register()}
              style={{ flex: 1, padding: '8px 12px', background: 'var(--bg3)', border: '1px solid var(--bdr)', borderRadius: 8, color: 'var(--t1)', fontFamily: 'var(--mono)', fontSize: 12, outline: 'none' }}
            />
            <button className="btn btn-sm btn-b" onClick={register} disabled={regBusy || !newEmail.includes('@')}>
              {regBusy ? '⏳' : '🔑'} Register
            </button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>Email → SHA-256 hash → unique pseudonym. New accounts start at trust 0.2.</div>
        </div>
      </div>

      {/* ─── TABS ─── */}
      <div className="tabs">
        <button className={`tab ${tab === 'feed' ? 'active' : ''}`} onClick={() => setTab('feed')}>🗳️ Rumor Feed</button>
        <button className={`tab ${tab === 'lab' ? 'active' : ''}`} onClick={() => setTab('lab')}>🧪 Voting Lab</button>
        <button className={`tab ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>👥 All Users ({users.length})</button>
      </div>

      {/* ═══════════ TAB: FEED ═══════════ */}
      {tab === 'feed' && (
        <>
          {/* Post rumor */}
          <div className="crd" style={{ borderLeft: '3px solid var(--blue)', marginBottom: 20 }}>
            <h3>✏️ Post a New Rumor</h3>
            <div className="irow" style={{ marginTop: 10 }}>
              <input placeholder="What's the rumor on campus?" value={newR} onChange={e => setNewR(e.target.value)} onKeyDown={e => e.key === 'Enter' && post()} style={{ flex: 2 }} />
              <select value={newCat} onChange={e => setNewCat(e.target.value)} style={{ maxWidth: 160 }}>
                <option>General</option>
                <option>Campus Services</option>
                <option>Academics</option>
                <option>Events</option>
                <option>Technology</option>
                <option>Infrastructure</option>
              </select>
              <button className="btn btn-b" onClick={post} disabled={!newR.trim()}>📤 Post</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <label className="btn btn-sm btn-ghost" style={{ cursor: 'pointer' }}>
                📎 Attach Proof
                <input type="file" accept="image/*" onChange={handleImg} style={{ display: 'none' }} />
              </label>
              {newImg && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <img src={newImg} alt="proof" style={{ height: 48, borderRadius: 6, border: '1px solid var(--bdr)' }} />
                  <button className="btn btn-sm btn-ghost" onClick={() => setNewImg('')}>✕</button>
                </div>
              )}
            </div>
          </div>

          {/* Rumor feed */}
          {rumors.map(r => {
            const voted = r.voters?.includes(uid) || false;
            const authored = r.authorPseudonym === uid;
            const canVote = r.status === 'pending' && !voted && !authored;
            const daysElapsed = (Date.now() - r.createdAt) / 60_000; // 1 min = 1 day
            const daysRemaining = Math.max(0, 7 - daysElapsed);
            const timeProgress = Math.min(100, (daysElapsed / 7) * 100);

            return (
              <div key={r.id} className="rumor" style={{ borderLeft: `3px solid ${authored ? 'var(--blue)' : voted ? 'var(--green)' : 'var(--bdr)'}` }}>
                <div className="rt">{r.content}</div>
                {images[r.id] && <img src={images[r.id]} alt="proof" className="proof-img" />}
                <div className="rm">
                  <span className="chip" style={{ background: 'var(--cyan-s)', color: 'var(--cyan)' }}>{r.category}</span>
                  <span>{r.totalVotes} votes</span>
                  <span style={{ fontSize: 11 }}>Weight: {typeof r.totalTrustWeight === 'string' ? r.totalTrustWeight : Number(r.totalTrustWeight).toFixed(2)}</span>
                  <span style={{ fontSize: 11, color: daysElapsed >= 7 ? 'var(--green)' : 'var(--amber)', fontWeight: 600 }}>
                    ⏱️ {daysElapsed >= 7 ? '✅ Ready' : `${daysElapsed.toFixed(1)}d/7d`}
                  </span>
                  <div className="cs-bar"><div className="cs-fill" style={{ width: `${(r.credibilityScore + 1) / 2 * 100}%`, background: cc(r.credibilityScore) }} /></div>
                  <span className="cs-num" style={{ color: cc(r.credibilityScore) }}>{r.credibilityScore >= 0 ? '+' : ''}{r.credibilityScore.toFixed(3)}</span>
                  {r.resolution && (
                    <span className="chip" style={{
                      background: r.resolution === 'true' ? 'var(--green-s)' : r.resolution === 'false' ? 'var(--red-s)' : 'var(--amber-s)',
                      color: r.resolution === 'true' ? 'var(--green)' : r.resolution === 'false' ? 'var(--red)' : 'var(--amber)',
                    }}>{r.resolution === 'true' ? '✅ TRUE' : r.resolution === 'false' ? '❌ FALSE' : '❓ UNCERTAIN'}</span>
                  )}
                </div>
                <div style={{ marginTop: 6, height: 3, background: 'var(--bg)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${timeProgress}%`, height: '100%', background: timeProgress >= 100 ? 'var(--green)' : 'var(--amber)', transition: 'width 0.3s' }} />
                </div>

                <div style={{ display: 'flex', gap: 6, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  {authored && <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, background: 'var(--blue-s)', color: 'var(--blue)', fontWeight: 700 }}>📝 You authored this</span>}
                  {voted && <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, background: 'var(--green-s)', color: 'var(--green)', fontWeight: 700 }}>✅ Already voted</span>}
                  {canVote && (
                    <div className="vr" style={{ margin: 0 }}>
                      <button className="vt" onClick={() => vote(r.id, 1)} disabled={!!votingId}>✅ True ({r.voteBreakdown.trueVotes})</button>
                      <button className="vf" onClick={() => vote(r.id, -1)} disabled={!!votingId}>❌ False ({r.voteBreakdown.falseVotes})</button>
                    </div>
                  )}
                  {r.status !== 'pending' && !voted && !authored && <span style={{ fontSize: 11, color: 'var(--t3)' }}>Voting closed</span>}
                </div>
              </div>
            );
          })}

          {/* How trust works */}
          <div className="crd" style={{ borderLeft: '3px solid var(--green)', marginTop: 20 }}>
            <h3>📊 How Trust Updates Work</h3>
            <div className="steps">
              <div className="step"><span className="si">📈</span><span><b>Correct vote:</b> Trust ↑ by <span className="g hl">+0.1</span> × time factor</span></div>
              <div className="step"><span className="si">📉</span><span><b>Wrong vote:</b> Trust ↓ by <span className="r hl">-0.15</span> × time factor (50% harsher)</span></div>
              <div className="step"><span className="si">⏰</span><span><b>Inactivity:</b> Trust decays <span className="a hl">-5%/month</span></span></div>
              <div className="step"><span className="si">⚖️</span><span><b>Vote weight</b> = <span className="p hl">√trust</span> — diminishing returns prevent domination</span></div>
              <div className="step"><span className="si">🎯</span><span><b>Resolution:</b> Requires ≥10 votes + ≥2.0 trust weight + 7 day window</span></div>
            </div>
          </div>
        </>
      )}

      {/* ═══════════ TAB: LAB ═══════════ */}
      {tab === 'lab' && (
        <div className="sec">
          <h2 style={{ fontSize: 18 }}>🧪 Voting Simulation Lab</h2>
          <p className="desc">Pick a rumor, then simulate batches of synthetic votes. Watch how trust weighting affects the credibility score in real-time.</p>

          <select
            value={simRumor}
            onChange={e => { setSimRumor(e.target.value); setSimResult(null); }}
            style={{ width: '100%', padding: 10, background: 'var(--bg2)', border: '1px solid var(--bdr)', borderRadius: 10, color: 'var(--t1)', fontFamily: 'inherit', fontSize: 13, marginBottom: 14 }}
          >
            {rumors.map(r => <option key={r.id} value={r.id}>{r.content.slice(0, 60)}… (CS: {r.credibilityScore.toFixed(2)})</option>)}
          </select>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className={`btn btn-g ${simBusy ? 'ld' : ''}`} onClick={() => simVote('all_true')} disabled={simBusy}>✅ +5 True Votes</button>
            <button className={`btn btn-r ${simBusy ? 'ld' : ''}`} onClick={() => simVote('all_false')} disabled={simBusy}>❌ +5 False Votes</button>
            <button className={`btn btn-p ${simBusy ? 'ld' : ''}`} onClick={() => simVote('mixed')} disabled={simBusy}>🔀 +7 Mixed Votes</button>
          </div>

          {simResult && (
            <div className="result">
              <div className="ba">
                <div className="ba-box">
                  <div className="label" style={{ color: 'var(--t3)' }}>Before</div>
                  <div className="big" style={{ color: cc(simResult.before.credibilityScore) }}>
                    {simResult.before.credibilityScore >= 0 ? '+' : ''}{simResult.before.credibilityScore.toFixed(3)}
                  </div>
                  <div className="sm">{simResult.before.totalVotes} votes</div>
                </div>
                <div className="ba-arrow">→</div>
                <div className="ba-box">
                  <div className="label" style={{ color: 'var(--t3)' }}>After</div>
                  <div className="big" style={{ color: cc(simResult.after.credibilityScore) }}>
                    {simResult.after.credibilityScore >= 0 ? '+' : ''}{simResult.after.credibilityScore.toFixed(3)}
                  </div>
                  <div className="sm">{simResult.after.totalVotes} votes</div>
                </div>
              </div>

              {simResult.votesAdded?.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--t3)', marginBottom: 8 }}>Each Voter&apos;s Contribution:</div>
                  {simResult.votesAdded.map((v: any, i: number) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0', borderBottom: '1px solid var(--bdr)', fontSize: 12, color: 'var(--t2)' }}>
                      <span style={{ fontFamily: 'var(--mono)', color: 'var(--cyan)', minWidth: 80, fontSize: 11 }}>{v.pseudonym}…</span>
                      <span style={{ minWidth: 60 }}>Trust: <span style={{ fontFamily: 'var(--mono)', fontWeight: 700 }}>{v.trust.toFixed(2)}</span></span>
                      <span style={{ minWidth: 70 }}>Weight: <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--cyan)' }}>{v.weight.toFixed(3)}</span></span>
                      <span style={{ fontWeight: 700, color: v.direction === 1 ? 'var(--green)' : 'var(--red)' }}>
                        {v.direction === 1 ? '✅ TRUE' : '❌ FALSE'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══════════ TAB: USERS ═══════════ */}
      {tab === 'users' && (
        <div className="sec">
          <h2 style={{ fontSize: 18 }}>👥 All Registered Users ({users.length})</h2>
          <p className="desc">Click any row to switch to that identity. Each user has unique trust and voting power.</p>
          <div style={{ display: 'grid', gap: 4 }}>
            {users.map((u, i) => (
              <div
                key={u.pseudonymId}
                onClick={() => { setUid(u.pseudonymId); setTab('feed'); }}
                style={{
                  display: 'flex', gap: 12, alignItems: 'center', padding: '12px 16px',
                  background: u.pseudonymId === uid ? 'var(--bg3)' : 'var(--bg2)',
                  border: `1px solid ${u.pseudonymId === uid ? 'var(--blue)' : 'var(--bdr)'}`,
                  borderRadius: 10, cursor: 'pointer', transition: 'all .15s', flexWrap: 'wrap',
                }}
              >
                <span style={{ fontWeight: 700, minWidth: 70, fontSize: 14 }}>
                  {i < NAMES.length ? NAMES[i] : `User ${i + 1}`}
                </span>
                <span style={{ fontSize: 11, color: 'var(--t3)', minWidth: 110 }}>
                  {i < ROLES.length ? ROLES[i] : 'Custom Account'}
                </span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, minWidth: 80 }}>
                  Trust: <span style={{ fontWeight: 700, color: tc(u.trustScore) }}>{u.trustScore.toFixed(2)}</span>
                </span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, minWidth: 90 }}>
                  Weight: <span style={{ fontWeight: 700, color: 'var(--cyan)' }}>{Math.sqrt(u.trustScore).toFixed(3)}</span>
                </span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>Votes: {u.totalVotes}</span>
                {u.flaggedForCollusion && <span style={{ fontSize: 11, color: 'var(--red)', fontWeight: 700 }}>⚠️ Flagged</span>}
                {u.pseudonymId === uid && <span style={{ fontSize: 11, color: 'var(--blue)', fontWeight: 700 }}>← Active</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TOASTS ─── */}
      <div className="toast-w">
        {toasts.map(t => <div key={t.id} className={`toast ${t.ok ? 'tok' : 'terr'}`}>{t.ok ? '✅' : '❌'} {t.msg}</div>)}
      </div>

      <div className="foot">
        <b>TruthChain</b> — Campus Rumor Verification<br />
        Team <b>Linear Transformation</b>
      </div>
    </div>
  );
}
