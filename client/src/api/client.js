const API = '/api';

let activeLocalId = null;
let unauthorizedHandler = null;

export function setActiveLocalId(localId) {
  activeLocalId = localId ?? null;
}

export function getActiveLocalId() {
  return activeLocalId;
}

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

export async function request(path, { method = 'GET', body, fallbackError } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (activeLocalId) headers['X-Local-Id'] = String(activeLocalId);

  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (res.status === 401) {
    const data = await res.json().catch(() => ({}));
    if (path === '/auth/login') {
      throw new Error(data.error || 'Usuario o contraseña incorrectos');
    }
    unauthorizedHandler?.();
    throw new Error(data.error || 'Tu sesión expiró. Vuelve a iniciar sesión.');
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || fallbackError || 'No se pudo completar la operación');
  }

  if (res.status === 204) return null;
  return res.json();
}
