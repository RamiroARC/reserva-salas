let html2pdfLoader;
let html2canvasLoader;
let jsPdfLoader;

const A4_WIDTH_PX = 794;
const A4_HEIGHT_MM = 297;
const A4_WIDTH_MM = 210;
// Equivalent to body padding in printDocuments (18px 22px at 96dpi).
const PDF_MARGIN_TOP_MM = 4.8;
const PDF_MARGIN_HORIZONTAL_MM = 5.8;
const PDF_MARGIN_BOTTOM_MM = 4.8;

async function getHtml2Pdf() {
  if (!html2pdfLoader) {
    html2pdfLoader = import('html2pdf.js').then((module) => module.default);
  }
  return html2pdfLoader;
}

async function getHtml2Canvas() {
  if (!html2canvasLoader) {
    html2canvasLoader = import('html2canvas').then((module) => module.default);
  }
  return html2canvasLoader;
}

async function getJsPDF() {
  if (!jsPdfLoader) {
    jsPdfLoader = import('jspdf').then((module) => module.jsPDF);
  }
  return jsPdfLoader;
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
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }
          img.addEventListener('load', resolve, { once: true });
          img.addEventListener('error', resolve, { once: true });
        })
    )
  );
}

function measureDocumentHeight(doc) {
  return Math.max(
    doc.body.scrollHeight,
    doc.body.offsetHeight,
    doc.documentElement.scrollHeight,
    doc.documentElement.offsetHeight
  );
}

function enforcePdfCaptureStyles(doc) {
  const { body } = doc;
  if (!body) return;

  body.style.width = `${A4_WIDTH_PX}px`;
  body.style.maxWidth = `${A4_WIDTH_PX}px`;
  doc.documentElement.style.width = `${A4_WIDTH_PX}px`;

  doc.querySelectorAll('img.doc-header__logo').forEach((img) => {
    img.setAttribute('width', '110');
    img.setAttribute('height', '48');
    img.style.cssText =
      'display:block;height:48px;width:110px;max-width:110px;object-fit:contain;object-position:left center';
  });

  doc.querySelectorAll('.contract-menu-item').forEach((row) => {
    row.style.display = 'grid';
    row.style.gridTemplateColumns = '50% 50%';
    row.style.alignItems = 'start';
    row.style.width = '100%';
    row.style.margin = '0 0 5px 8px';

    const left = row.querySelector('.contract-menu-item__left');
    const label = row.querySelector('.contract-menu-item__label');
    const content = row.querySelector('.contract-menu-item__content');
    const amount = row.querySelector('.contract-menu-item__amount');

    if (left) {
      left.style.display = 'flex';
      left.style.alignItems = 'flex-start';
      left.style.minWidth = '0';
      left.style.paddingRight = '8px';
    }
    if (label) {
      label.style.width = '118px';
      label.style.flex = '0 0 118px';
      label.style.paddingRight = '8px';
    }
    if (content) {
      content.style.flex = '1 1 auto';
      content.style.minWidth = '0';
      content.style.wordBreak = 'break-word';
    }
    if (amount) {
      amount.style.textAlign = 'left';
      amount.style.fontWeight = 'bold';
      amount.style.fontSize = '10px';
      amount.style.lineHeight = '1.35';
      amount.style.paddingLeft = '8px';
      amount.style.overflow = 'visible';
    }
  });

  doc.querySelectorAll('table.row-2').forEach((table) => {
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.marginBottom = '6px';
    table.querySelectorAll('td').forEach((td) => {
      td.style.verticalAlign = 'top';
      td.style.paddingRight = '12px';
    });
  });

  doc.querySelectorAll('table.signatures').forEach((table) => {
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.marginTop = '28px';
    table.querySelectorAll('td.sig-block').forEach((td) => {
      td.style.width = '50%';
      td.style.textAlign = 'center';
      td.style.verticalAlign = 'top';
      td.style.padding = '0 20px';
    });
  });
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

async function renderPdfBlob(doc, frame, filename, sourceFrame) {
  const height = measureDocumentHeight(doc);

  if (frame) {
    frame.style.width = `${A4_WIDTH_PX}px`;
    frame.style.height = `${height}px`;
    enforcePdfCaptureStyles(doc);
  }

  if (doc.fonts?.ready) {
    await doc.fonts.ready;
  }
  await waitForDocumentImages(doc);
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  await new Promise((resolve) => setTimeout(resolve, 120));

  try {
    const height = measureDocumentHeight(doc);
    const html2canvas = await getHtml2Canvas();
    const canvas = await html2canvas(doc.body, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: A4_WIDTH_PX,
      height,
      windowWidth: A4_WIDTH_PX,
      windowHeight: height,
      scrollX: 0,
      scrollY: 0,
      imageTimeout: 15000,
      onclone: (clonedDoc) => {
        enforcePdfCaptureStyles(clonedDoc);
      },
    });

    const jsPDF = await getJsPDF();
    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const printableWidth = A4_WIDTH_MM - PDF_MARGIN_HORIZONTAL_MM * 2;
    const printableHeight = A4_HEIGHT_MM - PDF_MARGIN_TOP_MM - PDF_MARGIN_BOTTOM_MM;
    const imgWidth = printableWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = PDF_MARGIN_TOP_MM;

    pdf.addImage(imgData, 'JPEG', PDF_MARGIN_HORIZONTAL_MM, position, imgWidth, imgHeight);
    heightLeft -= printableHeight;

    while (heightLeft > 0) {
      pdf.addPage();
      position = PDF_MARGIN_TOP_MM - (imgHeight - heightLeft);
      pdf.addImage(imgData, 'JPEG', PDF_MARGIN_HORIZONTAL_MM, position, imgWidth, imgHeight);
      heightLeft -= printableHeight;
    }

    return pdf.output('blob');
  } catch {
    const html2pdf = await getHtml2Pdf();
    return html2pdf()
      .set({
        margin: [PDF_MARGIN_TOP_MM, PDF_MARGIN_HORIZONTAL_MM, PDF_MARGIN_BOTTOM_MM, PDF_MARGIN_HORIZONTAL_MM],
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: '#ffffff',
          width: A4_WIDTH_PX,
          height,
          windowWidth: A4_WIDTH_PX,
          windowHeight: height,
          scrollX: 0,
          scrollY: 0,
          imageTimeout: 15000,
          onclone: (clonedDoc) => enforcePdfCaptureStyles(clonedDoc),
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      })
      .from(doc.body)
      .outputPdf('blob');
  }
}

