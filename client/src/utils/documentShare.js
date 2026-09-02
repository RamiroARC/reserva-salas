let html2pdfLoader;

const A4_WIDTH_PX = 794;

async function getHtml2Pdf() {
  if (!html2pdfLoader) {
    html2pdfLoader = import('html2pdf.js').then((module) => module.default);
  }
  return html2pdfLoader;
}

export function sanitizeDocumentFilename(title) {
  return (
    String(title || 'documento')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 80) || 'documento'
  );
}

function waitForDocumentImages(document) {
  const images = Array.from(document.images ?? []);
  if (!images.length) return Promise.resolve();

  return Promise.all(
    images.map(
      (img) =>
        new Promise((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          img.addEventListener('load', resolve, { once: true });
          img.addEventListener('error', resolve, { once: true });
        })
    )
  );
}

function createPdfRenderFrame(html) {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  frame.style.position = 'fixed';
  frame.style.left = '-10000px';
  frame.style.top = '0';
  frame.style.width = `${A4_WIDTH_PX}px`;
  frame.style.height = '1px';
  frame.style.border = '0';
  frame.style.visibility = 'hidden';
  document.body.appendChild(frame);

  const doc = frame.contentDocument;
  doc.open();
  doc.write(html);
  doc.close();

  return frame;
}

function pdfOptions(filename) {
  return {
    margin: [8, 10, 10, 10],
    filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      width: A4_WIDTH_PX,
      windowWidth: A4_WIDTH_PX,
      scrollX: 0,
      scrollY: 0,
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['css', 'legacy'] },
  };
}

export async function generatePdfBlobFromHtml(html, filename = 'documento.pdf') {
  if (!html?.trim()) throw new Error('No hay contenido para generar el PDF');

  const frame = createPdfRenderFrame(html);
  const doc = frame.contentDocument;

  try {
    if (doc.fonts?.ready) {
      await doc.fonts.ready;
    }
    await waitForDocumentImages(doc);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    const html2pdf = await getHtml2Pdf();
    return await html2pdf().set(pdfOptions(filename)).from(doc.body).outputPdf('blob');
  } finally {
    frame.remove();
  }
}

/** @deprecated Usa generatePdfBlobFromHtml con el HTML completo del documento */
export async function generatePdfBlobFromElement(element, filename = 'documento.pdf') {
  if (!element) throw new Error('No hay contenido para generar el PDF');
  const html = element.ownerDocument?.documentElement?.outerHTML;
  if (html) {
    return generatePdfBlobFromHtml(html, filename);
  }

  const html2pdf = await getHtml2Pdf();
  return html2pdf().set(pdfOptions(filename)).from(element).outputPdf('blob');
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function prepareDocumentPdf(html, title) {
  const filename = `${sanitizeDocumentFilename(title)}.pdf`;
  const blob = await generatePdfBlobFromHtml(html, filename);
  const file = new File([blob], filename, { type: 'application/pdf' });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    return { blob, filename, file, canNativeShare: true };
  }

  downloadBlob(blob, filename);
  return { blob, filename, file, canNativeShare: false };
}

export function buildShareMessage(title) {
  return `Contrato Los Jazmines — ${title}. Revise el PDF adjunto o descargado.`;
}

export function openWhatsAppShare(message) {
  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
}

export function openGmailShare({ subject, body }) {
  const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function openFacebookShare(message) {
  window.open(
    `https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(message)}`,
    '_blank',
    'noopener,noreferrer,width=640,height=480'
  );
}
