import { useEffect } from 'react';
import IconButton from './IconButton';

export default function Snackbar({ message, error = false, onClose, timeout = 4000 }) {
  useEffect(() => {
    if (!message || !onClose) return undefined;
    const id = window.setTimeout(onClose, timeout);
    return () => window.clearTimeout(id);
  }, [message, onClose, timeout]);

  if (!message) return null;

  return (
    <div className={`md-snackbar${error ? ' md-snackbar--error' : ''}`} role="status">
      <span>{message}</span>
      {onClose && <IconButton name="close" label="Cerrar aviso" onClick={onClose} />}
    </div>
  );
}
