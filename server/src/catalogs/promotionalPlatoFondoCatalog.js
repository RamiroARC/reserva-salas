import { C, fromDoc, fromDocs, insertDoc } from '../mongo.js';

export const DEFAULT_STANDARD_PLATO_FONDO = [
  { name: '¼ Parrilla de pollo', sort_order: 1 },
  { name: '¼ Pollo al horno', sort_order: 2 },
  { name: '250 grs. Parrilla de chancho', sort_order: 3 },
];

export const DEFAULT_SUPER_EJECUTIVO_PLATO_FONDO = [
  { name: 'Parrilla mixta pollo y chancho', sort_order: 1 },
  { name: 'Asado de chancho con mote blanco', sort_order: 2 },
  { name: '250 grs. Asado de res con puré de papas y arroz', sort_order: 3 },
];

export async function seedPromotionalPlatoFondo(localId) {
  const promos = await C('promotional_packages').find({ local_id: localId }).toArray();
  const promoIds = promos.map((item) => item._id);
  const count = promoIds.length
    ? await C('promotional_plato_fondo').countDocuments({
        promotional_package_id: { $in: promoIds },
      })
    : 0;

  if (count > 0) return;

  for (const promoName of ['Paquete Económico', 'Paquete Básico', 'Paquete Ejecutivo']) {
    const promo = fromDoc(await C('promotional_packages').findOne({ name: promoName, local_id: localId }));
    if (!promo) continue;
    for (const item of DEFAULT_STANDARD_PLATO_FONDO) {
      await insertDoc('promotional_plato_fondo', {
        promotional_package_id: promo.id,
        name: item.name,
        description: '',
        sort_order: item.sort_order,
        active: 1,
      });
    }
  }

  const superPromo = fromDoc(
    await C('promotional_packages').findOne({ name: 'Paquete Super Ejecutivo', local_id: localId })
  );
  if (superPromo) {
    for (const item of DEFAULT_SUPER_EJECUTIVO_PLATO_FONDO) {
      await insertDoc('promotional_plato_fondo', {
        promotional_package_id: superPromo.id,
        name: item.name,
        description: '',
        sort_order: item.sort_order,
        active: 1,
      });
    }
  }
}

export async function resolvePromotionalPlatoFondo(promotionalPackageId, platoFondoId) {
  if (!platoFondoId) return null;

  return fromDoc(
    await C('promotional_plato_fondo').findOne({
      _id: Number(platoFondoId),
      promotional_package_id: Number(promotionalPackageId),
      active: 1,
    })
  );
}

export async function listPromotionalPlatoFondo(promotionalPackageId) {
  return fromDocs(
    await C('promotional_plato_fondo')
      .find({ promotional_package_id: Number(promotionalPackageId), active: 1 })
      .sort({ sort_order: 1, name: 1 })
      .toArray()
  );
}

export async function promoHasPlatoFondoOptions(promotionalPackageId) {
  const count = await C('promotional_plato_fondo').countDocuments({
    promotional_package_id: Number(promotionalPackageId),
    active: 1,
  });
  return count > 0;
}
