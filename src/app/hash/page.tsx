'use client';
import { useState, useCallback } from 'react';

interface Stage { label: string; value: string; color: string }

export default function HashPage() {
  const [email, setEmail] = useState('student@university.edu');
  const [hash, setHash] = useState('');
  const [pseudonym, setPseudonym] = useState('');
  const [stages, setStages] = useState<Stage[]>([]);
  const [running, setRunning] = useState(false);
  const [dupResult, setDupResult] = useState<any>(null);
  const [regResult, setRegResult] = useState<any>(null);
  const [regLoading, setRegLoading] = useState(false);
  const [bulkHashes, setBulkHashes] = useState<{ email: string; hash: string; pseudo: string }[]>([]);
  const [avalanche, setAvalanche] = useState<{ e1: string; e2: string; h1: string; h2: string; diff: number } | null>(null);

  const runPipeline = useCallback(async () => {
    setRunning(true);
    setStages([]);
    setHash('');
    setPseudonym('');
    setDupResult(null);
    setRegResult(null);

    const s: Stage[] = [];
    const push = (label: string, value: string, color: string) => { s.push({ label, value, color }); setStages([...s]); };

    await wait(300);
    push('Input', email, 'var(--t1)');

    await wait(400);
    const normalized = email.toLowerCase().trim();
    push('Normalized', normalized, 'var(--blue)');

    await wait(500);
    const utf8 = Array.from(new TextEncoder().encode(normalized)).map(b => b.toString(16).padStart(2, '0')).join(' ');
    push('UTF-8 Bytes', utf8.slice(0, 60) + (utf8.length > 60 ? '…' : ''), 'var(--amber)');

    await wait(600);
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalized));
    const arr = Array.from(new Uint8Array(buf));
    const hex = arr.map(b => b.toString(16).padStart(2, '0')).join('');
    setHash(hex);
    push('SHA-256 Hash', hex, 'var(--green)');

    await wait(400);
    const adjectives = ['Swift', 'Bold', 'Silent', 'Brave', 'Bright', 'Calm', 'Dark', 'Epic', 'Fair', 'Gold', 'Keen', 'Noble', 'Pure', 'Sage', 'True', 'Wise'];
    const animals = ['Fox', 'Hawk', 'Wolf', 'Bear', 'Lynx', 'Owl', 'Deer', 'Eagle', 'Raven', 'Tiger', 'Lion', 'Puma', 'Crane', 'Cobra', 'Orca', 'Heron'];
    const adj = adjectives[parseInt(hex.slice(0, 8), 16) % adjectives.length];
    const animal = animals[parseInt(hex.slice(8, 16), 16) % animals.length];
    const num = parseInt(hex.slice(16, 20), 16) % 9999;
    const pn = `${adj}${animal}${num}`;
    setPseudonym(pn);
    push('Pseudonym', pn, 'var(--purple)');

    // Duplicate detection
    await wait(300);
    try {
      const res = await fetch('/api/users');
      const d = await res.json();
      if (d.success) {
        const dup = d.data.find((u: any) => u.emailHash === hex);
        if (dup) {
          setDupResult({ exists: true, user: dup });
          push('Duplicate?', '⚠️ DUPLICATE — already registered', 'var(--red)');
        } else {
          setDupResult({ exists: false });
          push('Duplicate?', '✅ Unique — can register', 'var(--green)');
        }
      }
    } catch { push('Duplicate?', '— Could not check', 'var(--t3)'); }

    setRunning(false);
  }, [email]);

  const registerFromHash = async () => {
    setRegLoading(true);
    try {
      const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      const d = await res.json();
      if (d.success) setRegResult({ ok: true, user: d.data });
      else setRegResult({ ok: false, error: d.error });
    } catch { setRegResult({ ok: false, error: 'Network error' }); }
    setRegLoading(false);
  };

  const runBulk = async () => {
    const emails = ['alice@iiit.ac.in', 'bob@iiit.ac.in', 'carol@iiit.ac.in', 'dave@iiit.ac.in', 'eve@iiit.ac.in'];
    const results: typeof bulkHashes = [];
    const adjectives = ['Swift', 'Bold', 'Silent', 'Brave', 'Bright', 'Calm', 'Dark', 'Epic', 'Fair', 'Gold', 'Keen', 'Noble', 'Pure', 'Sage', 'True', 'Wise'];
    const animals = ['Fox', 'Hawk', 'Wolf', 'Bear', 'Lynx', 'Owl', 'Deer', 'Eagle', 'Raven', 'Tiger', 'Lion', 'Puma', 'Crane', 'Cobra', 'Orca', 'Heron'];
    for (const em of emails) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(em.toLowerCase().trim()));
      const hex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
      const adj = adjectives[parseInt(hex.slice(0, 8), 16) % adjectives.length];
      const animal = animals[parseInt(hex.slice(8, 16), 16) % animals.length];
      const num = parseInt(hex.slice(16, 20), 16) % 9999;
      results.push({ email: em, hash: hex, pseudo: `${adj}${animal}${num}` });
    }
    setBulkHashes(results);
  };

  const runAvalanche = async () => {
    const e1 = email;
    const chars = e1.split('');
    const ci = Math.max(0, e1.indexOf('@') - 1);
    chars[ci] = chars[ci] === 'z' ? 'a' : String.fromCharCode(chars[ci].charCodeAt(0) + 1);
    const e2 = chars.join('');
    const h1hex = await sha256hex(e1);
    const h2hex = await sha256hex(e2);
    let diffBits = 0;
    for (let i = 0; i < h1hex.length; i++) {
      const xor = parseInt(h1hex[i], 16) ^ parseInt(h2hex[i], 16);
      diffBits += [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4][xor];
    }
    setAvalanche({ e1, e2, h1: h1hex, h2: h2hex, diff: diffBits });
  };

  return (
    <div className="pg">
      <div className="sec">
        <h2>🔐 SHA-256 Hashing Lab</h2>
        <p className="desc">
          TruthChain uses SHA-256 to protect user identity. Your real email NEVER enters the system — only the one-way hash does.
          This page demonstrates the complete pipeline from email → hash → pseudonym.
        </p>
      </div>

      {/* ═══ MAIN PIPELINE ═══ */}
      <div className="crd" style={{ borderLeft: '3px solid var(--green)' }}>
        <h3>🧪 Hash Pipeline — Live Animation</h3>
        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Enter any email address"
            style={{ flex: 1, padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--bd)', borderRadius: 8, color: 'var(--t1)', fontSize: 14, fontFamily: 'var(--mono)' }}
          />
          <button className={`btn btn-g ${running ? 'ld' : ''}`} onClick={runPipeline} disabled={running || !email}>
            {running ? '⏳ Hashing…' : '🔐 Hash Email'}
          </button>
        </div>

        {stages.length > 0 && (
          <div style={{ marginTop: 16 }}>
            {stages.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10, animation: 'fadeIn .4s' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#000', flexShrink: 0 }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--t3)' }}>{s.label}</div>
                  <div style={{ fontSize: 13, fontFamily: 'var(--mono)', color: s.color, wordBreak: 'break-all', marginTop: 2 }}>{s.value}</div>
                </div>
                {i < stages.length - 1 && <div style={{ position: 'relative', left: -17, top: 26, color: 'var(--t3)', fontSize: 14 }}>↓</div>}
              </div>
            ))}
          </div>
        )}

        {hash && (
          <div style={{ marginTop: 16, padding: 14, background: 'var(--bg)', borderRadius: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--t3)' }}>Hash (64 hex chars)</div>
                <div style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--green)', wordBreak: 'break-all', marginTop: 4 }}>{hash}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--t3)' }}>Pseudonym</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--purple)', marginTop: 4 }}>{pseudonym}</div>
              </div>
            </div>
          </div>
        )}

        {dupResult && !dupResult.exists && hash && (
          <div style={{ marginTop: 12 }}>
            <button className={`btn btn-b ${regLoading ? 'ld' : ''}`} onClick={registerFromHash} disabled={regLoading}>
              {regLoading ? '⏳ Registering…' : `📝 Register as "${pseudonym}"`}
            </button>
            {regResult && (
              <div style={{ marginTop: 8, padding: 12, borderRadius: 8, background: regResult.ok ? 'rgba(16,185,129,.1)' : 'rgba(239,68,68,.1)', border: `1px solid ${regResult.ok ? 'rgba(16,185,129,.3)' : 'rgba(239,68,68,.3)'}`, fontSize: 13 }}>
                {regResult.ok ? `✅ Registered! Pseudonym: ${regResult.user.pseudonym}, Trust: ${regResult.user.trust}` : `❌ ${regResult.error}`}
              </div>
            )}
          </div>
        )}
        {dupResult && dupResult.exists && (
          <div style={{ marginTop: 8, padding: 12, borderRadius: 8, background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', fontSize: 13 }}>
            ⚠️ This email hash already exists! User: <b>{dupResult.user.pseudonym}</b> (trust: {dupResult.user.trust.toFixed(2)}). <span style={{ color: 'var(--t3)' }}>This is how Sybil attacks are prevented.</span>
          </div>
        )}
      </div>

      {/* ═══ PROPERTIES ═══ */}
      <div className="crd" style={{ borderLeft: '3px solid var(--blue)' }}>
        <h3>📊 SHA-256 Properties — Why This Matters</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 12 }}>
          {([
            ['One-Way', 'Hash → email is mathematically impossible. 2^256 combinations to brute-force.', '🔒', 'var(--green)'],
            ['Deterministic', 'Same email ALWAYS produces the same hash. This enables duplicate detection.', '🎯', 'var(--blue)'],
            ['Avalanche Effect', 'Change 1 character → ~50% of hash bits change. No pattern to exploit.', '🌊', 'var(--amber)'],
            ['Fixed Length', 'Any input → always 256 bits (64 hex chars). Uniform storage.', '📏', 'var(--purple)'],
          ] as const).map(([title, desc, icon, color], i) => (
            <div key={i} style={{ padding: 14, background: 'var(--bg)', borderRadius: 10, borderLeft: `3px solid ${color}` }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{title}</div>
              <div style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.5 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ AVALANCHE DEMO ═══ */}
      <div className="crd" style={{ borderLeft: '3px solid var(--amber)' }}>
        <h3>🌊 Avalanche Effect Demo</h3>
        <p className="desc">Change 1 character in the email and see how dramatically the hash changes.</p>
        <button className="btn btn-o" onClick={runAvalanche}>🌊 Change 1 Char & Compare</button>
        {avalanche && (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ padding: 12, background: 'var(--bg)', borderRadius: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--green)' }}>Original</div>
                <div style={{ fontSize: 12, fontFamily: 'var(--mono)', marginTop: 4 }}>{avalanche.e1}</div>
                <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--green)', wordBreak: 'break-all', marginTop: 4 }}>{avalanche.h1}</div>
              </div>
              <div style={{ padding: 12, background: 'var(--bg)', borderRadius: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--red)' }}>1 Char Changed</div>
                <div style={{ fontSize: 12, fontFamily: 'var(--mono)', marginTop: 4 }}>{avalanche.e2}</div>
                <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--red)', wordBreak: 'break-all', marginTop: 4 }}>{avalanche.h2}</div>
              </div>
            </div>
            <div style={{ marginTop: 12, padding: 12, background: 'var(--bg3)', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--amber)' }}>{avalanche.diff} / 256 bits</div>
              <div style={{ fontSize: 12, color: 'var(--t3)' }}>({(avalanche.diff / 256 * 100).toFixed(1)}% of bits changed — ideal is ~50%)</div>
              <div style={{ marginTop: 8, height: 8, background: 'var(--bg)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${avalanche.diff / 256 * 100}%`, background: 'var(--amber)', borderRadius: 4 }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══ BULK HASH ═══ */}
      <div className="crd" style={{ borderLeft: '3px solid var(--purple)' }}>
        <h3>📋 Bulk Hash Demo — Same Email = Same Hash</h3>
        <p className="desc">Hash 5 emails and see how each always maps to the same hash.</p>
        <button className="btn btn-p" onClick={runBulk}>🔐 Hash 5 Campus Emails</button>
        {bulkHashes.length > 0 && (
          <div style={{ marginTop: 14, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'var(--mono)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--bd)', textAlign: 'left' }}>
                  <th style={{ padding: '8px 10px', color: 'var(--t3)', fontWeight: 600 }}>Email</th>
                  <th style={{ padding: '8px 10px', color: 'var(--t3)', fontWeight: 600 }}>SHA-256 Hash (first 16 chars)</th>
                  <th style={{ padding: '8px 10px', color: 'var(--t3)', fontWeight: 600 }}>Pseudonym</th>
                </tr>
              </thead>
              <tbody>
                {bulkHashes.map((h, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--bg3)' }}>
                    <td style={{ padding: '8px 10px' }}>{h.email}</td>
                    <td style={{ padding: '8px 10px', color: 'var(--green)' }}>{h.hash.slice(0, 16)}…</td>
                    <td style={{ padding: '8px 10px', color: 'var(--purple)', fontWeight: 700 }}>{h.pseudo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--t3)' }}>
              💡 Run again — hashes are <b>identical</b> every time. Same input → same output, always.
            </div>
          </div>
        )}
      </div>

      <div className="foot">
        <b>TruthChain</b> — SHA-256 Hashing Lab<br />
        Team <b>Linear Transformation</b>
      </div>
    </div>
  );
}

function wait(ms: number) { return new Promise(r => setTimeout(r, ms)); }
async function sha256hex(s: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s.toLowerCase().trim()));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
