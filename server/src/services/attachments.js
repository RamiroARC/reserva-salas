import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const UPLOADS_ROOT = process.env.VERCEL
  ? path.join('/tmp', 'uploads')
  : path.join(__dirname, '..', '..', 'uploads');

export const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;

const ALLOWED_MIME_PREFIXES = ['image/', 'application/pdf'];
const ALLOWED_MIME_TYPES = new Set([
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

export function parseAttachments(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function serializeAttachments(items = []) {
  return JSON.stringify(
    items.map((item) => ({
      id: item.id,
      name: item.name,
      mimeType: item.mimeType,
      storedName: item.storedName,
      size: item.size ?? 0,
    }))
  );
}

export function bookingUploadDir(bookingId) {
  return path.join(UPLOADS_ROOT, 'bookings', String(bookingId));
}

export function ensureUploadDir(bookingId) {
  const dir = bookingUploadDir(bookingId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function extensionFromName(name = '') {
  const ext = path.extname(name).toLowerCase();
  return ext || '';
}

function mimeFromExtension(ext) {
  const map = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
  return map[ext] ?? 'application/octet-stream';
}

export function isAllowedMimeType(mimeType) {
  if (!mimeType) return false;
  if (ALLOWED_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix))) return true;
  return ALLOWED_MIME_TYPES.has(mimeType);
}

export function normalizeAttachmentInput({ name, mimeType, dataBase64 }) {
  if (!name?.trim() || !dataBase64) {
    return { error: 'Archivo inválido' };
  }

  const buffer = Buffer.from(dataBase64, 'base64');
  if (!buffer.length) return { error: 'Archivo vacío' };
  if (buffer.length > MAX_ATTACHMENT_BYTES) {
    return { error: `El archivo supera ${MAX_ATTACHMENT_BYTES / (1024 * 1024)} MB` };
  }

  const ext = extensionFromName(name.trim());
  const resolvedMime = mimeType?.trim() || mimeFromExtension(ext);
  if (!isAllowedMimeType(resolvedMime)) {
    return { error: 'Tipo de archivo no permitido' };
  }

  const storedName = `${crypto.randomUUID()}${ext || ''}`;

  return {
    attachment: {
      id: crypto.randomUUID(),
      name: name.trim(),
      mimeType: resolvedMime,
      storedName,
      size: buffer.length,
    },
    buffer,
  };
}

export function writeAttachmentFile(bookingId, storedName, buffer) {
  const dir = ensureUploadDir(bookingId);
  const filePath = path.join(dir, storedName);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

export function deleteAttachmentFile(bookingId, storedName) {
  const filePath = path.join(bookingUploadDir(bookingId), storedName);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

export function deleteBookingUploads(bookingId) {
  const dir = bookingUploadDir(bookingId);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export function attachmentPublicUrl(bookingId, storedName) {
  return `/uploads/bookings/${bookingId}/${storedName}`;
}

export function enrichBookingAttachments(booking) {
  if (!booking) return booking;

  const attachments = parseAttachments(booking.attachments).map((item) => ({
    ...item,
    url: attachmentPublicUrl(booking.id, item.storedName),
  }));

  return { ...booking, attachments };
}
