import { useEffect, useRef } from 'react';

export default function DocumentPreview({ html, title, onClose }) {
  const iframeRef = useRef(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handlePrint = () => {
    const frame = iframeRef.current;
    if (!frame?.contentWindow) return;
    frame.contentWindow.focus();
    frame.contentWindow.print();
  };

  const handleOpenTab = () => {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const tab = window.open(url, '_blank');
    if (!tab) {
      alert('Permite ventanas emergentes para abrir el documento en una pestaña nueva.');
      URL.revokeObjectURL(url);
      return;
    }
    tab.onload = () => URL.revokeObjectURL(url);
  };

  return (
    <div className="doc-preview" role="dialog" aria-modal="true" aria-label={title}>
      <div className="doc-preview__backdrop" onClick={onClose} />
      <div className="doc-preview__panel">
        <header className="doc-preview__header">
          <div>
            <strong>{title}</strong>
            <span>Vista previa del documento</span>
          </div>
          <div className="doc-preview__actions">
            <button type="button" className="btn btn--secondary btn--sm" onClick={handleOpenTab}>
              Abrir en pestaña
            </button>
            <button type="button" className="btn btn--primary btn--sm" onClick={handlePrint}>
              Imprimir / Guardar PDF
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </header>
        <iframe
          ref={iframeRef}
          className="doc-preview__frame"
          title={title}
          srcDoc={html}
        />
      </div>
    </div>
  );
}
