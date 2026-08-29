export const BEBIDA_CORTESIA_CATEGORY = 'bebida_cortesia';
export const BEBIDA_PACK_CATEGORY = 'bebida_pack';
export const BEBIDA_OTRAS_CATEGORY = 'bebida_otras';

export const BEBIDA_CATEGORIES = [
  'bebida',
  BEBIDA_CORTESIA_CATEGORY,
  BEBIDA_PACK_CATEGORY,
  BEBIDA_OTRAS_CATEGORY,
];

export const HELADO_CATEGORY = 'helado';
export const POSTRE_CATEGORY = 'postre';

export function isBebidaCategory(category) {
  return BEBIDA_CATEGORIES.includes(category);
}

export function inferBebidaCategory(item) {
  const name = String(item.name ?? '').toLowerCase();
  if (item.note || name.includes('jarra de chicha') || name.includes('cortes')) {
    return BEBIDA_CORTESIA_CATEGORY;
  }
  if (name.includes('gaseosa') && name.includes('3 lts')) {
    return BEBIDA_PACK_CATEGORY;
  }
  return BEBIDA_OTRAS_CATEGORY;
}

export function inferHeladoCategory(item) {
  return /helado/i.test(String(item.name ?? '')) ? HELADO_CATEGORY : POSTRE_CATEGORY;
}
