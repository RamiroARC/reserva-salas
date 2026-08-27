import { Router } from 'express';
import { C, fromDocs } from '../mongo.js';
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

export default router;
