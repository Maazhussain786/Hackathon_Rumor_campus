import Link from 'next/link';

export default function Home() {
  return (
    <div className="pg">
      {/* ─── HERO ─── */}
      <div className="hero">
        <div className="hero-badge">
          <span className="dot" />
          Team Linear Transformation · Hackathon 2026
        </div>
        <h1>TruthChain</h1>
        <p>
          Decentralized campus rumor verification — where cryptographic identity, 
          trust-weighted consensus, and game theory defeat manipulation.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 28 }}>
          <Link href="/rumors" className="btn btn-b" style={{ padding: '12px 28px', fontSize: 14 }}>
            📢 Try the Demo
          </Link>
          <Link href="/dashboard" className="btn btn-ghost" style={{ padding: '12px 28px', fontSize: 14 }}>
            📊 View Dashboard
          </Link>
        </div>
      </div>

      {/* ─── FEATURE CARDS ─── */}
      <div className="home-grid">
        <Link href="/dashboard" className="home-card" style={{ borderLeft: '4px solid var(--purple)' }}>
          <div className="hc-icon">📊</div>
          <div className="hc-title">Live System Dashboard</div>
          <div className="hc-desc">Real-time metrics: trust distribution, rumor resolution stats, collusion detection status, and attacks blocked. Full system transparency.</div>
          <span className="hc-tag" style={{ background: 'var(--purple-s)', color: 'var(--purple)' }}>Live Metrics →</span>
        </Link>

        <Link href="/rumors" className="home-card" style={{ borderLeft: '4px solid var(--blue)' }}>
          <div className="hc-icon">📢</div>
          <div className="hc-title">Post & Vote on Rumors</div>
          <div className="hc-desc">Submit anonymous campus rumors. Vote true or false. Watch credibility scores update in real-time based on WHO votes, not just how many.</div>
          <span className="hc-tag" style={{ background: 'var(--blue-s)', color: 'var(--blue)' }}>Interactive Demo →</span>
        </Link>

        <Link href="/hash" className="home-card" style={{ borderLeft: '4px solid var(--green)' }}>
          <div className="hc-icon">🔐</div>
          <div className="hc-title">SHA-256 Hashing Lab</div>
          <div className="hc-desc">Watch emails transform into irreversible hashes in real-time. See the one-way function that protects identity and blocks Sybil attacks.</div>
          <span className="hc-tag" style={{ background: 'var(--green-s)', color: 'var(--green)' }}>Live Animation →</span>
        </Link>

        <Link href="/simulate" className="home-card" style={{ borderLeft: '4px solid var(--red)' }}>
          <div className="hc-icon">⚔️</div>
          <div className="hc-title">Attack Simulations</div>
          <div className="hc-desc">Try to break the system: Sybil bots, mob voting, friend collusion, trust farming, and Nash equilibrium proof. Watch each attack fail.</div>
          <span className="hc-tag" style={{ background: 'var(--red-s)', color: 'var(--red)' }}>5 Attack Types →</span>
        </Link>
      </div>

      {/* ─── HOW IT WORKS ─── */}
      <div className="sec" style={{ marginTop: 16 }}>
        <h2>🧠 How TruthChain Works</h2>
        <p className="desc">Four mathematical layers ensure truth emerges without moderators:</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {([
            ['🔑', 'Cryptographic Identity', 'Campus email → SHA-256 hash. We never see your email. One email = one pseudonym forever. Complete anonymity with accountability.', 'var(--cyan)'],
            ['⚖️', 'Dynamic Trust Scoring', 'Correct votes: +0.1 trust. Wrong: -0.15. Inactivity: -5%/month. Range [0.1, 10.0]. Liars destroy themselves mathematically.', 'var(--amber)'],
            ['📊', 'Trust-Weighted Consensus', 'Vote weight = √(trust). Diminishing returns prevent domination. 50 bots can\'t outweigh 10 experts. Quality beats quantity.', 'var(--green)'],
            ['🛡️', 'Multi-Layer Defense', 'SHA-256 blocks bots. Graph analysis catches collusion (>85% correlation). Nash equilibrium proves lying costs 10× more than honesty.', 'var(--red)'],
          ] as const).map(([icon, title, desc, color], i) => (
            <div key={i} className="crd" style={{ borderLeft: `3px solid ${color}`, margin: 0 }}>
              <h3>{icon} {title}</h3>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ─── 10 PROBLEMS ─── */}
      <div className="sec">
        <h2>🎯 10 Problems Solved</h2>
        <p className="desc">Each problem has a mathematical solution with formal guarantees:</p>
        <div style={{ display: 'grid', gap: 2 }}>
          {([
            ['Anonymous but Accountable', 'ECDSA keys + SHA-256 email hashing — no PII stored, unique pseudonyms'],
            ['No Central Moderator', 'Truth emerges from trust-weighted consensus, not human judgment'],
            ['Bot/Sybil Prevention', 'One campus email = one hash = one account. Duplicates instantly blocked'],
            ['Double Voting Blocked', 'Cryptographic signatures make repeat voting impossible'],
            ['Popularity ≠ Truth', 'Vote weight = √trust — 50 bots can\'t outweigh 10 experts'],
            ['Fair Trust Scoring', 'Correct: +0.1 | Wrong: -0.15 | Asymmetric penalty deters lying'],
            ['Temporal Stability', 'Trust decays 5%/month without activity — no stale authority'],
            ['Collusion Resistance', 'Graph analysis: >85% correlation + >20 shared rumors = flagged & penalized'],
            ['Deleted Rumor Safety', 'Stabilization gates (≥10 votes, ≥2.0 weight, 7 days) prevent trust farming'],
            ['Mathematical Proof', 'Nash equilibrium: honesty is the strictly dominant strategy'],
          ] as const).map(([title, desc], i) => (
            <div key={i} style={{ display: 'flex', gap: 14, padding: '12px 0', borderBottom: '1px solid var(--bdr)', alignItems: 'baseline' }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--blue)', minWidth: 28, fontWeight: 800 }}>{String(i + 1).padStart(2, '0')}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{title}</div>
                <div style={{ fontSize: 13, color: 'var(--t2)' }}>{desc}</div>
              </div>
              <span style={{ marginLeft: 'auto', color: 'var(--green)', fontSize: 14 }}>✓</span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── CORE FORMULAS ─── */}
      <div className="sec">
        <h2>📐 Core Mathematical Formulas</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          <div className="crd" style={{ borderLeft: '3px solid var(--cyan)', margin: 0 }}>
            <h3>Trust Update</h3>
            <div className="formula">T_new = T_old + α × (accuracy - β) × e^(-λΔt){'\n'}α = 0.1, β = 0.05, λ = 0.01</div>
            <p style={{ fontSize: 11, color: 'var(--t3)', marginTop: 6 }}>⏱️ Δt = days since rumor — early votes get full rewards</p>
          </div>
          <div className="crd" style={{ borderLeft: '3px solid var(--green)', margin: 0 }}>
            <h3>Credibility Score</h3>
            <div className="formula">CS = Σ(√trust_i × vote_i) / Σ(√trust_i){'\n'}CS ∈ [-1, 1]</div>
          </div>
          <div className="crd" style={{ borderLeft: '3px solid var(--amber)', margin: 0 }}>
            <h3>7-Day Stabilization</h3>
            <div className="formula">Trust updates ONLY if:{'\n'}✓ ≥10 votes{'\n'}✓ ≥2.0 trust weight{'\n'}✓ 7-day window complete</div>
            <p style={{ fontSize: 11, color: 'var(--t3)', marginTop: 6 }}>🛡️ Blocks trust farming via deleted rumors</p>
          </div>
          <div className="crd" style={{ borderLeft: '3px solid var(--purple)', margin: 0 }}>
            <h3>Nash Equilibrium</h3>
            <div className="formula">U_honest  = n × 0.03  (gains){'\n'}U_dishonest = n × -0.31 (losses){'\n'}Ratio: 10.3× — lying never pays</div>
          </div>
          <div className="crd" style={{ borderLeft: '3px solid var(--red)', margin: 0 }}>
            <h3>Collusion Detection</h3>
            <div className="formula">IF correlation {'>'} 85%{'\n'}AND shared_rumors {'>'} 20{'\n'}AND window {'>'} 30 days{'\n'}THEN penalty = 0.6× weight</div>
          </div>
          <div className="crd" style={{ borderLeft: '3px solid var(--blue)', margin: 0 }}>
            <h3>Inactivity Decay</h3>
            <div className="formula">IF inactive {'>'} 30 days:{'\n'}T_new = T_old × 0.95^months{'\n'}(5% trust loss per month)</div>
            <p style={{ fontSize: 11, color: 'var(--t3)', marginTop: 6 }}>⏰ Prevents stale authority accumulation</p>
          </div>
        </div>
      </div>

      {/* ─── TECH STACK ─── */}
      <div className="sec">
        <h2>🛠️ Technology Stack</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          {([
            ['Frontend', 'React + TypeScript + Next.js', 'Type-safe UI with server-side rendering', 'var(--blue)'],
            ['Crypto Layer', 'ECDSA + SHA-256 + Web Crypto API', 'Client-side key generation, zero PII storage', 'var(--green)'],
            ['Backend', 'Node.js + Next.js API Routes', 'Non-blocking I/O for 1000+ concurrent users', 'var(--purple)'],
            ['Blockchain (Production)', 'Ethereum/Polygon + Solidity', 'Immutable trust ledger at $0.001/transaction', 'var(--orange)'],
            ['Storage (Production)', 'IPFS + Neo4j + MongoDB + Redis', 'Decentralized content + graph DB for trust', 'var(--cyan)'],
            ['ML Analytics', 'Pattern detection + TensorFlow', 'Bot detection via behavioral analysis', 'var(--pink)'],
          ] as const).map(([title, tech, desc, color], i) => (
            <div key={i} className="crd" style={{ borderLeft: `3px solid ${color}`, margin: 0 }}>
              <h3 style={{ color }}>{title}</h3>
              <p style={{ fontWeight: 700, color: 'var(--t1)', marginBottom: 4 }}>{tech}</p>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="foot">
        <b>TruthChain</b> — Decentralized Campus Rumor Verification System<br />
        Team <b>Linear Transformation</b> · February 2026 Hackathon<br />
        <span style={{ fontSize: 11 }}>10/10 problems solved · Mathematical guarantees · Zero central authority</span>
      </div>
    </div>
  );
}
