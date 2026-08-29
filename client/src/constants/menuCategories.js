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

export function isBebidaCortesiaCategory(category) {
  return category === BEBIDA_CORTESIA_CATEGORY;
}

export function isBebidaPackCategory(category) {
  return category === BEBIDA_PACK_CATEGORY;
}

export function isBebidaOtrasCategory(category) {
  return category === BEBIDA_OTRAS_CATEGORY;
}

export function getBookingExtraKey(category) {
  if (category === 'entrada') return 'entrada';
  if (isBebidaCategory(category)) return 'bebida';
  if (category === HELADO_CATEGORY) return 'helado';
  if (category === POSTRE_CATEGORY) return 'postre';
  return null;
}
