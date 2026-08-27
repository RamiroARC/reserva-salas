import { C, fromDocs } from '../mongo.js';
import { SESSION_COOKIE, getSessionUser } from '../services/auth.js';
import { asyncHandler } from '../http.js';

export const requireAuth = asyncHandler(async (req, res, next) => {
  const user = await getSessionUser(req.cookies?.[SESSION_COOKIE]);

  if (!user) {
    return res.status(401).json({ error: 'Sesión no válida o expirada' });
  }

  req.user = user;
  next();
});

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'No tienes permisos para esta acción' });
    }
    next();
  };
}

export async function listUserLocals(user) {
  if (!user?.company_id) return [];

  return fromDocs(
    await C('rooms')
      .find(
        { company_id: user.company_id, active: 1 },
        {
          projection: {
            name: 1,
            capacity: 1,
            base_rental_price: 1,
            description: 1,
            active: 1,
          },
        }
      )
      .sort({ name: 1 })
      .toArray()
  );
}

export const resolveLocal = asyncHandler(async (req, res, next) => {
  if (!req.user?.company_id) {
    return res.status(403).json({ error: 'El superadministrador no opera locales' });
  }

  const header = req.get('X-Local-Id') ?? req.query.localId;
  const requestedId = Number(header);

  const local = requestedId
    ? await C('rooms').findOne({
        _id: requestedId,
        company_id: req.user.company_id,
        active: 1,
      })
    : await C('rooms').findOne(
        { company_id: req.user.company_id, active: 1 },
        { sort: { name: 1 } }
      );

  if (!local) {
    return res.status(404).json({ error: 'Local no disponible para tu empresa' });
  }

  req.localId = local._id;
  next();
});
