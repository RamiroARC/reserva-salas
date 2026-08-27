import crypto from 'crypto';
import { C, fromDoc, nowIso } from '../mongo.js';
import { resolveCompanyLogoUrl } from './companyLogo.js';
import { verifyPassword } from './password.js';

export const SESSION_COOKIE = 'reserva_sid';
const SESSION_DAYS = 15;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function withCompany(userDoc) {
  if (!userDoc) return undefined;
  const user = fromDoc(userDoc);
  const company = user.company_id
    ? fromDoc(await C('companies').findOne({ _id: user.company_id }))
    : null;

  return {
    ...user,
    company_name: company?.name ?? null,
    company_active: company?.active ?? null,
    company_logo: resolveCompanyLogoUrl(company),
  };
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function findUserDocByUsername(username) {
  const trimmed = String(username ?? '').trim();
  if (!trimmed) return null;

  return fromDoc(
    await C('users').findOne({
      username: { $regex: `^${escapeRegex(trimmed)}$`, $options: 'i' },
    })
  );
}

export async function findUserByUsername(username) {
  const row = await findUserDocByUsername(username);
  if (!row) return undefined;
  return withCompany(row);
}

export async function getUserById(id) {
  return withCompany(await C('users').findOne({ _id: Number(id) }));
}

export async function authenticate(username, password) {
  const row = await findUserDocByUsername(username);

  if (!row || !verifyPassword(String(password ?? '').trim(), row.password_hash)) return null;
  if (!row.active) return null;

  const user = await getUserById(row.id);
  if (!user) return null;
  if (user.company_id && !user.company_active) return null;

  return user;
}

export async function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const tokenHash = hashToken(token);

  await C('sessions').insertOne({
    _id: tokenHash,
    token_hash: tokenHash,
    user_id: userId,
    expires_at: expiresAt,
    created_at: nowIso(),
  });

  return { token, expiresAt };
}

export async function getSessionUser(token) {
  if (!token) return null;

  const session = fromDoc(await C('sessions').findOne({ _id: hashToken(token) }));
  if (!session) return null;

  if (new Date(session.expires_at).getTime() < Date.now()) {
    await C('sessions').deleteOne({ _id: session.token_hash });
    return null;
  }

  const user = await getUserById(session.user_id);
  if (!user || !user.active) return null;
  if (user.company_id && !user.company_active) return null;

  return user;
}

export async function destroySession(token) {
  if (!token) return;
  await C('sessions').deleteOne({ _id: hashToken(token) });
}

export async function destroyUserSessions(userId) {
  await C('sessions').deleteMany({ user_id: Number(userId) });
}

export async function purgeExpiredSessions() {
  await C('sessions').deleteMany({ expires_at: { $lt: nowIso() } });
}

export function sessionCookieOptions(expiresAt) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: Boolean(process.env.VERCEL),
    path: '/',
    expires: new Date(expiresAt),
  };
}

export function publicUser(user) {
  if (!user) return null;

  return {
    id: user.id,
    username: user.username,
    fullName: user.full_name,
    role: user.role,
    companyId: user.company_id,
    companyName: user.company_name ?? null,
    companyLogo: user.company_logo ?? null,
  };
}
