import { nowIso } from '../mongo.js';

export const COMPANY_LOGO_MAX_BYTES = 1.5 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]);

export function resolveCompanyLogoUrl(company) {
  if (!company) return null;
  if (company.logo_data) {
    const version = company.logo_updated_at ? `?v=${encodeURIComponent(company.logo_updated_at)}` : '';
    return `/api/company-logos/${company.id}${version}`;
  }
  return company.logo_path?.trim() || null;
}

export function parseCompanyLogoPayload(logo) {
  if (logo === undefined) return { skip: true };

  if (logo === null || logo.clear) {
    return {
      fields: {
        logo_data: '',
        logo_mime: '',
        logo_updated_at: nowIso(),
      },
    };
  }

  const mime = String(logo.mimeType || '').toLowerCase();
  if (!ALLOWED_TYPES.has(mime)) {
    return { error: 'El logo debe ser PNG, JPG, WEBP, GIF o SVG' };
  }

  const data = String(logo.dataBase64 || '').replace(/\s/g, '');
  if (!data) return { error: 'No se pudo leer el logo' };

  let bytes;
  try {
    bytes = Buffer.from(data, 'base64');
  } catch {
    return { error: 'No se pudo leer el logo' };
  }

  if (!bytes.length) return { error: 'No se pudo leer el logo' };
  if (bytes.length > COMPANY_LOGO_MAX_BYTES) {
    return { error: 'El logo no puede superar 1.5 MB' };
  }

  return {
    fields: {
      logo_data: data,
      logo_mime: mime === 'image/jpg' ? 'image/jpeg' : mime,
      logo_updated_at: nowIso(),
    },
  };
}
