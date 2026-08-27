import { Router } from 'express';
import { C, deleteById, findById, fromDoc, fromDocs, insertDoc, nid, updateById } from '../mongo.js';
import { asyncHandler } from '../http.js';

const router = Router();

function mapItem(row) {
  return {
    ...row,
    active: Boolean(row.active),
  };
}

async function normalizeBody(body, localId) {
  const name = body.name?.trim();
  const promotionalPackageId = Number(body.promotionalPackageId);
  const sortOrder =
    body.sortOrder != null && body.sortOrder !== '' ? Number(body.sortOrder) : null;

  if (!name) return { error: 'El nombre es obligatorio' };
  if (!promotionalPackageId || Number.isNaN(promotionalPackageId)) {
    return { error: 'Paquete promocional inválido' };
  }
  if (sortOrder != null && (Number.isNaN(sortOrder) || sortOrder < 0)) {
    return { error: 'Orden inválido' };
  }

  const promo = await C('promotional_packages').findOne({
    _id: promotionalPackageId,
    local_id: localId,
  });
  if (!promo) return { error: 'Paquete promocional no encontrado' };

  return {
    data: {
      promotional_package_id: promotionalPackageId,
      name,
      description: body.description?.trim() ?? '',
      sort_order: sortOrder,
      active: body.active === false || body.active === 0 ? 0 : 1,
    },
  };
}

async function ownedPlatoFondo(id, localId) {
  const item = await C('promotional_plato_fondo').findOne({ _id: nid(id) });
  if (!item) return null;
  const promo = await C('promotional_packages').findOne({
    _id: item.promotional_package_id,
    local_id: localId,
  });
  if (!promo) return null;
  return fromDoc(item);
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const packageId = req.query.packageId ? Number(req.query.packageId) : null;
    const localPromos = await C('promotional_packages').find({ local_id: req.localId }).toArray();
    const promoIds = localPromos.map((item) => item._id);

    const filter = { promotional_package_id: { $in: promoIds } };
    if (packageId) filter.promotional_package_id = packageId;

    const rows = fromDocs(
      await C('promotional_plato_fondo')
        .find(filter)
        .sort({ promotional_package_id: 1, sort_order: 1, name: 1 })
        .toArray()
    );
    res.json(rows.map(mapItem));
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const normalized = await normalizeBody(req.body, req.localId);
    if (normalized.error) return res.status(400).json({ error: normalized.error });

    const { data } = normalized;
    const last = await C('promotional_plato_fondo')
      .find({ promotional_package_id: data.promotional_package_id })
      .sort({ sort_order: -1 })
      .limit(1)
      .toArray();
    const maxOrder = last[0]?.sort_order ?? 0;
    const sortOrder = data.sort_order != null ? data.sort_order : maxOrder + 1;

    const result = await insertDoc('promotional_plato_fondo', {
      promotional_package_id: data.promotional_package_id,
      name: data.name,
      description: data.description,
      sort_order: sortOrder,
      active: data.active,
    });

    const created = await findById('promotional_plato_fondo', result.lastInsertRowid);
    res.status(201).json(mapItem(created));
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await ownedPlatoFondo(req.params.id, req.localId);
    if (!existing) return res.status(404).json({ error: 'Plato de fondo no encontrado' });

    const normalized = await normalizeBody(
      {
        ...req.body,
        promotionalPackageId: req.body.promotionalPackageId ?? existing.promotional_package_id,
      },
      req.localId
    );
    if (normalized.error) return res.status(400).json({ error: normalized.error });

    const { data } = normalized;
    const sortOrder = data.sort_order != null ? data.sort_order : existing.sort_order;

    await updateById('promotional_plato_fondo', req.params.id, {
      promotional_package_id: data.promotional_package_id,
      name: data.name,
      description: data.description,
      sort_order: sortOrder,
      active: data.active,
    });

    const updated = await findById('promotional_plato_fondo', req.params.id);
    res.json(mapItem(updated));
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const owned = await ownedPlatoFondo(req.params.id, req.localId);
    if (!owned) return res.status(404).json({ error: 'Plato de fondo no encontrado' });
    await deleteById('promotional_plato_fondo', req.params.id);
    res.status(204).send();
  })
);

export default router;
