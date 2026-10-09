import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Carga el .env de la raíz del repositorio (dos niveles arriba de server/src/).
// Debe importarse ANTES que cualquier módulo que lea process.env.
// En producción (Vercel) las variables ya vienen inyectadas por la plataforma;
// dotenv no sobrescribe las que ya existen.
const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, '../../.env') });
