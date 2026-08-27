import { Router } from 'express';
import { C, deleteById, findById, fromDocs, insertDoc, nid, updateById } from '../mongo.js';
import { asyncHandler } from '../http.js';

const router = Router();

function mapItem(row) {
  return {
    ...row,
    active: Boolean(row.active),
  };
}

function normalizeBody(body) {
  const name = body.name?.trim();
  const price = Number(body.price);
  const sortOrder = body.sortOrder != null && body.sortOrder !== '' ? Number(body.sortOrder) : 0;

  if (!name) return { error: 'El nombre es obligatorio' };
  if (Number.isNaN(price) || price < 0) return { error: 'Precio inválido' };
  if (Number.isNaN(sortOrder) || sortOrder < 0) return { error: 'Orden inválido' };

  return {
    data: {
      name,
      price,
      sort_order: sortOrder,
      active: body.active === false || body.active === 0 ? 0 : 1,
    },
  };
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const rows = fromDocs(
      await C('promotional_optional_items')
        .find({ local_id: req.localId })
        .sort({ sort_order: 1, name: 1 })
        .toArray()
    );
    res.json(rows.map(mapItem));
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const normalized = normalizeBody(req.body);
    if (normalized.error) return res.status(400).json({ error: normalized.error });

    const result = await insertDoc('promotional_optional_items', {
      local_id: req.localId,
      ...normalized.data,
    });

    const created = await findById('promotional_optional_items', result.lastInsertRowid);
    res.status(201).json(mapItem(created));
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await C('promotional_optional_items').findOne({
      _id: nid(req.params.id),
      local_id: req.localId,
    });
    if (!existing) return res.status(404).json({ error: 'Ítem no encontrado' });

    const normalized = normalizeBody(req.body);
    if (normalized.error) return res.status(400).json({ error: normalized.error });

    await updateById('promotional_optional_items', req.params.id, normalized.data);
    const updated = await findById('promotional_optional_items', req.params.id);
    res.json(mapItem(updated));
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await C('promotional_optional_items').findOne({
      _id: nid(req.params.id),
      local_id: req.localId,
    });
    if (!existing) return res.status(404).json({ error: 'Ítem no encontrado' });
    await deleteById('promotional_optional_items', req.params.id);
    res.status(204).send();
  })
);

export default router;
