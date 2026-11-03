import crypto from 'node:crypto';

// Opaque random tokens (refresh tokens, later: medical form links, password resets).
// Only the SHA-256 hash is stored, so a database leak does not expose usable tokens.
export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
