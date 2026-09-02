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
  const content = body.content?.trim();
  if (!content) return { error: 'El ítem es obligatorio' };

  const sortOrder =
    body.sortOrder != null && body.sortOrder !== '' ? Number(body.sortOrder) : null;

  if (sortOrder != null && (Number.isNaN(sortOrder) || sortOrder < 0)) {
    return { error: 'Orden inválido' };
  }

  return {
    data: {
      content,
      description: body.description?.trim() ?? '',
      sort_order: sortOrder,
      active: body.active === false || body.active === 0 ? 0 : 1,
    },
  };
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const rows = fromDocs(
      await C('package_include_items')
        .find({ local_id: req.localId })
        .sort({ sort_order: 1, _id: 1 })
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
    const last = await C('package_include_items')
      .find({ local_id: req.localId })
      .sort({ sort_order: -1 })
      .limit(1)
      .toArray();
    const maxOrder = last[0]?.sort_order ?? 0;
    const sortOrder = data.sort_order != null ? data.sort_order : maxOrder + 1;

    const result = await insertDoc('package_include_items', {
      local_id: req.localId,
      content: data.content,
      description: data.description,
      sort_order: sortOrder,
      active: data.active,
    });

    const created = await findById('package_include_items', result.lastInsertRowid);
    res.status(201).json(mapItem(created));
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await C('package_include_items').findOne({
      _id: nid(req.params.id),
      local_id: req.localId,
    });

    if (!existing) {
      return res.status(404).json({ error: 'Ítem no encontrado' });
    }

    const normalized = normalizeBody(req.body);
    if (normalized.error) return res.status(400).json({ error: normalized.error });

    const { data } = normalized;
    const sortOrder = data.sort_order != null ? data.sort_order : existing.sort_order;

    await updateById('package_include_items', req.params.id, {
      content: data.content,
      description: data.description,
      sort_order: sortOrder,
      active: data.active,
    });

    const updated = await findById('package_include_items', req.params.id);
    res.json(mapItem(updated));
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await C('package_include_items').findOne({
      _id: nid(req.params.id),
      local_id: req.localId,
    });
    if (!existing) return res.status(404).json({ error: 'Ítem no encontrado' });
    await deleteById('package_include_items', req.params.id);
    res.status(204).send();
  })
);

export default router;
