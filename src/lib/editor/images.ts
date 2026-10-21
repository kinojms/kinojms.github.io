// Browser-only: resize uploaded images before they are saved to the repository.
// Re-encoding through a canvas also strips EXIF metadata such as GPS location.

export type ProcessedImage = { dataUrl: string; base64: string; width: number; height: number; bytes: number; ext: "webp" | "jpg" };

export const MAX_UPLOAD_BYTES = 500 * 1024;

const loadImage = (file: File) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file couldn't be read as an image."));
    };
    img.src = url;
  });

const toBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

/**
 * cover: fit inside 1600×1200 keeping the aspect ratio.
 * avatar: centre-crop to a 512×512 square.
 */
export async function processImage(file: File, kind: "cover" | "avatar"): Promise<ProcessedImage> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file (PNG, JPG, WebP…).");
  if (file.size > 25 * 1024 * 1024) throw new Error("That image is over 25 MB. Please choose a smaller one.");
  const img = await loadImage(file);

  let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight, w: number, h: number;
  if (kind === "avatar") {
    const side = Math.min(sw, sh);
    sx = (sw - side) / 2;
    sy = (sh - side) / 2;
    sw = sh = side;
    w = h = Math.min(512, side);
  } else {
    const scale = Math.min(1, 1600 / sw, 1200 / sh);
    w = Math.round(sw * scale);
    h = Math.round(sh * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser couldn't process the image.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);

  let blob: Blob | null = null;
  let ext: "webp" | "jpg" = "webp";
  for (const quality of [0.86, 0.78, 0.68, 0.55, 0.45]) {
    blob = await toBlob(canvas, "image/webp", quality);
    if (!blob || blob.type !== "image/webp") {
      ext = "jpg"; // very old browsers: no WebP encoder
      blob = await toBlob(canvas, "image/jpeg", quality);
    }
    if (blob && blob.size <= MAX_UPLOAD_BYTES) break;
  }
  if (!blob) throw new Error("Your browser couldn't process the image.");
  if (blob.size > MAX_UPLOAD_BYTES) throw new Error("That image is still too large after resizing. Try a simpler or smaller image.");

  const dataUrl = await blobToDataUrl(blob);
  return { dataUrl, base64: dataUrl.slice(dataUrl.indexOf(",") + 1), width: w, height: h, bytes: blob.size, ext };
}
