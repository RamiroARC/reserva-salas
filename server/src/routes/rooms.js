import { Router } from 'express';
import { C, fromDocs } from '../mongo.js';
import { asyncHandler } from '../http.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const rooms = fromDocs(
      await C('rooms')
        .find(
          {},
          {
            projection: {
              name: 1,
              capacity: 1,
              floor: 1,
              base_rental_price: 1,
              amenities: 1,
              description: 1,
            },
          }
        )
        .sort({ capacity: -1, name: 1 })
        .toArray()
    ).map((room) => ({
      ...room,
      amenities: JSON.parse(room.amenities),
    }));

    res.json(rooms);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const room = fromDocs(
      await C('rooms')
        .find(
          { _id: Number(req.params.id) },
          {
            projection: {
              name: 1,
              capacity: 1,
              floor: 1,
              base_rental_price: 1,
              amenities: 1,
              description: 1,
            },
          }
        )
        .toArray()
    )[0];

    if (!room) {
      return res.status(404).json({ error: 'Local de evento no encontrado' });
    }

    res.json({ ...room, amenities: JSON.parse(room.amenities) });
  })
);

export default router;
