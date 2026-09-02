import { useEffect, useRef, useState } from 'react';

import {

  buildShareMessage,

  downloadBlob,

  generatePdfBlobFromHtml,

  openFacebookShare,

  openGmailShare,

  openWhatsAppShare,

  prepareDocumentPdf,

  sanitizeDocumentFilename,

  sharePdfToWhatsApp,

} from '../../utils/documentShare';



export default function DocumentPreview({ html, title, onClose }) {

  const iframeRef = useRef(null);

  const [busy, setBusy] = useState('');

  const [previewReady, setPreviewReady] = useState(false);

  const [whatsAppHint, setWhatsAppHint] = useState(null);



  useEffect(() => {

    document.body.style.overflow = 'hidden';

    return () => {

      document.body.style.overflow = '';

    };

  }, []);



  useEffect(() => {

    setPreviewReady(false);

  }, [html]);



  const syncIframeHeight = () => {

    const frame = iframeRef.current;

    const doc = frame?.contentDocument;

    if (!frame || !doc?.body) return;



    doc.documentElement.style.overflow = 'hidden';

    doc.body.style.overflow = 'visible';



    const height = Math.max(

      doc.body.scrollHeight,

      doc.body.offsetHeight,

      doc.documentElement.scrollHeight,

      doc.documentElement.offsetHeight

    );

    frame.style.height = `${height}px`;

  };



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

    if (!html?.trim()) return;



    setBusy(action);

    try {

      const message = buildShareMessage(title);

      const filename = `${sanitizeDocumentFilename(title)}.pdf`;



      if (action === 'pdf') {

        const blob = await generatePdfBlobFromHtml(html, filename, iframeRef.current);

        downloadBlob(blob, filename);

        return;

      }



      if (action === 'whatsapp') {

        const result = await sharePdfToWhatsApp({

          html,

          title,

          previewFrame: iframeRef.current,

        });



        if (result.method === 'manual') {

          setWhatsAppHint({

            filename: result.filename,

            message: result.message,

          });

        }

        return;

      }



      const { blob, file, canNativeShare } = await prepareDocumentPdf(html, title, iframeRef.current);
      const attachmentNote =
        'El PDF se descargó en su dispositivo. Adjúntelo a este mensaje para enviarlo.';

      if (action === 'native' && canNativeShare) {
        await navigator.share({
          files: [file],
          title,
          text: message,
        });
        return;
      }

      if (!canNativeShare) {
        downloadBlob(blob, filename);
      }

      if (action === 'gmail') {
        openGmailShare({ subject: message, body: attachmentNote });
      } else if (action === 'facebook') {
        openFacebookShare(`${message}\n\n${attachmentNote}`);
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

              disabled={isBusy || !previewReady}

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

            disabled={isBusy || !previewReady}

          >

            {busy === 'whatsapp' ? 'Preparando…' : 'WhatsApp'}

          </button>

          <button

            type="button"

            className="doc-preview__share-btn doc-preview__share-btn--gmail"

            onClick={() => runShareAction('gmail')}

            disabled={isBusy || !previewReady}

          >

            Gmail

          </button>

          <button

            type="button"

            className="doc-preview__share-btn doc-preview__share-btn--facebook"

            onClick={() => runShareAction('facebook')}

            disabled={isBusy || !previewReady}

          >

            Facebook

          </button>

          {typeof navigator.share === 'function' && (

            <button

              type="button"

              className="doc-preview__share-btn doc-preview__share-btn--native"

              onClick={() => runShareAction('native')}

              disabled={isBusy || !previewReady}

            >

              Más opciones…

            </button>

          )}

        </div>



        <p className="doc-preview__share-note">

          En celular, WhatsApp puede adjuntar el PDF automáticamente. En computadora, el PDF se descarga y debe adjuntarse manualmente en el chat.

        </p>



        <div className="doc-preview__frame-wrap">

          <iframe

            ref={iframeRef}

            className="doc-preview__frame"

            title={title}

            srcDoc={html}

            scrolling="no"

            onLoad={() => {

              syncIframeHeight();

              setPreviewReady(true);

            }}

          />

        </div>

      </div>



      {whatsAppHint && (

        <div className="doc-preview__hint" role="dialog" aria-modal="true" aria-label="Enviar PDF por WhatsApp">

          <div className="doc-preview__hint-backdrop" onClick={() => setWhatsAppHint(null)} />

          <div className="doc-preview__hint-panel">

            <h3>PDF descargado</h3>

            <p className="doc-preview__hint-file">{whatsAppHint.filename}</p>

            <p>

              WhatsApp Web no permite adjuntar archivos automáticamente desde el navegador.

            </p>

            <ol className="doc-preview__hint-steps">

              <li>Abra WhatsApp y el chat donde enviará el contrato.</li>

              <li>Toque el icono <strong>Adjuntar</strong> (📎).</li>

              <li>Elija <strong>Documento</strong> y seleccione el PDF descargado.</li>

              <li>Envíe el mensaje con el archivo adjunto.</li>

            </ol>

            <div className="doc-preview__hint-actions">

              <button

                type="button"

                className="btn btn--secondary btn--sm"

                onClick={() => openWhatsAppShare(whatsAppHint.message)}

              >

                Abrir WhatsApp Web

              </button>

              <button

                type="button"

                className="btn btn--primary btn--sm"

                onClick={() => setWhatsAppHint(null)}

              >

                Entendido

              </button>

            </div>

          </div>

        </div>

      )}

    </div>

  );

}


