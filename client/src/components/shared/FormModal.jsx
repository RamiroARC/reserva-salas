import { useEffect } from 'react';
import { IconButton } from '../../design-system';

export default function FormModal({
  title,
  subtitle,
  onClose,
  children,
  wide = false,
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKey = (event) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  return (
    <div className="form-modal" role="dialog" aria-modal="true" aria-labelledby="form-modal-title">
      <div className="form-modal__backdrop" onClick={onClose} />
      <div className={`form-modal__panel${wide ? ' form-modal__panel--wide' : ''}`}>
        <header className="form-modal__header">
          <div>
            <strong id="form-modal-title">{title}</strong>
            {subtitle && <span>{subtitle}</span>}
          </div>
          <IconButton name="close" label="Cerrar" onClick={onClose} />
        </header>
        <div className="form-modal__body">{children}</div>
      </div>
    </div>
  );
}
