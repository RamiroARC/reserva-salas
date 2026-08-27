import { Router } from 'express';
import { findById, updateById } from '../mongo.js';
import { asyncHandler } from '../http.js';
import {
  SESSION_COOKIE,
  authenticate,
  createSession,
  destroySession,
  publicUser,
  purgeExpiredSessions,
  sessionCookieOptions,
} from '../services/auth.js';
import { hashPassword, validatePasswordStrength, verifyPassword } from '../services/password.js';
import { listUserLocals, requireAuth } from '../middleware/auth.js';

const router = Router();

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { username, password } = req.body ?? {};

    if (!username?.trim() || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son obligatorios' });
    }

    const user = await authenticate(username, password);
    if (!user) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    await purgeExpiredSessions();

    const { token, expiresAt } = await createSession(user.id);
    res.cookie(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));

    res.json({ user: publicUser(user), locals: await listUserLocals(user) });
  })
);

router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    await destroySession(req.cookies?.[SESSION_COOKIE]);
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    res.status(204).send();
  })
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: publicUser(req.user), locals: await listUserLocals(req.user) });
  })
);

router.post(
  '/password',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body ?? {};

    const row = await findById('users', req.user.id);
    if (!verifyPassword(currentPassword ?? '', row.password_hash)) {
      return res.status(400).json({ error: 'La contraseña actual no es correcta' });
    }

    const invalid = validatePasswordStrength(newPassword);
    if (invalid) return res.status(400).json({ error: invalid });

    await updateById('users', req.user.id, { password_hash: hashPassword(newPassword) });

    res.status(204).send();
  })
);

export default router;
