import { Router } from 'express';
import { C, deleteLocalCascade, findById, nid, updateById } from '../mongo.js';
import { createLocal } from '../db.js';
import { normalizeList, serializeLocal } from '../services/locals.js';
import { requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../http.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const locals = (
      await C('rooms').find({ company_id: req.user.company_id }).sort({ name: 1 }).toArray()
    ).map((doc) => serializeLocal({ id: doc._id, ...doc }));

    res.json(locals);
  })
);

router.post(
  '/',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { name } = req.body ?? {};

    if (!name?.trim()) {
      return res.status(400).json({ error: 'El nombre del local es obligatorio' });
    }

    const duplicated = await C('rooms').findOne({
      company_id: req.user.company_id,
      name: name.trim(),
    });

    if (duplicated) {
      return res.status(409).json({ error: 'Ya tienes un local con ese nombre' });
    }

    const localId = await createLocal(req.user.company_id, {
      name: name.trim(),
      capacity: Number(req.body.capacity) || 100,
      baseRentalPrice: Number(req.body.baseRentalPrice) || 0,
      description: req.body.description?.trim() ?? '',
      amenities: normalizeList(req.body.amenities),
      address: req.body.address?.trim() ?? '',
      ownerName: req.body.ownerName?.trim() ?? '',
      ownerDni: req.body.ownerDni?.trim() ?? '',
      phones: normalizeList(req.body.phones),
      bannerPath: req.body.bannerPath?.trim() ?? '',
      extensionPerHour: Number(req.body.extensionPerHour) || 0,
      packageIncludes: normalizeList(req.body.packageIncludes),
      decorationBiombo: req.body.decorationBiombo?.trim() ?? '',
      decorationTematico: req.body.decorationTematico?.trim() ?? '',
      decorationExtras: req.body.decorationExtras?.trim() ?? '',
      extrasTerms: req.body.extrasTerms?.trim() ?? '',
    });

    const local = await findById('rooms', localId);
    res.status(201).json(serializeLocal(local));
  })
);

async function loadCompanyLocal(req, res) {
  const local = (
    await C('rooms')
      .find({ _id: nid(req.params.id), company_id: req.user.company_id })
      .toArray()
  ).map((doc) => ({ id: doc._id, ...doc }))[0];

  if (!local) {
    res.status(404).json({ error: 'Local no encontrado' });
    return null;
  }

  return local;
}

router.put(
  '/:id',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const local = await loadCompanyLocal(req, res);
    if (!local) return;

    const name = req.body?.name?.trim() || local.name;

    const duplicated = await C('rooms').findOne({
      company_id: req.user.company_id,
      name,
      _id: { $ne: local.id },
    });

    if (duplicated) {
      return res.status(409).json({ error: 'Ya tienes un local con ese nombre' });
    }

    const active = req.body?.active === undefined ? Boolean(local.active) : Boolean(req.body.active);

    if (!active) {
      const remaining = await C('rooms').countDocuments({
        company_id: req.user.company_id,
        active: 1,
        _id: { $ne: local.id },
      });

      if (remaining === 0) {
        return res.status(409).json({ error: 'La empresa debe conservar al menos un local activo' });
      }
    }

    await updateById('rooms', local.id, {
      name,
      capacity: Number(req.body?.capacity) || local.capacity,
      base_rental_price:
        req.body?.baseRentalPrice === undefined
          ? local.base_rental_price
          : Number(req.body.baseRentalPrice) || 0,
      description: req.body?.description?.trim() ?? local.description,
      amenities: JSON.stringify(
        req.body?.amenities === undefined
          ? serializeLocal(local).amenities
          : normalizeList(req.body.amenities)
      ),
      address: req.body?.address?.trim() ?? local.address,
      owner_name: req.body?.ownerName?.trim() ?? local.owner_name,
      owner_dni: req.body?.ownerDni?.trim() ?? local.owner_dni,
      phones: JSON.stringify(
        req.body?.phones === undefined ? serializeLocal(local).phones : normalizeList(req.body.phones)
      ),
      banner_path: req.body?.bannerPath?.trim() ?? local.banner_path,
      extension_per_hour:
        req.body?.extensionPerHour === undefined
          ? local.extension_per_hour
          : Number(req.body.extensionPerHour) || 0,
      package_includes: JSON.stringify(
        req.body?.packageIncludes === undefined
          ? serializeLocal(local).packageIncludes
          : normalizeList(req.body.packageIncludes)
      ),
      decoration_biombo: req.body?.decorationBiombo?.trim() ?? local.decoration_biombo,
      decoration_tematico: req.body?.decorationTematico?.trim() ?? local.decoration_tematico,
      decoration_extras: req.body?.decorationExtras?.trim() ?? local.decoration_extras,
      extras_terms: req.body?.extrasTerms?.trim() ?? local.extras_terms,
      active: active ? 1 : 0,
    });

    const updated = await findById('rooms', local.id);
    res.json(serializeLocal(updated));
  })
);

router.delete(
  '/:id',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const local = await loadCompanyLocal(req, res);
    if (!local) return;

    const bookings = await C('bookings').countDocuments({ room_id: local.id });

    if (bookings > 0) {
      return res
        .status(409)
        .json({ error: 'El local tiene reservas registradas: desactívalo en lugar de eliminarlo' });
    }

    const remaining = await C('rooms').countDocuments({
      company_id: req.user.company_id,
      _id: { $ne: local.id },
    });

    if (remaining === 0) {
      return res.status(409).json({ error: 'La empresa debe conservar al menos un local' });
    }

    await deleteLocalCascade(local.id);
    res.status(204).send();
  })
);

export default router;
