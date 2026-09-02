import { JAZMINES } from './jazminesCatalog.js';
import { C, insertDoc } from '../mongo.js';

export const DEFAULT_PACKAGE_INCLUDES = JAZMINES.packageIncludes.map((content, index) => ({
  content,
  description: '',
  sort_order: index + 1,
}));

function parseRoomPackageIncludes(raw) {
  if (!raw) return null;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed) || !parsed.length) return null;
    return parsed.map((item, index) => ({
      content: String(item).trim(),
      description: '',
      sort_order: index + 1,
    }));
  } catch {
    return null;
  }
}

export async function seedPackageIncludes(localId) {
  const count = await C('package_include_items').countDocuments({ local_id: localId });
  if (count > 0) return;

  const room = await C('rooms').findOne({ _id: localId });
  const items =
    parseRoomPackageIncludes(room?.package_includes) ?? DEFAULT_PACKAGE_INCLUDES;

  for (const item of items) {
    if (!item.content) continue;
    await insertDoc('package_include_items', {
      local_id: localId,
      content: item.content,
      description: item.description ?? '',
      sort_order: item.sort_order,
      active: 1,
    });
  }
}
