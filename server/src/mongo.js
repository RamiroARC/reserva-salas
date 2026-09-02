import { MongoClient } from 'mongodb';

let clientPromise;

export function nowIso() {
  return new Date().toISOString();
}

export function nid(value) {
  return Number(value);
}

export function fromDoc(doc) {
  if (!doc) return undefined;
  const { _id, ...rest } = doc;
  return { id: _id, ...rest };
}

export function fromDocs(docs) {
  return docs.map(fromDoc);
}

function resolveMongoUri() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI no está configurada');
  }

  const authSource = process.env.MONGODB_AUTH_SOURCE;
  if (authSource && !/[?&]authSource=/.test(uri)) {
    const join = uri.includes('?') ? '&' : '?';
    return `${uri}${join}authSource=${encodeURIComponent(authSource)}`;
  }

  return uri;
}

function mongoPublicError(err) {
  const message = String(err?.message || '');
  if (
    err?.code === 18 ||
    message.includes('bad auth') ||
    message.includes('Authentication failed') ||
    message.includes('authentication failed')
  ) {
    const wrapped = new Error(
      'No se pudo conectar a MongoDB Atlas. El usuario de Database Access no coincide con MONGODB_URI.'
    );
    wrapped.status = 503;
    wrapped.cause = err;
    return wrapped;
  }
  return err;
}

export async function getClient() {
  if (!clientPromise) {
    const client = new MongoClient(resolveMongoUri(), { maxPoolSize: 10 });
    clientPromise = client.connect().catch((err) => {
      clientPromise = null;
      throw mongoPublicError(err);
    });
  }

  return clientPromise;
}

export async function getDb() {
  const client = await getClient();
  return client.db();
}

export function col(name, db) {
  if (!db) {
    throw new Error('La base de datos MongoDB aún no está inicializada');
  }
  return db.collection(name);
}

let cachedDb;

export async function dbHandle() {
  if (!cachedDb) cachedDb = await getDb();
  return cachedDb;
}

export function C(name) {
  if (!cachedDb) {
    throw new Error('La base de datos MongoDB aún no está inicializada');
  }
  return cachedDb.collection(name);
}

export async function nextId(name, options = {}) {
  const result = await C('counters').findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after', ...options }
  );
  const doc = result?.seq != null ? result : result?.value;
  if (!doc?.seq) {
    throw new Error(`No se pudo generar el siguiente id para ${name}`);
  }
  return doc.seq;
}

export async function insertDoc(name, fields, options = {}) {
  const id = fields.id ?? (await nextId(name, options));
  const doc = { _id: id, ...fields };
  delete doc.id;
  await C(name).insertOne(doc, options);
  return { lastInsertRowid: id, changes: 1 };
}

export async function updateById(name, id, $set, options = {}) {
  const result = await C(name).updateOne({ _id: nid(id) }, { $set }, options);
  return { changes: result.matchedCount };
}

export async function deleteById(name, id, options = {}) {
  const result = await C(name).deleteOne({ _id: nid(id) }, options);
  return { changes: result.deletedCount };
}

export async function findById(name, id, options = {}) {
  return fromDoc(await C(name).findOne({ _id: nid(id) }, options));
}

export async function withTransaction(fn) {
  const client = await getClient();
  const session = client.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

export async function ensureIndexes() {
  const db = await dbHandle();

  await db.collection('companies').createIndex({ name: 1 }, { unique: true });
  await db.collection('users').createIndex({ username: 1 }, { unique: true });
  await db.collection('users').createIndex({ company_id: 1 });
  await db.collection('sessions').createIndex({ user_id: 1 });
  await db.collection('sessions').createIndex({ expires_at: 1 });
  await db.collection('rooms').createIndex({ company_id: 1, name: 1 }, { unique: true });
  await db.collection('packages').createIndex({ local_id: 1, name: 1 }, { unique: true });
  await db.collection('menu_plates').createIndex({ package_id: 1 });
  await db.collection('season_rates').createIndex({ local_id: 1 });
  await db.collection('bookings').createIndex({ room_id: 1, start_time: 1, end_time: 1 });
  await db.collection('bookings').createIndex({ room_id: 1, status: 1, start_time: 1, end_time: 1 });
  await db.collection('payments').createIndex({ booking_id: 1 });
  await db.collection('event_types').createIndex({ local_id: 1, name: 1 }, { unique: true });
  await db.collection('promotional_packages').createIndex({ local_id: 1 });
  await db.collection('promotional_optional_items').createIndex({ local_id: 1 });
  await db.collection('decoration_colors').createIndex({ local_id: 1, value: 1 }, { unique: true });
  await db.collection('decoration_colors').createIndex({ local_id: 1, name: 1 }, { unique: true });
  await db.collection('contract_extra_terms').createIndex({ local_id: 1 });
  await db.collection('package_include_items').createIndex({ local_id: 1 });
  await db.collection('promotional_plato_fondo').createIndex({ promotional_package_id: 1 });
  await db.collection('decoration_theme_options').createIndex({ local_id: 1 });
}

export async function deleteLocalCascade(localId, options = {}) {
  const id = nid(localId);
  const packages = await C('packages').find({ local_id: id }, options).toArray();
  const packageIds = packages.map((item) => item._id);
  if (packageIds.length) {
    await C('menu_plates').deleteMany({ package_id: { $in: packageIds } }, options);
  }
  await C('packages').deleteMany({ local_id: id }, options);
  await C('season_rates').deleteMany({ local_id: id }, options);
  await C('event_types').deleteMany({ local_id: id }, options);

  const promos = await C('promotional_packages').find({ local_id: id }, options).toArray();
  const promoIds = promos.map((item) => item._id);
  if (promoIds.length) {
    await C('promotional_plato_fondo').deleteMany(
      { promotional_package_id: { $in: promoIds } },
      options
    );
  }
  await C('promotional_packages').deleteMany({ local_id: id }, options);
  await C('promotional_optional_items').deleteMany({ local_id: id }, options);
  await C('decoration_colors').deleteMany({ local_id: id }, options);
  await C('decoration_theme_options').deleteMany({ local_id: id }, options);
  await C('contract_extra_terms').deleteMany({ local_id: id }, options);
  await C('package_include_items').deleteMany({ local_id: id }, options);

  const bookings = await C('bookings').find({ room_id: id }, options).toArray();
  const bookingIds = bookings.map((item) => item._id);
  if (bookingIds.length) {
    await C('payments').deleteMany({ booking_id: { $in: bookingIds } }, options);
  }
  await C('bookings').deleteMany({ room_id: id }, options);
  await C('rooms').deleteOne({ _id: id }, options);
}

export async function deleteCompanyCascade(companyId) {
  const id = nid(companyId);
  const users = await C('users').find({ company_id: id }).toArray();
  const userIds = users.map((item) => item._id);
  if (userIds.length) {
    await C('sessions').deleteMany({ user_id: { $in: userIds } });
  }
  await C('users').deleteMany({ company_id: id });
  const rooms = await C('rooms').find({ company_id: id }).toArray();
  for (const room of rooms) {
    await deleteLocalCascade(room._id);
  }
  await C('companies').deleteOne({ _id: id });
}
