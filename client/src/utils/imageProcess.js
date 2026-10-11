// Browser image pre-processing (canvas API, no dependencies).
// Called by ImageUploader BEFORE each upload so serverless request limits
// are never stressed: output aims under 1 MB, server cap is 4 MB.
export const MAX_DIM = 1600;
export const TARGET_SIZE = 1024 * 1024; // 1 MB

function blobToFile(blob, name) {
  const ext = blob.type === 'image/webp' ? 'webp' : blob.type === 'image/png' ? 'png' : 'jpg';
  const base = String(name || 'image').replace(/\.[a-z0-9]+$/i, '');
  return new File([blob], `${base}.${ext}`, { type: blob.type });
}

function canvasToBlob(canvas, type, quality, fillWhite) {
  return new Promise((resolve) => {
    const ctx = canvas.getContext('2d');
    if (fillWhite) {
      // JPEG has no alpha channel: paint white first so PNG transparency
      // doesn't turn black.
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    canvas.toBlob((b) => resolve(b), type, quality);
  });
}

// Returns { file } (original or processed) or { error: 'decode' } when the
// file can't be decoded (e.g. HEIC, corrupt) — caller shows a clear message.
export async function processImage(file) {
  let bmp = null;
  try {
    bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return { error: 'decode' };
  }
  try {
    const longest = Math.max(bmp.width, bmp.height);
    // Already small enough: upload untouched (never upscale).
    if (longest <= MAX_DIM && file.size < TARGET_SIZE) return { file };

    const scale = Math.min(1, MAX_DIM / longest);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bmp.width * scale));
    canvas.height = Math.max(1, Math.round(bmp.height * scale));
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);

    // Prefer WebP; fall back to JPEG (white background) where unsupported.
    let out = await canvasToBlob(canvas, 'image/webp', 0.82, false);
    if (!out || out.type !== 'image/webp') {
      out = await canvasToBlob(canvas, 'image/jpeg', 0.85, true);
    }
    if (!out) return { error: 'decode' };
    return { file: blobToFile(out, file.name) };
  } finally {
    if (bmp && typeof bmp.close === 'function') bmp.close();
  }
}
