export const LOCAL_SELECT = `
  SELECT id, company_id, name, capacity, floor, base_rental_price, amenities, description,
         address, owner_name, owner_dni, phones, banner_path, extension_per_hour,
         package_includes, decoration_biombo, decoration_tematico, decoration_extras,
         extras_terms, active
  FROM rooms
`;

function parseList(raw) {
  if (Array.isArray(raw)) return raw;
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function normalizeList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value ?? '')
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function serializeLocal(row) {
  if (!row) return null;

  return {
    id: row.id,
    company_id: row.company_id,
    name: row.name,
    capacity: row.capacity,
    base_rental_price: row.base_rental_price,
    description: row.description,
    amenities: parseList(row.amenities),
    address: row.address ?? '',
    ownerName: row.owner_name ?? '',
    ownerDni: row.owner_dni ?? '',
    phones: parseList(row.phones),
    bannerPath: row.banner_path ?? '',
    extensionPerHour: row.extension_per_hour ?? 0,
    packageIncludes: parseList(row.package_includes),
    decoration: {
      biombo: row.decoration_biombo ?? '',
      tematico: row.decoration_tematico ?? '',
      extras: row.decoration_extras ?? '',
    },
    extrasTerms: row.extras_terms ?? '',
    active: Boolean(row.active),
  };
}
