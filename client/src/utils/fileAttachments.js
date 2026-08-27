export function parseBookingAttachments(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function formatFileType(mimeType = '', fileName = '') {
  const mime = mimeType.toLowerCase();
  if (mime.startsWith('image/')) {
    const subtype = mime.split('/')[1]?.toUpperCase() ?? 'IMAGEN';
    return `Imagen ${subtype}`;
  }
  if (mime === 'application/pdf') return 'PDF';
  if (mime.includes('word')) return 'Word';
  if (mime.includes('sheet') || mime.includes('excel')) return 'Excel';

  const ext = fileName.includes('.') ? fileName.split('.').pop().toUpperCase() : '';
  return ext || 'Archivo';
}

export function isImageMimeType(mimeType = '') {
  return mimeType.startsWith('image/');
}

export function isPdfMimeType(mimeType = '') {
  return mimeType === 'application/pdf';
}

export function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(file);
  });
}

export function createPendingAttachment(file) {
  return {
    id: crypto.randomUUID(),
    name: file.name,
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
    previewUrl: URL.createObjectURL(file),
    pending: true,
    file,
  };
}

export function revokeAttachmentPreview(attachment) {
  if (attachment?.previewUrl?.startsWith('blob:')) {
    URL.revokeObjectURL(attachment.previewUrl);
  }
}

export function revokeAllAttachmentPreviews(attachments = []) {
  attachments.forEach(revokeAttachmentPreview);
}
