export const BANNER_PATH = '/banner-jazmines.png';
export const ACCESS_LOGO_PATH = '/logo-acceso.svg';

export function getBannerUrl() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${BANNER_PATH}`;
  }
  return BANNER_PATH;
}
