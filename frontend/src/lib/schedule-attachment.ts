import type { EventInput } from '@fullcalendar/core';

import { prepareScheduleAttachmentFile } from '@/lib/resize-schedule-image';
import type { ScheduleAttachment } from '@/lib/user-schedule';

export const SCHEDULE_ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;
export const SCHEDULE_ATTACHMENT_MAX_COUNT = 5;

export const SCHEDULE_ATTACHMENT_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

const SCHEDULE_ATTACHMENT_ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export function validateScheduleAttachmentMime(file: File): string | null {
  if (!SCHEDULE_ATTACHMENT_ALLOWED_MIMES.has(file.type)) {
    return 'JPEG, PNG, WebP, GIF 이미지만 첨부할 수 있습니다.';
  }

  return null;
}

export function getStrapiPublicUrl(): string {
  return process.env.NEXT_PUBLIC_STRAPI_URL ?? 'http://localhost:1337';
}

export function getUploadPublicBaseUrl(): string {
  const uploadBase = process.env.NEXT_PUBLIC_UPLOAD_BASE_URL?.trim();

  if (uploadBase) {
    return uploadBase.replace(/\/$/, '');
  }

  return getStrapiPublicUrl().replace(/\/$/, '');
}

export function resolveScheduleAttachmentUrl(url: string): string {
  if (!url) {
    return '';
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  const base = getUploadPublicBaseUrl();
  return `${base}${url.startsWith('/') ? url : `/${url}`}`;
}

export function validateScheduleAttachmentFile(file: File): string | null {
  const mimeError = validateScheduleAttachmentMime(file);
  if (mimeError) {
    return mimeError;
  }

  if (file.size <= 0 || file.size > SCHEDULE_ATTACHMENT_MAX_BYTES) {
    return '이미지 크기는 5MB 이하여야 합니다.';
  }

  return null;
}

export function readEventAttachments(event: EventInput): ScheduleAttachment[] {
  const props = event.extendedProps as Record<string, unknown> | undefined;
  const raw = props?.attachments;

  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const record = item as Record<string, unknown>;
      return {
        id: Number(record.id),
        url: String(record.url ?? ''),
        name: String(record.name ?? ''),
        mime: String(record.mime ?? ''),
        size: Number(record.size ?? 0),
        width: record.width == null ? null : Number(record.width),
        height: record.height == null ? null : Number(record.height),
      };
    })
    .filter((item) => item.id > 0 && item.url);
}

export async function uploadScheduleAttachmentFile(
  file: File,
  withStudent: (url: string) => string
): Promise<ScheduleAttachment> {
  const preparedFile = await prepareScheduleAttachmentFile(file);
  const validationError = validateScheduleAttachmentFile(preparedFile);
  if (validationError) {
    throw new Error(validationError);
  }

  const formData = new FormData();
  formData.append('file', preparedFile);

  const res = await fetch(withStudent('/api/user-schedules/attachments/upload'), {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  const data = (await res.json()) as {
    attachment?: ScheduleAttachment;
    error?: string;
  };

  if (!res.ok) {
    throw new Error(data.error ?? '이미지 업로드에 실패했습니다.');
  }

  if (!data.attachment) {
    throw new Error('이미지 업로드에 실패했습니다.');
  }

  return data.attachment;
}
