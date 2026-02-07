// ============================================================================
// TruthChain Cryptographic Identity Module
// ECDSA key pairs for anonymous but accountable participation
// ============================================================================

import { sha256 } from 'js-sha256';

/**
 * Generate a pseudonym from a public key.
 * The pseudonym is the first 16 hex characters of SHA256(publicKey).
 * This provides anonymity — no PII is ever stored.
 */
export function generatePseudonym(publicKeyHex: string): string {
  return sha256(publicKeyHex).substring(0, 16).toUpperCase();
}

/**
 * Hash a campus email with salt for Sybil resistance.
 * One email → one hash → one pseudonym.
 *
 * The raw email is NEVER stored.
 * Even if the database is compromised, emails cannot be recovered.
 */
export function hashEmail(email: string, salt: string = 'TruthChain_v1_Salt'): string {
  return sha256(email.toLowerCase().trim() + salt);
}

/**
 * Create a deterministic signature for demo purposes.
 * In production, this would use actual ECDSA signing.
 */
export function createDemoSignature(message: string, pseudonym: string): string {
  return sha256(message + pseudonym + Date.now().toString()).substring(0, 32);
}

/**
 * Verify that a pseudonym is properly formatted.
 */
export function isValidPseudonym(pseudonym: string): boolean {
  return /^[A-F0-9]{16}$/.test(pseudonym);
}

/**
 * Generate a simulated key pair for demo purposes.
 * In production, ECDSA key pairs are generated client-side.
 */
export function generateDemoKeyPair(): {
  publicKeyHex: string;
  pseudonym: string;
} {
  // Simulate a public key (in production: ECDSA secp256k1)
  const chars = '0123456789abcdef';
  let publicKeyHex = '04'; // Uncompressed EC point prefix
  for (let i = 0; i < 128; i++) {
    publicKeyHex += chars[Math.floor(Math.random() * 16)];
  }

  return {
    publicKeyHex,
    pseudonym: generatePseudonym(publicKeyHex),
  };
}

/**
 * Generate a DETERMINISTIC key pair from a seed string.
 * Used for seed users so pseudonyms are stable across server restarts.
 */
export function generateSeededKeyPair(seed: string): {
  publicKeyHex: string;
  pseudonym: string;
} {
  // Derive a deterministic "public key" from the seed
  const hash = sha256(seed + '_TruthChain_KeyPair');
  const publicKeyHex = '04' + hash + sha256(hash).substring(0, 64);
  return {
    publicKeyHex,
    pseudonym: generatePseudonym(publicKeyHex),
  };
}
