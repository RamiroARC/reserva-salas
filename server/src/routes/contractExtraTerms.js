import { Router } from 'express';
import { C, deleteById, findById, fromDocs, insertDoc, nid, updateById } from '../mongo.js';
import { asyncHandler } from '../http.js';

const router = Router();

function mapTerm(row) {
  return {
    ...row,
    active: Boolean(row.active),
  };
}

function normalizeBody(body) {
  const content = body.content?.trim();
  if (!content) return { error: 'El texto es obligatorio' };

  const sortOrder =
    body.sortOrder != null && body.sortOrder !== '' ? Number(body.sortOrder) : null;

  if (sortOrder != null && (Number.isNaN(sortOrder) || sortOrder < 0)) {
    return { error: 'Orden inválido' };
  }

  return { data: { content, sort_order: sortOrder } };
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const rows = fromDocs(
      await C('contract_extra_terms')
        .find({ local_id: req.localId })
        .sort({ sort_order: 1, _id: 1 })
        .toArray()
    );
    res.json(rows.map(mapTerm));
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const normalized = normalizeBody(req.body);
    if (normalized.error) return res.status(400).json({ error: normalized.error });

    const { data } = normalized;
    const last = await C('contract_extra_terms')
      .find({ local_id: req.localId })
      .sort({ sort_order: -1 })
      .limit(1)
      .toArray();
    const maxOrder = last[0]?.sort_order ?? 0;
    const sortOrder = data.sort_order != null ? data.sort_order : maxOrder + 1;

    const result = await insertDoc('contract_extra_terms', {
      local_id: req.localId,
      content: data.content,
      sort_order: sortOrder,
      active: 1,
    });

    const created = await findById('contract_extra_terms', result.lastInsertRowid);
    res.status(201).json(mapTerm(created));
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await C('contract_extra_terms').findOne({
      _id: nid(req.params.id),
      local_id: req.localId,
    });

    if (!existing) {
      return res.status(404).json({ error: 'Disposición no encontrada' });
    }

    const normalized = normalizeBody(req.body);
    if (normalized.error) return res.status(400).json({ error: normalized.error });

    const { data } = normalized;
    const sortOrder = data.sort_order != null ? data.sort_order : existing.sort_order;

    await updateById('contract_extra_terms', req.params.id, {
      content: data.content,
      sort_order: sortOrder,
    });

    const updated = await findById('contract_extra_terms', req.params.id);
    res.json(mapTerm(updated));
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await C('contract_extra_terms').findOne({
      _id: nid(req.params.id),
      local_id: req.localId,
    });
    if (!existing) return res.status(404).json({ error: 'Disposición no encontrada' });
    await deleteById('contract_extra_terms', req.params.id);
    res.status(204).send();
  })
);

export default router;
