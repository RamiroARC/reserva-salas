/**
 * Clona los datos de PRODUCCIÓN (gestion-reservas) a DESARROLLO (reserva-salas-dev).
 *
 * SEGURIDAD:
 *   - Producción se abre en modo SOLO LECTURA (nunca se escribe en ella).
 *   - El destino DEBE ser exactamente `reserva-salas-dev`; si no, el script aborta.
 *   - Antes de copiar, vacía cada colección de destino (estrategia de sobrescritura),
 *     dejando dev "tal cual está" producción.
 *
 * USO (desde la carpeta server/):
 *   node scripts/clone-prod-to-dev.mjs           # simulación (dry-run): no escribe nada
 *   node scripts/clone-prod-to-dev.mjs --apply   # ejecuta la copia real
 *
 * Toma la conexión del .env de la raíz (MONGODB_URI). La base de origen se deriva
 * cambiando el nombre de base a PROD_DB_NAME; el destino se valida contra DEV_DB_NAME.
 */
import '../src/loadEnv.js';
import { MongoClient } from 'mongodb';

const PROD_DB_NAME = 'gestion-reservas';
const DEV_DB_NAME = 'reserva-salas-dev';

const APPLY = process.argv.includes('--apply');

function log(msg) { console.log(msg); }
function warn(msg) { console.warn(`[!] ${msg}`); }

function buildUriForDb(baseUri, dbName) {
  // Reemplaza el nombre de base en la URI (…/<db>?…) por dbName, preservando query params.
  // Soporta URIs con o sin query string.
  const [beforeQuery, query = ''] = baseUri.split('?');
  const withoutTrailingSlash = beforeQuery.replace(/\/+$/, '');
  // Quita el último segmento (nombre de base actual) si existe tras el host.
  // Formato: mongodb+srv://user:pass@host/<db>
  const slashIdx = withoutTrailingSlash.indexOf('/', withoutTrailingSlash.indexOf('@'));
  const hostPart = slashIdx === -1 ? withoutTrailingSlash : withoutTrailingSlash.slice(0, slashIdx);
  const rebuilt = `${hostPart}/${dbName}`;
  return query ? `${rebuilt}?${query}` : rebuilt;
}

async function main() {
  const baseUri = process.env.MONGODB_URI;
  if (!baseUri) throw new Error('MONGODB_URI no está configurada en el .env');

  const prodUri = buildUriForDb(baseUri, PROD_DB_NAME);
  const devUri = buildUriForDb(baseUri, DEV_DB_NAME);

  log('==============================================');
  log(`  Clonado PROD → DEV  ${APPLY ? '(APPLY — escribe en dev)' : '(DRY-RUN — no escribe nada)'}`);
  log(`  Origen  (solo lectura): ${PROD_DB_NAME}`);
  log(`  Destino (escritura)   : ${DEV_DB_NAME}`);
  log('==============================================');

  const prodClient = new MongoClient(prodUri, { maxPoolSize: 5 });
  const devClient = new MongoClient(devUri, { maxPoolSize: 5 });

  try {
    await prodClient.connect();
    await devClient.connect();

    const prodDb = prodClient.db();
    const devDb = devClient.db();

    // GUARDA DE SEGURIDAD: el destino debe ser exactamente reserva-salas-dev.
    if (devDb.databaseName !== DEV_DB_NAME) {
      throw new Error(
        `ABORTADO: el destino resolvió a "${devDb.databaseName}", no a "${DEV_DB_NAME}". ` +
        'No se escribirá para proteger otras bases.'
      );
    }
    // GUARDA: el origen no puede ser el mismo que el destino.
    if (prodDb.databaseName === devDb.databaseName) {
      throw new Error('ABORTADO: origen y destino son la misma base.');
    }

    const collections = await prodDb.listCollections().toArray();
    if (collections.length === 0) {
      warn(`La base de producción "${PROD_DB_NAME}" no tiene colecciones. Nada que copiar.`);
      return;
    }

    log(`\nColecciones en producción: ${collections.length}\n`);

    let totalDocs = 0;
    for (const { name } of collections) {
      const prodCol = prodDb.collection(name);
      const count = await prodCol.countDocuments();
      totalDocs += count;

      if (!APPLY) {
        log(`  [dry-run] ${name}: ${count} documentos se copiarían`);
        continue;
      }

      const devCol = devDb.collection(name);
      await devCol.deleteMany({});             // limpia destino (sobrescritura)
      if (count > 0) {
        const docs = await prodCol.find({}).toArray();
        // Inserta en lotes para colecciones grandes
        const BATCH = 500;
        for (let i = 0; i < docs.length; i += BATCH) {
          await devCol.insertMany(docs.slice(i, i + BATCH), { ordered: false });
        }
      }
      log(`  [copiado] ${name}: ${count} documentos`);
    }

    log(`\n${APPLY ? 'Copia completada' : 'Simulación completada'}. Total de documentos: ${totalDocs}`);
    if (!APPLY) {
      log('\nPara ejecutar la copia real, vuelve a correr con la bandera --apply:');
      log('  node scripts/clone-prod-to-dev.mjs --apply');
    }
  } finally {
    await prodClient.close();
    await devClient.close();
  }
}

main().catch((err) => {
  console.error('\nError:', err.message);
  process.exit(1);
});
