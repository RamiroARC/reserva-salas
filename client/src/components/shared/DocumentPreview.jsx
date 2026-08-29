import { useEffect, useRef, useState } from 'react';
import {
  buildShareMessage,
  downloadBlob,
  generatePdfBlobFromElement,
  openFacebookShare,
  openGmailShare,
  openWhatsAppShare,
  prepareDocumentPdf,
  sanitizeDocumentFilename,
} from '../../utils/documentShare';

export default function DocumentPreview({ html, title, onClose }) {
  const iframeRef = useRef(null);
  const [busy, setBusy] = useState('');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const getDocumentElement = () => iframeRef.current?.contentDocument?.body;

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

  const runShareAction = async (action) => {
    const element = getDocumentElement();
    if (!element) return;

    setBusy(action);
    try {
      const message = buildShareMessage(title);
      const filename = `${sanitizeDocumentFilename(title)}.pdf`;

      if (action === 'pdf') {
        const blob = await generatePdfBlobFromElement(element, filename);
        downloadBlob(blob, filename);
        return;
      }

      const { file, canNativeShare } = await prepareDocumentPdf(element, title);
      const body = `${message}\n\nSi el PDF no se adjuntó automáticamente, use el archivo descargado en su equipo.`;

      if (action === 'native' && canNativeShare) {
        await navigator.share({
          files: [file],
          title,
          text: message,
        });
        return;
      }

      if (action === 'whatsapp') {
        openWhatsAppShare(body);
      } else if (action === 'gmail') {
        openGmailShare({ subject: title, body });
      } else if (action === 'facebook') {
        openFacebookShare(body);
      }
    } catch (err) {
      if (err?.name !== 'AbortError') {
        alert(err.message || 'No se pudo preparar el PDF para compartir.');
      }
    } finally {
      setBusy('');
    }
  };

  const isBusy = Boolean(busy);

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
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => runShareAction('pdf')}
              disabled={isBusy}
            >
              {busy === 'pdf' ? 'Generando…' : 'Descargar PDF'}
            </button>
            <button type="button" className="btn btn--secondary btn--sm" onClick={handleOpenTab}>
              Abrir en pestaña
            </button>
            <button type="button" className="btn btn--primary btn--sm" onClick={handlePrint}>
              Imprimir
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </header>

        <div className="doc-preview__share">
          <span className="doc-preview__share-label">Compartir PDF:</span>
          <button
            type="button"
            className="doc-preview__share-btn doc-preview__share-btn--whatsapp"
            onClick={() => runShareAction('whatsapp')}
            disabled={isBusy}
          >
            WhatsApp
          </button>
          <button
            type="button"
            className="doc-preview__share-btn doc-preview__share-btn--gmail"
            onClick={() => runShareAction('gmail')}
            disabled={isBusy}
          >
            Gmail
          </button>
          <button
            type="button"
            className="doc-preview__share-btn doc-preview__share-btn--facebook"
            onClick={() => runShareAction('facebook')}
            disabled={isBusy}
          >
            Facebook
          </button>
          {typeof navigator.share === 'function' && (
            <button
              type="button"
              className="doc-preview__share-btn doc-preview__share-btn--native"
              onClick={() => runShareAction('native')}
              disabled={isBusy}
            >
              Más opciones…
            </button>
          )}
        </div>

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
