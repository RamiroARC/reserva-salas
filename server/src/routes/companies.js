import { Router } from 'express';
import { C, deleteCompanyCascade, fromDocs, insertDoc, nid, nowIso } from '../mongo.js';
import { createLocal } from '../db.js';
import { hashPassword, validatePasswordStrength } from '../services/password.js';
import { destroyUserSessions } from '../services/auth.js';
import { parseCompanyLogoPayload, resolveCompanyLogoUrl } from '../services/companyLogo.js';
import { asyncHandler } from '../http.js';

const router = Router();

function publicCompany(company) {
  const { logo_data, ...rest } = company;
  return {
    ...rest,
    hasUploadedLogo: Boolean(logo_data),
    logoPath: company.logo_path ?? '',
    logoUrl: resolveCompanyLogoUrl(company),
  };
}

async function companyWithCounts(company) {
  const [locals_count, users_count] = await Promise.all([
    C('rooms').countDocuments({ company_id: company.id }),
    C('users').countDocuments({ company_id: company.id }),
  ]);
  return {
    ...publicCompany(company),
    locals_count,
    users_count,
    active: Boolean(company.active),
  };
}

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const companies = fromDocs(await C('companies').find().sort({ name: 1 }).toArray());
    res.json(await Promise.all(companies.map(companyWithCounts)));
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const company = fromDocs(await C('companies').find({ _id: nid(req.params.id) }).toArray())[0];
    if (!company) return res.status(404).json({ error: 'Empresa no encontrada' });

    const locals = fromDocs(
      await C('rooms')
        .find({ company_id: company.id }, { projection: { name: 1, capacity: 1, active: 1 } })
        .sort({ name: 1 })
        .toArray()
    );

    const users = fromDocs(
      await C('users')
        .find(
          { company_id: company.id },
          { projection: { username: 1, full_name: 1, role: 1, active: 1 } }
        )
        .sort({ role: 1, username: 1 })
        .toArray()
    );

    res.json({ ...(await companyWithCounts(company)), locals, users });
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { name, taxId, logoPath, logo, adminUsername, adminPassword, adminFullName, localName } =
      req.body ?? {};

    if (!name?.trim()) {
      return res.status(400).json({ error: 'El nombre de la empresa es obligatorio' });
    }

    if (!adminUsername?.trim() || !adminPassword) {
      return res.status(400).json({ error: 'Debes definir el usuario y la contraseña del administrador' });
    }

    const invalidPassword = validatePasswordStrength(adminPassword);
    if (invalidPassword) return res.status(400).json({ error: invalidPassword });

    const exists = await C('companies').findOne({ name: name.trim() });
    if (exists) return res.status(409).json({ error: 'Ya existe una empresa con ese nombre' });

    const usernameTaken = await C('users').findOne({ username: adminUsername.trim() });
    if (usernameTaken) return res.status(409).json({ error: 'Ese nombre de usuario ya está en uso' });

    const logoParsed = parseCompanyLogoPayload(logo);
    if (logoParsed.error) return res.status(400).json({ error: logoParsed.error });

    const companyInfo = await insertDoc('companies', {
      name: name.trim(),
      tax_id: taxId?.trim() ?? '',
      logo_path: logoPath?.trim() ?? '',
      ...(logoParsed.skip ? {} : logoParsed.fields),
      active: 1,
      created_at: nowIso(),
    });
    const companyId = Number(companyInfo.lastInsertRowid);

    await insertDoc('users', {
      company_id: companyId,
      username: adminUsername.trim(),
      full_name: adminFullName?.trim() ?? '',
      password_hash: hashPassword(adminPassword),
      role: 'admin',
      active: 1,
      created_at: nowIso(),
    });

    if (localName?.trim()) {
      await createLocal(companyId, { name: localName.trim() });
    }

    const company = fromDocs(await C('companies').find({ _id: companyId }).toArray())[0];
    res.status(201).json(await companyWithCounts(company));
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { name, taxId, logoPath, logo, active, adminPassword } = req.body ?? {};

    if (!name?.trim()) {
      return res.status(400).json({ error: 'El nombre de la empresa es obligatorio' });
    }

    const duplicated = await C('companies').findOne({
      name: name.trim(),
      _id: { $ne: nid(req.params.id) },
    });
    if (duplicated) return res.status(409).json({ error: 'Ya existe una empresa con ese nombre' });

    const logoParsed = parseCompanyLogoPayload(logo);
    if (logoParsed.error) return res.status(400).json({ error: logoParsed.error });

    if (adminPassword) {
      const invalidPassword = validatePasswordStrength(adminPassword);
      if (invalidPassword) return res.status(400).json({ error: invalidPassword });
    }

    const fields = {
      name: name.trim(),
      tax_id: taxId?.trim() ?? '',
      active: active === false ? 0 : 1,
    };

    if (logoPath !== undefined) {
      fields.logo_path = logoPath?.trim() ?? '';
    }

    if (!logoParsed.skip) {
      Object.assign(fields, logoParsed.fields);
    }

    const result = await C('companies').updateOne(
      { _id: nid(req.params.id) },
      { $set: fields }
    );

    if (result.matchedCount === 0) return res.status(404).json({ error: 'Empresa no encontrada' });

    if (adminPassword) {
      const admin = await C('users').findOne({
        company_id: nid(req.params.id),
        role: 'admin',
      });
      if (!admin) {
        return res.status(404).json({ error: 'La empresa no tiene un administrador para restablecer' });
      }

      await C('users').updateOne(
        { _id: admin._id },
        { $set: { password_hash: hashPassword(String(adminPassword).trim()) } }
      );
      await destroyUserSessions(admin._id);
    }

    if (active === false) {
      const users = await C('users').find({ company_id: nid(req.params.id) }).toArray();
      for (const user of users) await destroyUserSessions(user._id);
    }

    const company = fromDocs(await C('companies').find({ _id: nid(req.params.id) }).toArray())[0];
    res.json(await companyWithCounts(company));
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const rooms = await C('rooms').find({ company_id: nid(req.params.id) }).toArray();
    const roomIds = rooms.map((room) => room._id);
    const bookings = roomIds.length
      ? await C('bookings').countDocuments({ room_id: { $in: roomIds } })
      : 0;

    if (bookings > 0) {
      return res
        .status(409)
        .json({ error: 'La empresa tiene reservas registradas: desactívala en lugar de eliminarla' });
    }

    const existing = await C('companies').findOne({ _id: nid(req.params.id) });
    if (!existing) return res.status(404).json({ error: 'Empresa no encontrada' });

    await deleteCompanyCascade(req.params.id);
    res.status(204).send();
  })
);

export default router;
