import { getBannerUrl } from './banner';
import { JAZMINES } from '../data/jazminesCatalog';

function absoluteUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${path.startsWith('/') ? '' : '/'}${path}`;
  }
  return path;
}

// Los datos de marca viven en el local; JAZMINES solo aporta los valores
// heredados para locales que aún no los configuraron.
export function resolveBranding(local) {
  return {
    name: local?.name || JAZMINES.name,
    year: new Date().getFullYear(),
    ownerName: local?.ownerName || local?.name || JAZMINES.name,
    ownerDni: local?.ownerDni || JAZMINES.ownerDni,
    phones: local?.phones?.length ? local.phones : JAZMINES.phones,
    packageIncludes: local?.packageIncludes?.length
      ? local.packageIncludes
      : JAZMINES.packageIncludes,
    extrasTerms: local?.extrasTerms || JAZMINES.extrasTerms,
    bannerUrl: absoluteUrl(local?.bannerPath) ?? getBannerUrl(),
  };
}
