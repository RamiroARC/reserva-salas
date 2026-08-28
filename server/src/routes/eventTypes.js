import { Router } from 'express';
import { C, findById, fromDocs, insertDoc } from '../mongo.js';
import { asyncHandler } from '../http.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const types = fromDocs(
      await C('event_types')
        .find({ local_id: req.localId, active: 1 }, { projection: { name: 1 } })
        .sort({ sort_order: 1, name: 1 })
        .toArray()
    );
    res.json(types);
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const name = req.body.name?.trim();
    if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' });

    const existing = await C('event_types').findOne({
      local_id: req.localId,
      name,
    });
    if (existing) {
      return res.status(409).json({ error: 'Ya existe ese tipo de evento' });
    }

    const last = await C('event_types')
      .find({ local_id: req.localId })
      .sort({ sort_order: -1 })
      .limit(1)
      .toArray();
    const sortOrder = (last[0]?.sort_order ?? -1) + 1;

    const result = await insertDoc('event_types', {
      local_id: req.localId,
      name,
      sort_order: sortOrder,
      active: 1,
    });

    const created = await findById('event_types', result.lastInsertRowid);
    res.status(201).json(created);
  })
);

export default router;
