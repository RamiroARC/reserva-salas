import { JAZMINES } from './catalogs/jazminesCatalog.js';
import { VENUE } from './catalogs/venue.js';
import { seedDecorationThemeOptions } from './catalogs/decorationThemeOptionsCatalog.js';
import { seedLocalCatalogs } from './services/localSeed.js';
import { hashPassword } from './services/password.js';
import {
  C,
  dbHandle,
  ensureIndexes,
  findById,
  insertDoc,
  nowIso,
  updateById,
} from './mongo.js';

const DEFAULT_COMPANY_NAME = VENUE.name;

export async function createLocal(companyId, data) {
  const info = await insertDoc('rooms', {
    company_id: companyId,
    name: data.name,
    capacity: data.capacity ?? 100,
    floor: 1,
    base_rental_price: data.baseRentalPrice ?? 0,
    amenities: JSON.stringify(data.amenities ?? []),
    description: data.description ?? '',
    address: data.address ?? '',
    owner_name: data.ownerName ?? '',
    owner_dni: data.ownerDni ?? '',
    phones: JSON.stringify(data.phones ?? []),
    banner_path: data.bannerPath ?? '',
    extension_per_hour: data.extensionPerHour ?? 0,
    package_includes: JSON.stringify(data.packageIncludes ?? []),
    decoration_biombo: data.decorationBiombo ?? '',
    decoration_tematico: data.decorationTematico ?? '',
    decoration_extras: data.decorationExtras ?? '',
    extras_terms: data.extrasTerms ?? '',
    active: 1,
  });

  const localId = Number(info.lastInsertRowid);
  await seedLocalCatalogs(localId, data.name);
  return localId;
}

async function bootstrapEmptyDatabase() {
  const [rooms, companies] = await Promise.all([
    C('rooms').countDocuments(),
    C('companies').countDocuments(),
  ]);

  if (rooms > 0 || companies > 0) {
    const firstCompany = await C('companies').findOne({}, { sort: { _id: 1 } });
    return firstCompany?._id ?? null;
  }

  const companyInfo = await insertDoc('companies', {
    name: DEFAULT_COMPANY_NAME,
    tax_id: '',
    logo_path: '/banner-jazmines.png',
    active: 1,
    created_at: nowIso(),
  });
  const companyId = Number(companyInfo.lastInsertRowid);

  await createLocal(companyId, {
    name: VENUE.name,
    capacity: VENUE.capacity,
    baseRentalPrice: VENUE.baseRentalPrice,
    amenities: VENUE.amenities,
    description: VENUE.description,
    ownerDni: JAZMINES.ownerDni,
    phones: JAZMINES.phones,
    extensionPerHour: JAZMINES.extensionPerHour,
    packageIncludes: JAZMINES.packageIncludes,
    decorationBiombo: JAZMINES.decoration.biombo,
    decorationTematico: JAZMINES.decoration.tematico,
    decorationExtras: JAZMINES.decoration.extras,
    extrasTerms: JAZMINES.extrasTerms,
  });

  return companyId;
}

async function bootstrapUsers(defaultCompanyId) {
  const hasSuperadmin = await C('users').findOne({ role: 'superadmin' });

  if (!hasSuperadmin) {
    const username = process.env.SUPERADMIN_USER || 'superadmin';
    const password = process.env.SUPERADMIN_PASSWORD || 'superadmin123';

    await insertDoc('users', {
      company_id: null,
      username,
      full_name: 'Super administrador',
      password_hash: hashPassword(password),
      role: 'superadmin',
      active: 1,
      created_at: nowIso(),
    });

    if (!process.env.SUPERADMIN_PASSWORD) {
      console.warn(
        `[auth] Superadmin creado: usuario "${username}" con contraseña "${password}". Cámbiala cuanto antes.`
      );
    }
  }

  if (!defaultCompanyId) return;

  const hasCompanyUser = await C('users').findOne({ company_id: defaultCompanyId });
  if (hasCompanyUser) return;

  await insertDoc('users', {
    company_id: defaultCompanyId,
    username: 'admin',
    full_name: 'Administrador',
    password_hash: hashPassword('admin123'),
    role: 'admin',
    active: 1,
    created_at: nowIso(),
  });

  console.warn('[auth] Admin de empresa creado: usuario "admin" con contraseña "admin123".');
}

async function seedExistingLocalThemeOptions() {
  const rooms = await C('rooms').find({}).toArray();
  for (const room of rooms) {
    await seedDecorationThemeOptions(room._id);
  }
  await C('decoration_theme_options').updateMany(
    { price: { $exists: false } },
    { $set: { price: 0 } }
  );
}

let initialized;

export async function initDb() {
  if (initialized) return initialized;

  initialized = (async () => {
    await dbHandle();
    await ensureIndexes();
    const companyId = await bootstrapEmptyDatabase();
    await seedExistingLocalThemeOptions();
    await bootstrapUsers(companyId);
    await C('companies').updateMany(
      {
        name: DEFAULT_COMPANY_NAME,
        $or: [{ logo_path: { $exists: false } }, { logo_path: null }, { logo_path: '' }],
      },
      { $set: { logo_path: '/banner-jazmines.png' } }
    );
  })();

  return initialized;
}

export { C, findById, insertDoc, updateById };
export default { initDb };
