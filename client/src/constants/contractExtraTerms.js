function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildContractExtrasTermsHtml(terms = [], fallbackText = '') {
  const items = (terms ?? [])
    .filter((item) => item.active !== false)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((item) => String(item.content ?? '').trim())
    .filter(Boolean);

  if (!items.length) {
    return fallbackText ? `<p class="terms">${escapeHtml(fallbackText)}</p>` : '';
  }

  return items.map((text) => `<p class="terms">${escapeHtml(text)}</p>`).join('\n  ');
}
