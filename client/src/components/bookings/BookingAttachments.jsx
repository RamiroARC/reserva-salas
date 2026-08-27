import { useRef } from 'react';
import {
  createPendingAttachment,
  formatFileType,
  isImageMimeType,
  isPdfMimeType,
  revokeAttachmentPreview,
} from '../../utils/fileAttachments';

function AttachmentThumbnail({ attachment }) {
  const src = attachment.previewUrl || attachment.url;
  const mimeType = attachment.mimeType ?? '';

  if (isImageMimeType(mimeType) && src) {
    return <img className="booking-attachment__thumb" src={src} alt="" />;
  }

  if (isPdfMimeType(mimeType)) {
    return (
      <div className="booking-attachment__thumb booking-attachment__thumb--pdf" aria-hidden="true">
        PDF
      </div>
    );
  }

  return (
    <div className="booking-attachment__thumb booking-attachment__thumb--file" aria-hidden="true">
      DOC
    </div>
  );
}

export default function BookingAttachments({
  attachments = [],
  onChange,
  onUpload,
  readOnly = false,
  uploading = false,
}) {
  const inputRef = useRef(null);

  const handleSelectFiles = async (event) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';

    if (!files.length) return;

    if (onUpload) {
      for (const file of files) {
        await onUpload(file);
      }
      return;
    }

    const pending = files.map(createPendingAttachment);
    onChange?.([...attachments, ...pending]);
  };

  const handleRemove = (attachment) => {
    if (readOnly) return;
    revokeAttachmentPreview(attachment);
    onChange?.(attachments.filter((item) => item.id !== attachment.id));
  };

  return (
    <div className="booking-attachments">
      <div className="booking-attachments__header">
        <p className="booking-attachments__title">Archivos adjuntos</p>
        {!readOnly && (
          <>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? 'Subiendo…' : 'Adjuntar'}
            </button>
            <input
              ref={inputRef}
              type="file"
              className="booking-attachments__input"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
              multiple
              onChange={handleSelectFiles}
            />
          </>
        )}
      </div>

      {attachments.length === 0 ? (
        <p className="booking-attachments__hint">
          {readOnly
            ? 'No hay archivos adjuntos en esta reserva.'
            : 'Adjunta referencias, fotos o documentos del evento.'}
        </p>
      ) : (
        <ul className="booking-attachments__list">
          {attachments.map((attachment) => (
            <li key={attachment.id} className="booking-attachment">
              <AttachmentThumbnail attachment={attachment} />
              <div className="booking-attachment__meta">
                <span className="booking-attachment__name" title={attachment.name}>
                  {attachment.name}
                </span>
                <span className="booking-attachment__type">
                  {formatFileType(attachment.mimeType, attachment.name)}
                </span>
              </div>
              {!readOnly && (
                <button
                  type="button"
                  className="booking-attachment__remove"
                  onClick={() => handleRemove(attachment)}
                  aria-label={`Quitar ${attachment.name}`}
                  title="Quitar archivo"
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
