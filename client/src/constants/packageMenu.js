export const PLATO_FONDO_CATEGORY = 'plato_fondo';
export const BIOMBO_TEMATICO_NAME = 'Biombo temático';

export const PACKAGE_MENU_SECTIONS = [
  { category: PLATO_FONDO_CATEGORY, label: 'Plato de fondo', required: true, perPerson: true },
  { category: 'entrada', label: 'Entrada', required: false, perPerson: true },
  { category: 'bebida', label: 'Bebida', required: false, perPerson: true },
  { category: 'postre', label: 'Helado o postre', required: false, perPerson: true },
];

export function parseDecorationItems(raw) {
  if (!raw) return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function platesForCategory(packages, packageId, category) {
  const pkg = packages.find((item) => item.id === Number(packageId));
  return pkg?.plates?.filter((plate) => plate.category === category) ?? [];
}

export function getDecoracionPlates(packages) {
  const soloPackage = packages.find((pkg) => pkg.type === 'solo_alquiler');
  const source = soloPackage ?? packages[0];
  return source?.plates?.filter((plate) => plate.category === 'decoracion') ?? [];
}

export function isPlatoFondoCategory(category) {
  return category === PLATO_FONDO_CATEGORY;
}

export function isPlatoFondoPlate(plate) {
  return isPlatoFondoCategory(plate?.category) || !plate?.category;
}

export function isPlatoFondoIncludeText(text) {
  if (!text || typeof text !== 'string') return false;
  return text.trim().toLowerCase().startsWith('plato de fondo');
}

export function isBiomboTematicoName(name) {
  return String(name ?? '').trim().toLowerCase() === BIOMBO_TEMATICO_NAME.toLowerCase();
}

export function formatPlateOptionLabel(plate) {
  if (plate.category === 'bebida' && Number(plate.price_per_plate) > 0) {
    return `${plate.name} — S/. ${Number(plate.price_per_plate).toFixed(2)}/persona`;
  }
  if (plate.description) {
    return `${plate.name} — ${plate.description}`;
  }
  if (plate.price_per_plate > 0) {
    return `${plate.name} — S/. ${Number(plate.price_per_plate).toFixed(2)}/persona`;
  }
  return plate.name;
}

export function formatThemeOptionLabel(theme) {
  const price = Number(theme.price) || 0;
  if (theme.description) {
    return `${theme.name} — ${theme.description}`;
  }
  if (price > 0) {
    return `${theme.name} — S/. ${price.toFixed(2)}/unidad`;
  }
  return theme.name;
}
