import { C, insertDoc } from '../mongo.js';

export function slugifyDecorationColor(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

export const DEFAULT_DECORATION_COLORS = [
  { name: 'Lila bebé', hex: '#c8a2c8', sort_order: 1 },
  { name: 'Rosado bebé', hex: '#f4c2c2', sort_order: 2 },
  { name: 'Palo rosa', hex: '#f8bbd0', sort_order: 3 },
  { name: 'Concha de vino', hex: '#722f37', sort_order: 4 },
  { name: 'Rojo', hex: '#dc2626', sort_order: 5 },
  { name: 'Chicle', hex: '#ff69b4', sort_order: 6 },
  { name: 'Melón', hex: '#ffb347', sort_order: 7 },
  { name: 'Verde policía', hex: '#00563f', sort_order: 8 },
  { name: 'Verde limón', hex: '#84cc16', sort_order: 9 },
  { name: 'Verde jade', hex: '#00a86b', sort_order: 10 },
  { name: 'Verde árbol', hex: '#228b22', sort_order: 11 },
  { name: 'Agua marina', hex: '#7fffd4', sort_order: 12 },
  { name: 'Celeste bebé', hex: '#bfefff', sort_order: 13 },
  { name: 'Celeste', hex: '#38bdf8', sort_order: 14 },
  { name: 'Azulino', hex: '#6495ed', sort_order: 15 },
  { name: 'Turquesa', hex: '#40e0d0', sort_order: 16 },
  { name: 'Azul noche', hex: '#191970', sort_order: 17 },
  { name: 'Amarillo', hex: '#facc15', sort_order: 18 },
  { name: 'Dorado', hex: '#d4af37', sort_order: 19 },
  { name: 'Perla', hex: '#f0ead6', sort_order: 20 },
  { name: 'Blanco', hex: '#f8fafc', sort_order: 21 },
  { name: 'Plomo plata', hex: '#94a3b8', sort_order: 22 },
  { name: 'Negro', hex: '#1f2937', sort_order: 23 },
];

export async function seedDecorationColors(localId) {
  for (const color of DEFAULT_DECORATION_COLORS) {
    const value = slugifyDecorationColor(color.name);
    const exists = await C('decoration_colors').findOne({
      local_id: localId,
      $or: [{ name: color.name }, { value }],
    });
    if (exists) continue;

    await insertDoc('decoration_colors', {
      local_id: localId,
      name: color.name,
      value,
      hex: color.hex,
      sort_order: color.sort_order,
      active: 1,
    });
  }
}