export async function generatePdfBlobFromHtml(html, filename = 'documento.pdf', previewFrame = null) {
  const previewDoc = previewFrame?.contentDocument;
  if (previewDoc?.body) {
    try {
      return await renderPdfBlob(previewDoc, null, filename, previewFrame);
    } catch {
      // Fallback to hidden frame if preview capture fails.
    }
  }

  if (!html?.trim()) throw new Error('No hay contenido para generar el PDF');

  const frame = createPdfRenderFrame(html);
  const doc = frame.contentDocument;

  try {
    return await renderPdfBlob(doc, frame, filename);
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
  const doc = element.ownerDocument;
  const height = measureDocumentHeight(doc);
  return html2pdf()
    .set({
      margin: 0,
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        width: A4_WIDTH_PX,
        height,
        windowWidth: A4_WIDTH_PX,
        windowHeight: height,
        onclone: (clonedDoc) => enforcePdfCaptureStyles(clonedDoc),
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    })
    .from(element)
    .outputPdf('blob');
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

export async function prepareDocumentPdf(html, title, previewFrame = null) {
  const filename = `${sanitizeDocumentFilename(title)}.pdf`;
  const blob = await generatePdfBlobFromHtml(html, filename, previewFrame);
  const file = new File([blob], filename, { type: 'application/pdf' });
  const canNativeShare = canSharePdfFile(file);

  return { blob, filename, file, canNativeShare };
}

function canSharePdfFile(file) {
  if (typeof navigator.share !== 'function') return false;
  if (typeof navigator.canShare !== 'function') return true;
  try {
    return navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

export async function sharePdfToWhatsApp({ html, title, previewFrame = null }) {
  const { blob, filename, file } = await prepareDocumentPdf(html, title, previewFrame);
  const message = buildShareMessage(title);
  const sharePayload = { files: [file], text: message };

  if (typeof navigator.share === 'function') {
    try {
      if (!navigator.canShare || navigator.canShare(sharePayload)) {
        await navigator.share(sharePayload);
        return { method: 'native' };
      }
    } catch (err) {
      if (err?.name === 'AbortError') throw err;
    }
  }

  downloadBlob(blob, filename);
  return { method: 'manual', filename, message };
}

function normalizeShareDetail(title) {
  return String(title || 'documento')
    .replace(/^(Contrato|Reporte de reservas|Historial de pagos)\s*[—-]\s*/i, '')
    .trim();
}

export function buildShareMessage(title, localName = 'Los Jazmines') {
  const raw = String(title || '').trim();
  const detail = normalizeShareDetail(raw) || 'documento';

  if (/^Reporte de reservas\s*[—-]/i.test(raw)) {
    return `Reporte de reservas ${localName} — ${detail}.`;
  }

  if (/^Historial de pagos\s*[—-]/i.test(raw)) {
    return `Historial de pagos — ${detail} (${localName}).`;
  }

  return `Contrato ${localName} — ${detail}.`;
}

export function buildWhatsAppShareText(title, localName = 'Los Jazmines') {
  return buildShareMessage(title, localName);
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
