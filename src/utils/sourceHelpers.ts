/**
 * Helpers for parsing tile source URL prefixes (iframe|, iframedark|, invert|, dark|).
 */

const videoExtensions = ['.mp4', '.webm', '.ogg', '.ogv'];

export function isVideo(src: string): boolean {
  return videoExtensions.some((ext) => src.includes(ext));
}

export function getVideoType(src: string): string {
  if (src.includes('.mp4')) return 'video/mp4';
  if (src.includes('.webm')) return 'video/webm';
  if (src.includes('.ogg') || src.includes('.ogv')) return 'video/ogg';
  return '';
}

export function isFrame(src: string): boolean {
  return src.includes('iframe|') || src.includes('iframedark|');
}

export function isDarkFrame(src: string): boolean {
  return src.includes('iframedark|');
}

export function isDark(src: string): boolean {
  return src.includes('dark|');
}

export function isInvert(src: string): boolean {
  return src.includes('invert|');
}

/** Strip known prefixes and return the clean URL */
export function cleanSource(src: string): string {
  return src
    .replace('iframedark|', '')
    .replace('iframe|', '')
    .replace('invert|', '')
    .replace('dark|', '');
}

/**
 * Parse a source string to determine its type and clean URL.
 */
export interface ParsedSource {
  type: 'image' | 'video' | 'iframe';
  url: string;
  invert: boolean;
  darkFrame: boolean;
  scale?: number;
}

export function parseSource(src: string): ParsedSource {
  if (isVideo(src)) {
    return { type: 'video', url: src, invert: false, darkFrame: false };
  }

  if (isFrame(src)) {
    const dark = isDarkFrame(src);
    const raw = dark ? src.split('iframedark|')[1] : src.split('iframe|')[1];
    const parts = raw.split('|');
    return {
      type: 'iframe',
      url: parts[0],
      invert: false,
      darkFrame: dark,
      scale: parts[1] ? parseFloat(parts[1]) : undefined,
    };
  }

  const invert = isInvert(src);
  const url = invert ? src.replace('invert|', '') : src;

  return { type: 'image', url, invert, darkFrame: false };
}

/** Add cache-busting parameter to image URLs */
export function getImgURL(url: string): string {
  return url.includes('?') ? url : url + '?_=' + Date.now();
}
