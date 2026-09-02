import express from 'express';
import cors from 'cors';
import { cookieParser } from './middleware/cookies.js';
import authRouter from './routes/auth.js';
import companiesRouter from './routes/companies.js';
import usersRouter from './routes/users.js';
import localsRouter from './routes/locals.js';
import venueRouter from './routes/venue.js';
import eventTypesRouter from './routes/eventTypes.js';
import bookingsRouter from './routes/bookings.js';
import packagesRouter from './routes/packages.js';
import promotionalPackagesRouter from './routes/promotionalPackages.js';
import promotionalOptionalItemsRouter from './routes/promotionalOptionalItems.js';
import decorationColorsRouter from './routes/decorationColors.js';
import contractExtraTermsRouter from './routes/contractExtraTerms.js';
import decorationThemeOptionsRouter from './routes/decorationThemeOptions.js';
import promotionalPlatoFondoRouter from './routes/promotionalPlatoFondo.js';
import packageIncludesRouter from './routes/packageIncludes.js';
import projectionsRouter from './routes/projections.js';
import attachmentsRouter from './routes/attachments.js';
import companyLogosRouter from './routes/companyLogos.js';
import { initDb } from './db.js';
import { requireAuth, requireRole, resolveLocal } from './middleware/auth.js';
import { recalculateAllBookingPayments } from './services/recalculateBalances.js';

let bootPromise;

function ensureBooted() {
  if (!bootPromise) {
    bootPromise = initDb()
      .then(() => recalculateAllBookingPayments())
      .catch((err) => {
        bootPromise = null;
        throw err;
      });
  }
  return bootPromise;
}

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '12mb' }));
app.use(cookieParser);

app.get('/api/health', async (_req, res) => {
  try {
    await ensureBooted();
    res.json({ status: 'ok', service: 'reserva-salas', db: 'mongodb' });
  } catch {
    res.status(503).json({
      status: 'error',
      service: 'reserva-salas',
      db: 'mongodb',
      error: 'No se pudo conectar a MongoDB Atlas',
    });
  }
});

app.use((req, res, next) => {
  if (req.path === '/api/health') return next();
  ensureBooted().then(() => next()).catch(next);
});

app.use('/api/auth', authRouter);

app.use('/api/companies', requireAuth, requireRole('superadmin'), companiesRouter);
app.use('/api/company-logos', requireAuth, companyLogosRouter);
app.use('/api/users', requireAuth, requireRole('admin'), usersRouter);
app.use('/api/locals', requireAuth, localsRouter);

const tenantScoped = [requireAuth, resolveLocal];

app.use('/uploads', requireAuth, attachmentsRouter);
app.use('/api/venue', tenantScoped, venueRouter);
app.use('/api/event-types', tenantScoped, eventTypesRouter);
app.use('/api/bookings', tenantScoped, bookingsRouter);
app.use('/api/packages', tenantScoped, packagesRouter);
app.use('/api/promotional-packages', tenantScoped, promotionalPackagesRouter);
app.use('/api/promotional-optional-items', tenantScoped, promotionalOptionalItemsRouter);
app.use('/api/decoration-colors', tenantScoped, decorationColorsRouter);
app.use('/api/contract-extra-terms', tenantScoped, contractExtraTermsRouter);
app.use('/api/promotional-plato-fondo', tenantScoped, promotionalPlatoFondoRouter);
app.use('/api/decoration-theme-options', tenantScoped, decorationThemeOptionsRouter);
app.use('/api/package-includes', tenantScoped, packageIncludesRouter);
app.use('/api/projections', tenantScoped, projectionsRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

app.use((err, _req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ error: err.message || 'Error interno' });
});

export default app;

if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3001;
  ensureBooted()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Servidor en http://localhost:${PORT}`);
      });
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
