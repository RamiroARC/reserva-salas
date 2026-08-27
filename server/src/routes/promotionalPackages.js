import { Router } from 'express';
import { C, deleteById, findById, fromDocs, insertDoc, nid, updateById } from '../mongo.js';
import { parsePromoIncludes, serializePromoIncludes } from '../catalogs/promotionalPackages.js';
import { asyncHandler } from '../http.js';

function mapPlatoFondo(row) {
  return {
    id: row.id,
    promotional_package_id: row.promotional_package_id,
    name: row.name,
    description: row.description,
    sort_order: row.sort_order,
    active: Boolean(row.active),
  };
}

async function attachPlatoFondoOptions(promos, localId) {
  const localPromos = await C('promotional_packages').find({ local_id: localId }).toArray();
  const promoIds = localPromos.map((item) => item._id);
  const rows = promoIds.length
    ? fromDocs(
        await C('promotional_plato_fondo')
          .find({ active: 1, promotional_package_id: { $in: promoIds } })
          .sort({ sort_order: 1, name: 1 })
          .toArray()
      )
    : [];

  const byPackage = rows.reduce((acc, row) => {
    const item = mapPlatoFondo(row);
    if (!acc[item.promotional_package_id]) acc[item.promotional_package_id] = [];
    acc[item.promotional_package_id].push(item);
    return acc;
  }, {});

  return promos.map((promo) => ({
    ...promo,
    platoFondoOptions: byPackage[promo.id] ?? [],
  }));
}

const router = Router();

function mapPromo(row) {
  return {
    ...row,
    active: Boolean(row.active),
    includes: parsePromoIncludes(row.includes),
  };
}

function normalizePromoBody(body) {
  const price = Number(body.price);
  if (!body.name?.trim()) return { error: 'El nombre es obligatorio' };
  if (Number.isNaN(price) || price < 0) return { error: 'Precio inválido' };

  const priceType = body.priceType === 'per_person' ? 'per_person' : 'fixed';
  const minAttendees =
    body.minAttendees != null && body.minAttendees !== ''
      ? Number(body.minAttendees)
      : null;
  const maxAttendees =
    body.maxAttendees != null && body.maxAttendees !== ''
      ? Number(body.maxAttendees)
      : null;
  const monthStart =
    body.monthStart != null && body.monthStart !== '' ? Number(body.monthStart) : null;
  const monthEnd =
    body.monthEnd != null && body.monthEnd !== '' ? Number(body.monthEnd) : null;

  if (minAttendees != null && (Number.isNaN(minAttendees) || minAttendees < 1)) {
    return { error: 'Mínimo de asistentes inválido' };
  }
  if (maxAttendees != null && (Number.isNaN(maxAttendees) || maxAttendees < 1)) {
    return { error: 'Máximo de asistentes inválido' };
  }
  if (minAttendees != null && maxAttendees != null && minAttendees > maxAttendees) {
    return { error: 'El mínimo de asistentes no puede superar el máximo' };
  }
  for (const month of [monthStart, monthEnd]) {
    if (month != null && (Number.isNaN(month) || month < 1 || month > 12)) {
      return { error: 'Mes de vigencia inválido' };
    }
  }

  const includes = Array.isArray(body.includes)
    ? body.includes
    : String(body.includes ?? '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

  return {
    data: {
      name: body.name.trim(),
      description: body.description?.trim() ?? '',
      price,
      price_type: priceType,
      min_attendees: minAttendees,
      max_attendees: maxAttendees,
      includes: serializePromoIncludes(includes),
      month_start: monthStart,
      month_end: monthEnd,
      active: body.active === false || body.active === 0 ? 0 : 1,
      sort_order: Number(body.sortOrder) || 0,
    },
  };
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const rows = fromDocs(
      await C('promotional_packages').find({ local_id: req.localId }).sort({ sort_order: 1, name: 1 }).toArray()
    );
    res.json(await attachPlatoFondoOptions(rows.map(mapPromo), req.localId));
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const normalized = normalizePromoBody(req.body);
    if (normalized.error) return res.status(400).json({ error: normalized.error });

    const { data } = normalized;
    const result = await insertDoc('promotional_packages', {
      local_id: req.localId,
      ...data,
    });

    const created = await findById('promotional_packages', result.lastInsertRowid);
    res.status(201).json((await attachPlatoFondoOptions([mapPromo(created)], req.localId))[0]);
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await C('promotional_packages').findOne({
      _id: nid(req.params.id),
      local_id: req.localId,
    });
    if (!existing) return res.status(404).json({ error: 'Paquete promocional no encontrado' });

    const normalized = normalizePromoBody(req.body);
    if (normalized.error) return res.status(400).json({ error: normalized.error });

    await updateById('promotional_packages', req.params.id, normalized.data);

    const updated = await findById('promotional_packages', req.params.id);
    res.json((await attachPlatoFondoOptions([mapPromo(updated)], req.localId))[0]);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await C('promotional_packages').findOne({
      _id: nid(req.params.id),
      local_id: req.localId,
    });
    if (!existing) return res.status(404).json({ error: 'Paquete promocional no encontrado' });

    await C('promotional_plato_fondo').deleteMany({ promotional_package_id: nid(req.params.id) });
    await deleteById('promotional_packages', req.params.id);
    res.status(204).send();
  })
);

export default router;
