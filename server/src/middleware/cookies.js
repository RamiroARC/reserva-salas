// Parser mínimo de cookies para no depender de cookie-parser.
export function cookieParser(req, _res, next) {
  const header = req.headers.cookie;
  const cookies = {};

  if (header) {
    for (const part of header.split(';')) {
      const index = part.indexOf('=');
      if (index < 0) continue;

      const name = part.slice(0, index).trim();
      if (!name) continue;

      const value = part.slice(index + 1).trim();
      try {
        cookies[name] = decodeURIComponent(value);
      } catch {
        cookies[name] = value;
      }
    }
  }

  req.cookies = cookies;
  next();
}
