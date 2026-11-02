export const MAX_PHOTO_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_PHOTO_DIMENSION = 1600;
export const PHOTO_QUALITY = 0.82;

export const IMAGE_TOO_LARGE_MESSAGE = "La imagen supera los 10 MB.";
export const IMAGE_PROCESS_ERROR_MESSAGE =
  "No pudimos procesar esa imagen. Probá con JPG, PNG o WebP.";
export const IMAGE_HEIC_MESSAGE =
  "Las fotos HEIC/HEIF no se pueden procesar. Convertilas a JPG, PNG o WebP.";

const DECODE_TIMEOUT_MS = 10_000;
const ENCODE_TIMEOUT_MS = 10_000;

type DecodedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  cleanup: () => void;
};

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(IMAGE_PROCESS_ERROR_MESSAGE)),
      timeoutMs,
    );

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function decodeWithImageElement(file: File): Promise<DecodedImage> {
  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.src = objectUrl;

  try {
    await withTimeout(image.decode(), DECODE_TIMEOUT_MS);
  } catch {
    URL.revokeObjectURL(objectUrl);
    throw new Error(IMAGE_PROCESS_ERROR_MESSAGE);
  }

  return {
    source: image,
    width: image.naturalWidth,
    height: image.naturalHeight,
    cleanup: () => URL.revokeObjectURL(objectUrl),
  };
}

async function decodeImage(file: File): Promise<DecodedImage> {
  try {
    const bitmap = await withTimeout(
      createImageBitmap(file),
      DECODE_TIMEOUT_MS,
    );

    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      cleanup: () => bitmap.close(),
    };
  } catch {
    return decodeWithImageElement(file);
  }
}

export async function compressImage(file: File): Promise<Blob> {
  if (file.size > MAX_PHOTO_FILE_BYTES) {
    throw new Error(IMAGE_TOO_LARGE_MESSAGE);
  }

  if (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    /\.(heic|heif)$/i.test(file.name)
  ) {
    throw new Error(IMAGE_HEIC_MESSAGE);
  }

  const decoded = await decodeImage(file);

  try {
    if (decoded.width <= 0 || decoded.height <= 0) {
      throw new Error(IMAGE_PROCESS_ERROR_MESSAGE);
    }

    const scale = Math.min(
      1,
      MAX_PHOTO_DIMENSION / Math.max(decoded.width, decoded.height),
    );
    const width = Math.max(1, Math.round(decoded.width * scale));
    const height = Math.max(1, Math.round(decoded.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error(IMAGE_PROCESS_ERROR_MESSAGE);
    }

    context.drawImage(decoded.source, 0, 0, width, height);

    const blob = await withTimeout(
      new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/webp", PHOTO_QUALITY);
      }),
      ENCODE_TIMEOUT_MS,
    );

    if (!blob || blob.type !== "image/webp") {
      throw new Error(IMAGE_PROCESS_ERROR_MESSAGE);
    }

    return blob;
  } finally {
    decoded.cleanup();
  }
}
