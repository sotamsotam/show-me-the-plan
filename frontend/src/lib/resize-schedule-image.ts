import {
  SCHEDULE_ATTACHMENT_MAX_BYTES,
  validateScheduleAttachmentMime,
} from '@/lib/schedule-attachment';

export const SCHEDULE_ATTACHMENT_MAX_WIDTH = 1400;
export const SCHEDULE_ATTACHMENT_JPEG_QUALITY = 0.85;
export const SCHEDULE_ATTACHMENT_WEBP_QUALITY = 0.85;
/** Pre-resize limit for photos that will be compressed client-side. */
export const SCHEDULE_ATTACHMENT_INPUT_MAX_BYTES = 25 * 1024 * 1024;

const MIN_ENCODE_QUALITY = 0.55;
const QUALITY_STEP = 0.1;

export function computeResizedDimensions(
  width: number,
  height: number,
  maxWidth: number = SCHEDULE_ATTACHMENT_MAX_WIDTH
): { width: number; height: number } {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('이미지 크기를 읽을 수 없습니다.');
  }

  if (width <= maxWidth) {
    return { width, height };
  }

  const scale = maxWidth / width;

  return {
    width: maxWidth,
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function buildResizedAttachmentFileName(originalName: string, mime: string): string {
  const baseName = originalName.replace(/\.[^.]+$/, '') || 'attachment';
  const extension =
    mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';

  return `${baseName}.${extension}`;
}

export function validateScheduleAttachmentInputFile(file: File): string | null {
  const mimeError = validateScheduleAttachmentMime(file);
  if (mimeError) {
    return mimeError;
  }

  if (file.size <= 0) {
    return '이미지 파일이 비어 있습니다.';
  }

  if (file.type === 'image/gif') {
    if (file.size > SCHEDULE_ATTACHMENT_MAX_BYTES) {
      return '이미지 크기는 5MB 이하여야 합니다.';
    }

    return null;
  }

  if (file.size > SCHEDULE_ATTACHMENT_INPUT_MAX_BYTES) {
    const maxMb = Math.floor(SCHEDULE_ATTACHMENT_INPUT_MAX_BYTES / (1024 * 1024));
    return `이미지 원본 크기는 ${maxMb}MB 이하여야 합니다.`;
  }

  return null;
}

function loadImageBitmap(file: File): Promise<ImageBitmap> {
  if (typeof createImageBitmap !== 'function') {
    return Promise.reject(new Error('이 브라우저에서는 이미지 처리를 지원하지 않습니다.'));
  }

  return createImageBitmap(file, { imageOrientation: 'from-image' });
}

function canvasHasAlpha(ctx: CanvasRenderingContext2D, width: number, height: number): boolean {
  const { data } = ctx.getImageData(0, 0, width, height);

  for (let index = 3; index < data.length; index += 4) {
    if (data[index] < 255) {
      return true;
    }
  }

  return false;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mime: string,
  quality?: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('이미지 처리에 실패했습니다.'));
          return;
        }

        resolve(blob);
      },
      mime,
      quality
    );
  });
}

async function encodeCanvasToFile(
  canvas: HTMLCanvasElement,
  originalName: string,
  mime: string,
  quality: number
): Promise<File> {
  const blob = await canvasToBlob(canvas, mime, quality);

  if (blob.size > SCHEDULE_ATTACHMENT_MAX_BYTES) {
    if (quality > MIN_ENCODE_QUALITY) {
      return encodeCanvasToFile(
        canvas,
        originalName,
        mime,
        Math.max(MIN_ENCODE_QUALITY, quality - QUALITY_STEP)
      );
    }

    throw new Error('이미지 크기는 5MB 이하여야 합니다.');
  }

  return new File([blob], buildResizedAttachmentFileName(originalName, mime), {
    type: mime,
    lastModified: Date.now(),
  });
}

async function processBitmapToFile(bitmap: ImageBitmap, originalName: string): Promise<File> {
  const { width, height } = computeResizedDimensions(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    throw new Error('이미지 처리에 실패했습니다.');
  }

  context.drawImage(bitmap, 0, 0, width, height);

  const hasAlpha = canvasHasAlpha(context, width, height);
  const mime = hasAlpha ? 'image/webp' : 'image/jpeg';
  const quality = hasAlpha
    ? SCHEDULE_ATTACHMENT_WEBP_QUALITY
    : SCHEDULE_ATTACHMENT_JPEG_QUALITY;

  return encodeCanvasToFile(canvas, originalName, mime, quality);
}

export async function prepareScheduleAttachmentFile(file: File): Promise<File> {
  const inputError = validateScheduleAttachmentInputFile(file);
  if (inputError) {
    throw new Error(inputError);
  }

  if (file.type === 'image/gif') {
    return file;
  }

  const bitmap = await loadImageBitmap(file);

  try {
    const needsResize = bitmap.width > SCHEDULE_ATTACHMENT_MAX_WIDTH;
    const needsCompress = file.size > SCHEDULE_ATTACHMENT_MAX_BYTES;

    if (!needsResize && !needsCompress) {
      return file;
    }

    return await processBitmapToFile(bitmap, file.name);
  } finally {
    bitmap.close();
  }
}
