import crypto from 'crypto';

const KEY_LENGTH = 64;

export function hashPassword(plain) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(String(plain), salt, KEY_LENGTH).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(plain, stored) {
  if (typeof stored !== 'string') return false;

  const [scheme, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;

  const derived = crypto.scryptSync(String(plain), salt, KEY_LENGTH);
  const expected = Buffer.from(hash, 'hex');

  if (expected.length !== derived.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

export function validatePasswordStrength(plain) {
  const value = String(plain ?? '');
  if (value.length < 6) {
    return 'La contraseña debe tener al menos 6 caracteres';
  }
  return null;
}
