import { C, fromDoc, fromDocs, insertDoc } from '../mongo.js';

export const BIOMBO_TEMATICO_NAME = 'Biombo temático';

export const DEFAULT_DECORATION_THEMES = [
  { name: 'El hombre araña', sort_order: 1, price: 0 },
  { name: 'Noche de luna', sort_order: 2, price: 0 },
  { name: 'Paw Patrol', sort_order: 3, price: 0 },
];

export function isBiomboTematicoName(name) {
  return String(name ?? '').trim().toLowerCase() === BIOMBO_TEMATICO_NAME.toLowerCase();
}

export async function seedDecorationThemeOptions(localId) {
  const count = await C('decoration_theme_options').countDocuments({ local_id: localId });
  if (count > 0) return;

  for (const item of DEFAULT_DECORATION_THEMES) {
    await insertDoc('decoration_theme_options', {
      local_id: localId,
      name: item.name,
      description: '',
      price: item.price ?? 0,
      sort_order: item.sort_order,
      active: 1,
    });
  }
}

export async function listDecorationThemeOptions(localId) {
  return fromDocs(
    await C('decoration_theme_options')
      .find({ local_id: localId, active: 1 })
      .sort({ sort_order: 1, name: 1 })
      .toArray()
  );
}

export async function resolveDecorationTheme(localId, themeId) {
  if (!themeId) return null;

  return fromDoc(
    await C('decoration_theme_options').findOne({
      _id: Number(themeId),
      local_id: Number(localId),
      active: 1,
    })
  );
}

export async function localHasDecorationThemeOptions(localId) {
  const count = await C('decoration_theme_options').countDocuments({
    local_id: localId,
    active: 1,
  });
  return count > 0;
}
