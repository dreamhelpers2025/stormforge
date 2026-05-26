/**
 * Compress an image data URL down to a sane size so cloud storage stays cheap.
 * Targets: ≤1600px on the longest edge, JPEG quality 0.82.
 * If the input is already smaller than maxSide, we still re-encode to JPEG
 * to remove any embedded PNG bloat (transparency is lost — fine for hero
 * images, lore pictures, map tiles).
 *
 * Returns the original string if the browser can't decode it.
 */
export async function compressImageDataUrl(
  dataUrl: string,
  maxSide = 1600,
  quality = 0.82
): Promise<string> {
  if (!dataUrl.startsWith('data:image/')) return dataUrl;
  try {
    const img = await loadImage(dataUrl);
    const longest = Math.max(img.width, img.height);
    const scale = longest > maxSide ? maxSide / longest : 1;
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return dataUrl;
    // Fill with dark navy so JPEG transparency loss isn't an ugly white.
    ctx.fillStyle = '#0B1E2D';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', quality);
  } catch {
    return dataUrl;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Useful for FileReader inputs. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/** Pipeline: File → compressed data URL. */
export async function compressFile(file: File, maxSide = 1600, quality = 0.82): Promise<string> {
  const raw = await fileToDataUrl(file);
  return compressImageDataUrl(raw, maxSide, quality);
}
