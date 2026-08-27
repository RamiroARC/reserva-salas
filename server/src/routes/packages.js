import { Router } from 'express';
import { C, deleteById, findById, fromDocs, insertDoc, nid, updateById } from '../mongo.js';
import { asyncHandler } from '../http.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const packages = fromDocs(
      await C('packages').find({ local_id: req.localId }).sort({ type: 1, name: 1 }).toArray()
    ).map((pkg) => ({
      ...pkg,
      includes_food: Boolean(pkg.includes_food),
    }));

    const packageIds = packages.map((pkg) => pkg.id);
    const plates = packageIds.length
      ? fromDocs(
          await C('menu_plates')
            .find({ package_id: { $in: packageIds } })
            .sort({ package_id: 1, category: 1, price_per_plate: 1 })
            .toArray()
        )
      : [];

    const platesByPackage = plates.reduce((acc, plate) => {
      if (!acc[plate.package_id]) acc[plate.package_id] = [];
      acc[plate.package_id].push(plate);
      return acc;
    }, {});

    res.json(
      packages.map((pkg) => ({
        ...pkg,
        plates: platesByPackage[pkg.id] ?? [],
      }))
    );
  })
);

router.get(
  '/seasons',
  asyncHandler(async (req, res) => {
    const seasons = fromDocs(
      await C('season_rates').find({ local_id: req.localId }).sort({ multiplier: 1 }).toArray()
    );
    res.json(seasons);
  })
);

router.post(
  '/plates',
  asyncHandler(async (req, res) => {
    const { packageId, name, description, pricePerPlate, category = 'plato_fondo' } = req.body;

    if (!packageId || !name?.trim() || pricePerPlate == null) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const price = Number(pricePerPlate);
    if (Number.isNaN(price) || price < 0) {
      return res.status(400).json({ error: 'Precio por plato inválido' });
    }

    let targetPackageId = packageId;
    if (category === 'decoracion') {
      const soloPackage = await C('packages').findOne({
        type: 'solo_alquiler',
        local_id: req.localId,
      });
      if (!soloPackage) {
        return res.status(404).json({ error: 'Paquete base no encontrado para decoración' });
      }
      targetPackageId = soloPackage._id;
    }

    const pkg = await C('packages').findOne({ _id: nid(targetPackageId), local_id: req.localId });
    if (!pkg) return res.status(404).json({ error: 'Paquete no encontrado' });

    const result = await insertDoc('menu_plates', {
      package_id: nid(targetPackageId),
      name: name.trim(),
      description: description?.trim() ?? '',
      price_per_plate: price,
      category,
    });

    const plate = await findById('menu_plates', result.lastInsertRowid);
    res.status(201).json(plate);
  })
);

router.put(
  '/plates/:id',
  asyncHandler(async (req, res) => {
    const { name, description, pricePerPlate } = req.body;
    const price = Number(pricePerPlate);

    if (!name?.trim() || Number.isNaN(price) || price < 0) {
      return res.status(400).json({ error: 'Datos inválidos' });
    }

    const plate = await findById('menu_plates', req.params.id);
    if (!plate) return res.status(404).json({ error: 'Plato no encontrado' });
    const pkg = await C('packages').findOne({ _id: plate.package_id, local_id: req.localId });
    if (!pkg) return res.status(404).json({ error: 'Plato no encontrado' });

    await updateById('menu_plates', req.params.id, {
      name: name.trim(),
      description: description?.trim() ?? '',
      price_per_plate: price,
    });

    res.json(await findById('menu_plates', req.params.id));
  })
);

router.delete(
  '/plates/:id',
  asyncHandler(async (req, res) => {
    const plate = await findById('menu_plates', req.params.id);
    if (!plate) return res.status(404).json({ error: 'Plato no encontrado' });
    const pkg = await C('packages').findOne({ _id: plate.package_id, local_id: req.localId });
    if (!pkg) return res.status(404).json({ error: 'Plato no encontrado' });

    await deleteById('menu_plates', req.params.id);
    res.status(204).send();
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { rentalPrice } = req.body;
    const price = Number(rentalPrice);

    if (Number.isNaN(price) || price < 0) {
      return res.status(400).json({ error: 'Costo de alquiler inválido' });
    }

    const result = await C('packages').updateOne(
      { _id: nid(req.params.id), local_id: req.localId },
      { $set: { rental_price: price } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Paquete no encontrado' });
    }

    const pkg = await findById('packages', req.params.id);
    res.json({
      ...pkg,
      includes_food: Boolean(pkg.includes_food),
    });
  })
);

export default router;
