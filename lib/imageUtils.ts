/**
 * Compress an image file for sending to APIs (e.g. caption generation).
 * Resizes so longest side is maxDimension and encodes as JPEG to stay under
 * Vercel's 4.5 MB request body limit. Safe to call with any photo size.
 */
const DEFAULT_MAX_DIMENSION = 1024;
const DEFAULT_JPEG_QUALITY = 0.75;

export function compressImageForApi(
  file: File,
  options: { maxDimension?: number; quality?: number } = {}
): Promise<string> {
  const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const quality = options.quality ?? DEFAULT_JPEG_QUALITY;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      if (width <= maxDimension && height <= maxDimension) {
        width = img.width;
        height = img.height;
      } else if (width >= height) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      try {
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      } catch (e) {
        reject(e);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}
