import path from 'path';
import { Router } from 'express';
import { C, nid } from '../mongo.js';
import { bookingUploadDir } from '../services/attachments.js';
import { asyncHandler } from '../http.js';

const router = Router();

router.get(
  '/bookings/:bookingId/:storedName',
  asyncHandler(async (req, res) => {
    const { bookingId, storedName } = req.params;

    if (storedName.includes('/') || storedName.includes('\\') || storedName.includes('..')) {
      return res.status(400).json({ error: 'Archivo inválido' });
    }

    const booking = req.user.company_id
      ? await C('bookings').findOne({ _id: nid(bookingId) })
      : null;
    const room = booking
      ? await C('rooms').findOne({ _id: booking.room_id, company_id: req.user.company_id })
      : null;

    if (!booking || !room) return res.status(404).json({ error: 'Archivo no encontrado' });

    res.sendFile(path.join(bookingUploadDir(bookingId), storedName), (err) => {
      if (err && !res.headersSent) {
        res.status(404).json({ error: 'Archivo no encontrado' });
      }
    });
  })
);

export default router;
