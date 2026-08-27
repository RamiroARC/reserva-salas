import { Router } from 'express';
import { C, deleteById, findById, fromDocs, insertDoc, nid, nowIso, updateById } from '../mongo.js';
import { hashPassword, validatePasswordStrength } from '../services/password.js';
import { destroyUserSessions } from '../services/auth.js';
import { asyncHandler } from '../http.js';

const router = Router();

const ASSIGNABLE_ROLES = ['admin', 'usuario'];

function serializeUser(row) {
  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    role: row.role,
    active: Boolean(row.active),
    createdAt: row.created_at,
  };
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const users = fromDocs(
      await C('users').find({ company_id: req.user.company_id }).sort({ role: 1, username: 1 }).toArray()
    ).map(serializeUser);

    res.json(users);
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { username, fullName, password, role } = req.body ?? {};

    if (!username?.trim() || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son obligatorios' });
    }

    if (!ASSIGNABLE_ROLES.includes(role ?? 'usuario')) {
      return res.status(400).json({ error: 'Rol no válido' });
    }

    const invalidPassword = validatePasswordStrength(password);
    if (invalidPassword) return res.status(400).json({ error: invalidPassword });

    const taken = await C('users').findOne({ username: username.trim() });
    if (taken) return res.status(409).json({ error: 'Ese nombre de usuario ya está en uso' });

    const info = await insertDoc('users', {
      company_id: req.user.company_id,
      username: username.trim(),
      full_name: fullName?.trim() ?? '',
      password_hash: hashPassword(password),
      role: role ?? 'usuario',
      active: 1,
      created_at: nowIso(),
    });

    const created = await findById('users', info.lastInsertRowid);
    res.status(201).json(serializeUser(created));
  })
);

async function loadCompanyUser(req, res) {
  const user = fromDocs(
    await C('users')
      .find({ _id: nid(req.params.id), company_id: req.user.company_id })
      .toArray()
  )[0];

  if (!user) {
    res.status(404).json({ error: 'Usuario no encontrado' });
    return null;
  }

  return user;
}

async function isLastActiveAdmin(companyId, userId) {
  const admins = await C('users').countDocuments({
    company_id: companyId,
    role: 'admin',
    active: 1,
  });

  const target = await findById('users', userId);
  return admins <= 1 && target?.role === 'admin' && Boolean(target.active);
}

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = await loadCompanyUser(req, res);
    if (!user) return;

    const { fullName, role, active, password } = req.body ?? {};

    if (role && !ASSIGNABLE_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Rol no válido' });
    }

    const nextRole = role ?? user.role;
    const nextActive = active === undefined ? Boolean(user.active) : Boolean(active);

    if ((nextRole !== 'admin' || !nextActive) && (await isLastActiveAdmin(req.user.company_id, user.id))) {
      return res
        .status(409)
        .json({ error: 'La empresa debe conservar al menos un administrador activo' });
    }

    if (password) {
      const invalidPassword = validatePasswordStrength(password);
      if (invalidPassword) return res.status(400).json({ error: invalidPassword });

      await updateById('users', user.id, { password_hash: hashPassword(password) });
      await destroyUserSessions(user.id);
    }

    await updateById('users', user.id, {
      full_name: fullName?.trim() ?? user.full_name,
      role: nextRole,
      active: nextActive ? 1 : 0,
    });

    if (!nextActive) await destroyUserSessions(user.id);

    const updated = await findById('users', user.id);
    res.json(serializeUser(updated));
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = await loadCompanyUser(req, res);
    if (!user) return;

    if (user.id === req.user.id) {
      return res.status(409).json({ error: 'No puedes eliminar tu propio usuario' });
    }

    if (await isLastActiveAdmin(req.user.company_id, user.id)) {
      return res
        .status(409)
        .json({ error: 'La empresa debe conservar al menos un administrador activo' });
    }

    await destroyUserSessions(user.id);
    await deleteById('users', user.id);

    res.status(204).send();
  })
);

export default router;
