import { Router } from 'express';
import { C, deleteById, findById, fromDocs, insertDoc, nid } from '../mongo.js';
import { slugifyDecorationColor } from '../catalogs/decorationColorsCatalog.js';
import { asyncHandler } from '../http.js';

const router = Router();

function mapColor(row) {
  return {
    ...row,
    active: Boolean(row.active),
  };
}

function normalizeBody(body) {
  const name = body.name?.trim();
  if (!name) return { error: 'El nombre es obligatorio' };

  const hex = body.hex?.trim() || '#cbd5e1';
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
    return { error: 'Color hexadecimal inválido (use formato #RRGGBB)' };
  }

  const sortOrder =
    body.sortOrder != null && body.sortOrder !== '' ? Number(body.sortOrder) : null;

  if (sortOrder != null && (Number.isNaN(sortOrder) || sortOrder < 0)) {
    return { error: 'Orden inválido' };
  }

  return {
    data: {
      name,
      value: slugifyDecorationColor(name),
      hex: hex.toLowerCase(),
      sort_order: sortOrder,
    },
  };
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const rows = fromDocs(
      await C('decoration_colors')
        .find({ local_id: req.localId })
        .sort({ sort_order: 1, name: 1 })
        .toArray()
    );
    res.json(rows.map(mapColor));
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const normalized = normalizeBody(req.body);
    if (normalized.error) return res.status(400).json({ error: normalized.error });

    const { data } = normalized;
    const existing = await C('decoration_colors').findOne({
      local_id: req.localId,
      $or: [{ name: data.name }, { value: data.value }],
    });

    if (existing) {
      return res.status(409).json({ error: 'Ya existe un color con ese nombre' });
    }

    const last = await C('decoration_colors')
      .find({ local_id: req.localId })
      .sort({ sort_order: -1 })
      .limit(1)
      .toArray();
    const maxOrder = last[0]?.sort_order ?? 0;
    const sortOrder = data.sort_order != null ? data.sort_order : maxOrder + 1;

    const result = await insertDoc('decoration_colors', {
      local_id: req.localId,
      name: data.name,
      value: data.value,
      hex: data.hex,
      sort_order: sortOrder,
      active: 1,
    });

    const created = await findById('decoration_colors', result.lastInsertRowid);
    res.status(201).json(mapColor(created));
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await C('decoration_colors').findOne({
      _id: nid(req.params.id),
      local_id: req.localId,
    });
    if (!existing) return res.status(404).json({ error: 'Color no encontrado' });
    await deleteById('decoration_colors', req.params.id);
    res.status(204).send();
  })
);

export default router;
