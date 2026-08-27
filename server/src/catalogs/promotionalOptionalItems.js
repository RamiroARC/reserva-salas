import { C, insertDoc } from '../mongo.js';

export const DEFAULT_PROMOTIONAL_OPTIONAL_ITEMS = [
  { name: 'Tamal con ensalada', price: 5.0, sort_order: 1 },
  { name: 'Asado de chancho', price: 12.0, sort_order: 2 },
  { name: 'Causa criolla de pollo o atún filete', price: 5.0, sort_order: 3 },
  { name: 'Jamón serrano con ensalada', price: 12.0, sort_order: 4 },
  { name: 'Llunca de pollo', price: 10.0, sort_order: 5 },
  { name: 'Helados', price: 5.5, sort_order: 6 },
];

export async function seedPromotionalOptionalItems(localId) {
  const count = await C('promotional_optional_items').countDocuments({ local_id: localId });
  if (count > 0) return;

  for (const item of DEFAULT_PROMOTIONAL_OPTIONAL_ITEMS) {
    await insertDoc('promotional_optional_items', {
      local_id: localId,
      name: item.name,
      price: item.price,
      sort_order: item.sort_order,
      active: 1,
    });
  }
}
