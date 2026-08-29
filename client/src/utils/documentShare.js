let html2pdfLoader;

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

export async function generatePdfBlobFromElement(element, filename = 'documento.pdf') {
  if (!element) throw new Error('No hay contenido para generar el PDF');

  const options = {
    margin: [8, 10, 10, 10],
    filename,
    image: { type: 'jpeg', quality: 0.95 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
  };

  const html2pdf = await getHtml2Pdf();
  return html2pdf().set(options).from(element).outputPdf('blob');
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

export async function prepareDocumentPdf(element, title) {
  const filename = `${sanitizeDocumentFilename(title)}.pdf`;
  const blob = await generatePdfBlobFromElement(element, filename);
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
