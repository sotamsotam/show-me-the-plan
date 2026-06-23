import type { Core } from '@strapi/strapi';

export const SCHEDULE_ATTACHMENT_MAX_COUNT = 5;
export const SCHEDULE_ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;

export const SCHEDULE_ATTACHMENT_ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export interface ScheduleAttachment {
  id: number;
  url: string;
  name: string;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
}

export function serializeScheduleAttachment(raw: Record<string, unknown>): ScheduleAttachment {
  return {
    id: Number(raw.id),
    url: String(raw.url ?? ''),
    name: String(raw.name ?? ''),
    mime: String(raw.mime ?? ''),
    size: Number(raw.size ?? 0),
    width: raw.width == null ? null : Number(raw.width),
    height: raw.height == null ? null : Number(raw.height),
  };
}

export function normalizeAttachmentIds(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const ids = value
    .map((item) => {
      if (typeof item === 'number' && Number.isInteger(item) && item > 0) {
        return item;
      }

      if (typeof item === 'string' && /^\d+$/.test(item)) {
        return Number(item);
      }

      if (item && typeof item === 'object' && 'id' in item) {
        const id = Number((item as { id: unknown }).id);
        return Number.isInteger(id) && id > 0 ? id : null;
      }

      return null;
    })
    .filter((id): id is number => id != null);

  return Array.from(new Set(ids));
}

export function normalizeScheduleAttachments(value: unknown): ScheduleAttachment[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => item && typeof item === 'object')
    .map((item) => serializeScheduleAttachment(item as Record<string, unknown>))
    .filter((item) => item.id > 0 && item.url);
}

export function validateScheduleAttachmentPolicy(input: {
  allDay: boolean;
  attachmentIds?: number[];
}): string | null {
  const attachmentIds = input.attachmentIds ?? [];

  if (attachmentIds.length === 0) {
    return null;
  }

  if (!input.allDay) {
    return '첨부 이미지는 종일 일정에서만 사용할 수 있습니다.';
  }

  if (attachmentIds.length > SCHEDULE_ATTACHMENT_MAX_COUNT) {
    return `첨부 이미지는 최대 ${SCHEDULE_ATTACHMENT_MAX_COUNT}장까지 등록할 수 있습니다.`;
  }

  return null;
}

export function validateUploadedFileMetadata(raw: Record<string, unknown>): string | null {
  const mime = String(raw.mime ?? '');
  const size = Number(raw.size ?? 0);

  if (!SCHEDULE_ATTACHMENT_ALLOWED_MIMES.has(mime)) {
    return 'JPEG, PNG, WebP, GIF 이미지만 업로드할 수 있습니다.';
  }

  if (!Number.isFinite(size) || size <= 0 || size > SCHEDULE_ATTACHMENT_MAX_BYTES) {
    return `이미지 크기는 ${Math.floor(SCHEDULE_ATTACHMENT_MAX_BYTES / (1024 * 1024))}MB 이하여야 합니다.`;
  }

  return null;
}

export function validateIncomingUploadFile(file: {
  size?: number;
  mimetype?: string;
  type?: string;
}): string | null {
  const mime = String(file.mimetype ?? file.type ?? '');
  const size = Number(file.size ?? 0);

  if (!SCHEDULE_ATTACHMENT_ALLOWED_MIMES.has(mime)) {
    return 'JPEG, PNG, WebP, GIF 이미지만 업로드할 수 있습니다.';
  }

  if (!Number.isFinite(size) || size <= 0 || size > SCHEDULE_ATTACHMENT_MAX_BYTES) {
    return `이미지 크기는 ${Math.floor(SCHEDULE_ATTACHMENT_MAX_BYTES / (1024 * 1024))}MB 이하여야 합니다.`;
  }

  return null;
}

export function buildAttachmentRelationData(
  attachmentIds: number[] | undefined
): Record<string, unknown> | undefined {
  if (attachmentIds === undefined) {
    return undefined;
  }

  return { attachments: attachmentIds };
}

export function collectRemovedAttachmentIds(
  previous: ScheduleAttachment[],
  next: number[]
): number[] {
  const nextSet = new Set(next);
  return previous.map((item) => item.id).filter((id) => !nextSet.has(id));
}

const USER_SCHEDULE_UID = 'api::user-schedule.user-schedule' as const;

export async function assertAttachmentIdsAvailable(
  strapi: Core.Strapi,
  attachmentIds: number[],
  options: { excludeScheduleId?: number } = {}
): Promise<string | null> {
  if (attachmentIds.length === 0) {
    return null;
  }

  const files = await strapi.db.query('plugin::upload.file').findMany({
    where: { id: { $in: attachmentIds } },
  });

  if (files.length !== attachmentIds.length) {
    return '첨부 파일을 찾을 수 없습니다.';
  }

  for (const file of files) {
    const error = validateUploadedFileMetadata(file as Record<string, unknown>);
    if (error) {
      return error;
    }
  }

  const schedules = await strapi.db.query(USER_SCHEDULE_UID).findMany({
    where: options.excludeScheduleId
      ? { id: { $ne: options.excludeScheduleId } }
      : {},
    populate: { attachments: true },
  });

  const linkedIds = new Set<number>();

  for (const schedule of schedules) {
    for (const attachment of normalizeScheduleAttachments(
      (schedule as Record<string, unknown>).attachments
    )) {
      linkedIds.add(attachment.id);
    }
  }

  for (const id of attachmentIds) {
    if (linkedIds.has(id)) {
      return '이미 다른 일정에 연결된 첨부 파일입니다.';
    }
  }

  return null;
}

export async function uploadScheduleAttachmentFile(
  strapi: Core.Strapi,
  file: unknown
): Promise<ScheduleAttachment> {
  const incoming = file as { size?: number; mimetype?: string; type?: string };
  const validationError = validateIncomingUploadFile(incoming);

  if (validationError) {
    throw new Error(validationError);
  }

  const uploaded = await strapi.plugin('upload').service('upload').upload({
    data: {},
    files: file,
  });

  const records = Array.isArray(uploaded) ? uploaded : [uploaded];
  const record = records[0] as Record<string, unknown> | undefined;

  if (!record) {
    throw new Error('이미지 업로드에 실패했습니다.');
  }

  const metadataError = validateUploadedFileMetadata(record);
  if (metadataError) {
    await deleteUploadFiles(strapi, [Number(record.id)]);
    throw new Error(metadataError);
  }

  return serializeScheduleAttachment(record);
}

export async function deleteUploadFiles(strapi: Core.Strapi, fileIds: number[]): Promise<void> {
  if (fileIds.length === 0) {
    return;
  }

  const uploadService = strapi.plugin('upload').service('upload');

  for (const id of fileIds) {
    const file = await strapi.db.query('plugin::upload.file').findOne({
      where: { id },
    });

    if (file) {
      await uploadService.remove(file);
    }
  }
}
