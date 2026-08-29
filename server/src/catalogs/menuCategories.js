export const BEBIDA_CATEGORIES = ['bebida', 'bebida_cortesia', 'bebida_pack', 'bebida_otras'];

export const HELADO_CATEGORY = 'helado';
export const POSTRE_CATEGORY = 'postre';

export function isBebidaCategory(category) {
  return BEBIDA_CATEGORIES.includes(category);
}

export function inferBebidaCategory(item) {
  const name = String(item.name ?? '').toLowerCase();
  if (item.note || name.includes('jarra de chicha') || name.includes('cortes')) {
    return 'bebida_cortesia';
  }
  if (name.includes('gaseosa') && name.includes('3 lts')) {
    return 'bebida_pack';
  }
  return 'bebida_otras';
}

export function inferHeladoCategory(item) {
  return /helado/i.test(String(item.name ?? '')) ? HELADO_CATEGORY : POSTRE_CATEGORY;
}
