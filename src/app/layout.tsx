import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'TruthChain — Decentralized Campus Rumor Verification',
  description: 'Anonymous rumor verification with cryptographic identity, trust-weighted consensus, and game-theoretic security. By Team Linear Transformation.',
  keywords: ['decentralized', 'rumor verification', 'trust scoring', 'anonymous', 'campus', 'blockchain', 'Nash equilibrium'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav className="topnav">
          <Link href="/" className="nav-logo">⛓️ TruthChain</Link>
          <div className="nav-links">
            <Link href="/">🏠 Home</Link>
            <Link href="/dashboard">📊 Dashboard</Link>
            <Link href="/rumors">📢 Rumors</Link>
            <Link href="/hash">🔐 Hashing</Link>
            <Link href="/simulate">⚔️ Attacks</Link>
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
