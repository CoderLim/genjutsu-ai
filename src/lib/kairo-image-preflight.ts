/** Client-side preparation for Kairo Motion Control reference photos. */
export const KAIRO_MAX_REFERENCE_DIMENSION = 2048;
export const KAIRO_MAX_UPLOAD_IMAGE_BYTES = 12 * 1024 * 1024;

export function fitKairoImageDimensions(
  width: number,
  height: number,
  maxDimension = KAIRO_MAX_REFERENCE_DIMENSION
) {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    !Number.isFinite(maxDimension) ||
    width <= 0 ||
    height <= 0 ||
    maxDimension < 1
  ) {
    throw new Error('Invalid photo dimensions');
  }
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  return {
    width: Math.max(1, Math.floor(width * scale)),
    height: Math.max(1, Math.floor(height * scale)),
  };
}

/**
 * Leave already-compatible files untouched; otherwise encode a bounded JPEG.
 * Re-encoding is done before generating a signed R2 upload and charging credits.
 */
export async function prepareKairoReferenceImage(file: File): Promise<File> {
  const url = URL.createObjectURL(file);
  const photo = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      photo.onload = () => resolve();
      photo.onerror = () =>
        reject(
          new Error(
            'This photo could not be opened. Please upload a JPEG, PNG, or WebP image.'
          )
        );
      photo.src = url;
    });

    const { width, height } = fitKairoImageDimensions(
      photo.naturalWidth,
      photo.naturalHeight
    );
    if (
      width === photo.naturalWidth &&
      height === photo.naturalHeight &&
      file.size <= KAIRO_MAX_UPLOAD_IMAGE_BYTES
    ) {
      return file;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Unable to process this photo in your browser');

    // Motion Control takes photos; flatten transparency against white.
    context.fillStyle = '#fff';
    context.fillRect(0, 0, width, height);
    context.drawImage(photo, 0, 0, width, height);

    try {
      for (const quality of [0.9, 0.8, 0.65]) {
        const encoded = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, 'image/jpeg', quality)
        );
        if (
          encoded &&
          encoded.type === 'image/jpeg' &&
          encoded.size > 0 &&
          encoded.size <= KAIRO_MAX_UPLOAD_IMAGE_BYTES
        ) {
          const baseName = file.name.replace(/\.[^/.]+$/, '') || 'reference';
          return new File([encoded], `${baseName}-optimized.jpg`, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
        }
      }
    } finally {
      canvas.width = 0;
      canvas.height = 0;
    }
    throw new Error('Photo could not be compressed. Please choose a smaller photo.');
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Avoid exposing raw provider JSON, signed R2 links, or stack traces. */
export function friendlyKairoGenerationError(message: string): string {
  if (/image_too_large|image dimensions are too large/i.test(message)) {
    return 'The reference photo is too large for the video model. Please upload the photo again. If credits are missing, contact support.';
  }
  if (
    message.length > 240 ||
    /https?:\/\/|[?&](?:X-Amz-|Signature=)|\{\s*"|\n\s*at\s+/i.test(message)
  ) {
    return 'Generation failed. Please try again or contact support if credits are missing.';
  }
  return message;
}
