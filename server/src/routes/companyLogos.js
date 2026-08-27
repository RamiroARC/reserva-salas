import { Router } from 'express';
import { C, fromDoc, nid } from '../mongo.js';
import { asyncHandler } from '../http.js';

const router = Router();

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const company = fromDoc(await C('companies').findOne({ _id: nid(req.params.id) }));
    if (!company) return res.status(404).json({ error: 'Empresa no encontrada' });

    const isSuperadmin = req.user?.role === 'superadmin';
    if (!isSuperadmin && Number(req.user?.company_id) !== Number(company.id)) {
      return res.status(403).json({ error: 'No tienes permisos para ver este logo' });
    }

    if (!company.logo_data) {
      return res.status(404).json({ error: 'La empresa no tiene un logo cargado' });
    }

    res.setHeader('Content-Type', company.logo_mime || 'image/png');
    res.setHeader('Cache-Control', 'private, max-age=86400');
    res.send(Buffer.from(company.logo_data, 'base64'));
  })
);

export default router;
