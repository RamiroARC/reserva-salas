import { Router } from 'express';
import { C, deleteById, findById, fromDocs, insertDoc, nid, updateById } from '../mongo.js';
import { asyncHandler } from '../http.js';

const router = Router();

function mapItem(row) {
  return {
    ...row,
    price: Number(row.price) || 0,
    active: Boolean(row.active),
  };
}

function normalizeBody(body) {
  const name = body.name?.trim();
  const sortOrder =
    body.sortOrder != null && body.sortOrder !== '' ? Number(body.sortOrder) : null;
  const price =
    body.price != null && body.price !== '' ? Number(body.price) : null;

  if (!name) return { error: 'El nombre es obligatorio' };
  if (sortOrder != null && (Number.isNaN(sortOrder) || sortOrder < 0)) {
    return { error: 'Orden inválido' };
  }
  if (price != null && (Number.isNaN(price) || price < 0)) {
    return { error: 'El precio no es válido' };
  }

  return {
    data: {
      name,
      description: body.description?.trim() ?? '',
      ...(price != null ? { price } : {}),
      sort_order: sortOrder,
      active: body.active === false || body.active === 0 ? 0 : 1,
    },
  };
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const rows = fromDocs(
      await C('decoration_theme_options')
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

    const { data } = normalized;
    const last = await C('decoration_theme_options')
      .find({ local_id: req.localId })
      .sort({ sort_order: -1 })
      .limit(1)
      .toArray();
    const maxOrder = last[0]?.sort_order ?? 0;
    const sortOrder = data.sort_order != null ? data.sort_order : maxOrder + 1;

    const result = await insertDoc('decoration_theme_options', {
      local_id: req.localId,
      name: data.name,
      description: data.description,
      price: data.price ?? 0,
      sort_order: sortOrder,
      active: data.active,
    });

    const created = await findById('decoration_theme_options', result.lastInsertRowid);
    res.status(201).json(mapItem(created));
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await C('decoration_theme_options').findOne({
      _id: nid(req.params.id),
      local_id: req.localId,
    });
    if (!existing) return res.status(404).json({ error: 'Tema no encontrado' });

    const normalized = normalizeBody(req.body);
    if (normalized.error) return res.status(400).json({ error: normalized.error });

    const { data } = normalized;
    const sortOrder = data.sort_order != null ? data.sort_order : existing.sort_order;

    await updateById('decoration_theme_options', req.params.id, {
      name: data.name,
      description: data.description,
      ...(data.price != null ? { price: data.price } : {}),
      sort_order: sortOrder,
      active: data.active,
    });

    const updated = await findById('decoration_theme_options', req.params.id);
    res.json(mapItem(updated));
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await C('decoration_theme_options').findOne({
      _id: nid(req.params.id),
      local_id: req.localId,
    });
    if (!existing) return res.status(404).json({ error: 'Tema no encontrado' });

    await deleteById('decoration_theme_options', req.params.id);
    res.status(204).send();
  })
);

export default router;
