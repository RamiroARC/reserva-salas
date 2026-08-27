import { Router } from 'express';
import { findById } from '../mongo.js';
import { serializeLocal } from '../services/locals.js';
import { asyncHandler } from '../http.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const local = await findById('rooms', req.localId);

    if (!local) {
      return res.status(404).json({ error: 'Local no encontrado' });
    }

    res.json(serializeLocal(local));
  })
);

export default router;
