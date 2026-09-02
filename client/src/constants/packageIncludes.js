function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function resolveContractPackageIncludeLines(items = [], fallbackItems = []) {
  const source =
    items?.length > 0
      ? items
      : (fallbackItems ?? []).map((content, index) => ({
          content: String(content),
          active: true,
          sort_order: index + 1,
        }));

  return source
    .filter((item) => item.active !== false)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((item) => String(item.content ?? '').trim())
    .filter(Boolean);
}

export function buildPackageIncludesSectionHtml(items = [], fallbackItems = []) {
  const lines = resolveContractPackageIncludeLines(items, fallbackItems);
  if (!lines.length) return '';

  return `
  <div class="section-title">Paquete incluye</div>
  <ul class="includes">
    ${lines.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}
  </ul>`;
}
