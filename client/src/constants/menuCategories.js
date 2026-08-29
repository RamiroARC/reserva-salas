export const BEBIDA_CATEGORIES = ['bebida', 'bebida_cortesia', 'bebida_pack', 'bebida_otras'];

export const HELADO_CATEGORY = 'helado';
export const POSTRE_CATEGORY = 'postre';

export function isBebidaCategory(category) {
  return BEBIDA_CATEGORIES.includes(category);
}

export function getBookingExtraKey(category) {
  if (category === 'entrada') return 'entrada';
  if (isBebidaCategory(category)) return 'bebida';
  if (category === HELADO_CATEGORY) return 'helado';
  if (category === POSTRE_CATEGORY) return 'postre';
  return null;
}
