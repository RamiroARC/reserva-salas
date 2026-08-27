export const LEGACY_DECORATION_COLORS = [
  { value: 'rosa', label: 'Rosa', hex: '#f472b6' },
  { value: 'dorado', label: 'Dorado', hex: '#d4af37' },
  { value: 'blanco', label: 'Blanco', hex: '#f8fafc' },
  { value: 'rojo', label: 'Rojo', hex: '#dc2626' },
  { value: 'azul', label: 'Azul', hex: '#2563eb' },
  { value: 'verde', label: 'Verde', hex: '#16a34a' },
  { value: 'morado', label: 'Morado', hex: '#7c3aed' },
  { value: 'celeste', label: 'Celeste', hex: '#38bdf8' },
  { value: 'plateado', label: 'Plateado', hex: '#cbd5e1' },
  { value: 'negro', label: 'Negro', hex: '#1f2937' },
  { value: 'beige', label: 'Beige', hex: '#d6cbb8' },
  { value: 'fucsia', label: 'Fucsia', hex: '#d946ef' },
];

export function mapDecorationColorRow(row) {
  return {
    id: row.id,
    value: row.value,
    label: row.name,
    hex: row.hex,
    sortOrder: row.sort_order,
    active: row.active !== false,
  };
}

export function buildDecorationColorCatalog(rows = []) {
  return rows
    .filter((row) => row.active !== false)
    .map(mapDecorationColorRow)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.label.localeCompare(b.label, 'es'));
}

function humanizeColorValue(value) {
  return String(value).replace(/_/g, ' ');
}

export function findDecorationColor(value, catalog = LEGACY_DECORATION_COLORS) {
  if (!value) return null;

  const normalized = String(value).trim().toLowerCase();

  return (
    catalog.find(
      (color) =>
        color.value === value ||
        color.label.toLowerCase() === normalized
    ) ??
    LEGACY_DECORATION_COLORS.find(
      (color) =>
        color.value === value ||
        color.label.toLowerCase() === normalized
    )
  );
}

export function getDecorationColorHex(value, catalog = LEGACY_DECORATION_COLORS) {
  return findDecorationColor(value, catalog)?.hex ?? '#cbd5e1';
}

export function getDecorationColorLabel(value, catalog = LEGACY_DECORATION_COLORS) {
  return findDecorationColor(value, catalog)?.label ?? humanizeColorValue(value);
}

export function parseDecorationColors(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
  } catch {
    /* texto libre anterior */
  }
  return value
    .split(/[,;|/]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function serializeDecorationColors(colors) {
  if (!colors?.length) return '';
  return JSON.stringify(colors);
}

export function formatDecorationColors(value, catalog = LEGACY_DECORATION_COLORS) {
  const items = parseDecorationColors(value);
  if (!items.length) return '';

  return items.map((item) => getDecorationColorLabel(item, catalog)).join(', ');
}
