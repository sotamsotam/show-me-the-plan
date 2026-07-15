import { factories, type Core } from '@strapi/strapi';
import { resolveOwnerFromContext } from '../../../services/manager-access';
import {
  assertAttachmentIdsAvailable,
  buildAttachmentRelationData,
  collectRemovedAttachmentIds,
  deleteUploadFiles,
  normalizeAttachmentIds,
  uploadScheduleAttachmentFile,
} from '../../../services/schedule-attachment';
import {
  buildDetachedOnceScheduleCreateData,
  buildOccurrenceExclusionUpdate,
  buildOccurrenceOverrideUpdate,
  buildParentOccurrenceDetachUpdate,
  buildScheduleData,
  expandSchedulesToEvents,
  isOccurrenceEditableSource,
  resolveOccurrenceFields,
  toScheduleRecord,
  validateOccurrenceDetachInput,
  validateOccurrenceMove,
  validateOccurrenceOverride,
  validateScheduleInput,
  type OccurrenceDetachInput,
  type OccurrenceMoveInput,
  type OccurrenceOverrideInput,
  type UserScheduleInput,
} from '../../../services/user-schedule';

const UID = 'api::user-schedule.user-schedule' as const;
const SCHEDULE_POPULATE = { attachments: true } as const;

function serializeSchedule(raw: Record<string, unknown>) {
  const schedule = toScheduleRecord(raw);

  return {
    id: schedule.id,
    title: schedule.title,
    scheduleCategory: schedule.scheduleCategory,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    allDay: schedule.allDay,
    recurrenceType: schedule.recurrenceType,
    daysOfWeek: schedule.daysOfWeek,
    validFrom: schedule.validFrom,
    validUntil: schedule.validUntil,
    date: schedule.date,
    endDate: schedule.endDate,
    excludedDates: schedule.excludedDates,
    overrides: schedule.overrides,
    attachments: schedule.attachments,
    linkedSubject: schedule.linkedSubject,
    linkedPeriod: schedule.linkedPeriod,
  };
}

async function findOwnedSchedule(strapi: Core.Strapi, userId: number, id: number) {
  return strapi.db.query(UID).findOne({
    where: { id, user: userId },
    populate: SCHEDULE_POPULATE,
  }) as Promise<Record<string, unknown> | null>;
}

function parseOccurrenceDate(raw: string): string | null {
  const date = raw.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

function readUploadFile(ctx: { request: { files?: Record<string, unknown> } }) {
  const incoming = ctx.request.files?.file;

  if (Array.isArray(incoming)) {
    return incoming[0] ?? null;
  }

  return incoming ?? null;
}

export default factories.createCoreController(UID, ({ strapi }) => ({
  async findInRange(ctx) {
    const owner = await resolveOwnerFromContext(strapi, ctx);

    if ('error' in owner) {
      return owner.status === 401
        ? ctx.unauthorized(owner.error)
        : ctx.forbidden(owner.error);
    }

    const { start = '', end = '' } = ctx.query as {
      start?: string;
      end?: string;
    };

    if (!start || !end) {
      return ctx.badRequest('start, end는 필수입니다. (YYYY-MM-DD)');
    }

    const rows = await strapi.db.query(UID).findMany({
      where: { user: owner.userId },
      orderBy: { id: 'asc' },
      populate: SCHEDULE_POPULATE,
    });

    const schedules = rows.map((row) => serializeSchedule(row as Record<string, unknown>));
    const events = expandSchedulesToEvents(
      rows.map((row) => toScheduleRecord(row as Record<string, unknown>)),
      String(start),
      String(end)
    );

    return ctx.send({ schedules, events });
  },

  async uploadAttachment(ctx) {
    const owner = await resolveOwnerFromContext(strapi, ctx);

    if ('error' in owner) {
      return owner.status === 401
        ? ctx.unauthorized(owner.error)
        : ctx.forbidden(owner.error);
    }

    const file = readUploadFile(ctx);

    if (!file) {
      return ctx.badRequest('file이 필요합니다.');
    }

    try {
      const attachment = await uploadScheduleAttachmentFile(strapi, file);
      return ctx.send({ attachment });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '이미지 업로드에 실패했습니다.';
      return ctx.badRequest(message);
    }
  },

  async create(ctx) {
    const owner = await resolveOwnerFromContext(strapi, ctx);

    if ('error' in owner) {
      return owner.status === 401
        ? ctx.unauthorized(owner.error)
        : ctx.forbidden(owner.error);
    }

    const body = ctx.request.body as UserScheduleInput;
    const error = validateScheduleInput(body);

    if (error) {
      return ctx.badRequest(error);
    }

    const attachmentIds =
      body.attachmentIds !== undefined ? normalizeAttachmentIds(body.attachmentIds) : undefined;

    if (attachmentIds && attachmentIds.length > 0) {
      const availabilityError = await assertAttachmentIdsAvailable(strapi, attachmentIds);

      if (availabilityError) {
        return ctx.badRequest(availabilityError);
      }
    }

    const created = await strapi.db.query(UID).create({
      data: {
        ...buildScheduleData(body),
        ...buildAttachmentRelationData(attachmentIds),
        user: owner.userId,
      },
      populate: SCHEDULE_POPULATE,
    });

    return ctx.send({ schedule: serializeSchedule(created as Record<string, unknown>) });
  },

  async update(ctx) {
    const owner = await resolveOwnerFromContext(strapi, ctx);

    if ('error' in owner) {
      return owner.status === 401
        ? ctx.unauthorized(owner.error)
        : ctx.forbidden(owner.error);
    }

    const id = Number(ctx.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return ctx.badRequest('유효한 id가 필요합니다.');
    }

    const existing = await findOwnedSchedule(strapi, owner.userId, id);

    if (!existing) {
      return ctx.notFound('일정을 찾을 수 없습니다.');
    }

    const body = ctx.request.body as UserScheduleInput;
    const error = validateScheduleInput(body, { partial: true });

    if (error) {
      return ctx.badRequest(error);
    }

    const current = toScheduleRecord(existing);
    const merged: UserScheduleInput = {
      title: body.title ?? current.title,
      scheduleCategory: body.scheduleCategory ?? current.scheduleCategory,
      startTime: body.startTime ?? current.startTime,
      endTime: body.endTime ?? current.endTime,
      allDay: body.allDay ?? current.allDay,
      recurrenceType: body.recurrenceType ?? current.recurrenceType,
      daysOfWeek: body.daysOfWeek ?? current.daysOfWeek,
      validFrom: body.validFrom ?? current.validFrom ?? undefined,
      validUntil: body.validUntil ?? current.validUntil ?? undefined,
      date: body.date ?? current.date ?? undefined,
      endDate: body.endDate ?? current.endDate ?? undefined,
      excludedDates: body.excludedDates ?? current.excludedDates,
      overrides: body.overrides ?? current.overrides,
      linkedSubject:
        body.linkedSubject !== undefined ? body.linkedSubject : current.linkedSubject,
      linkedPeriod:
        body.linkedPeriod !== undefined ? body.linkedPeriod : current.linkedPeriod,
      attachmentIds:
        body.attachmentIds !== undefined
          ? normalizeAttachmentIds(body.attachmentIds)
          : current.attachments.map((attachment) => attachment.id),
    };

    const fullError = validateScheduleInput(merged);

    if (fullError) {
      return ctx.badRequest(fullError);
    }

    const attachmentIds =
      body.attachmentIds !== undefined ? normalizeAttachmentIds(body.attachmentIds) : undefined;

    if (attachmentIds) {
      const availabilityError = await assertAttachmentIdsAvailable(strapi, attachmentIds, {
        excludeScheduleId: id,
      });

      if (availabilityError) {
        return ctx.badRequest(availabilityError);
      }
    }

    const removedAttachmentIds =
      attachmentIds !== undefined
        ? collectRemovedAttachmentIds(current.attachments, attachmentIds)
        : [];

    const updated = await strapi.db.query(UID).update({
      where: { id },
      data: {
        ...buildScheduleData(merged),
        ...buildAttachmentRelationData(attachmentIds),
      },
      populate: SCHEDULE_POPULATE,
    });

    if (removedAttachmentIds.length > 0) {
      await deleteUploadFiles(strapi, removedAttachmentIds);
    }

    return ctx.send({ schedule: serializeSchedule(updated as Record<string, unknown>) });
  },

  async remove(ctx) {
    const owner = await resolveOwnerFromContext(strapi, ctx);

    if ('error' in owner) {
      return owner.status === 401
        ? ctx.unauthorized(owner.error)
        : ctx.forbidden(owner.error);
    }

    const id = Number(ctx.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return ctx.badRequest('유효한 id가 필요합니다.');
    }

    const existing = await findOwnedSchedule(strapi, owner.userId, id);

    if (!existing) {
      return ctx.notFound('일정을 찾을 수 없습니다.');
    }

    const schedule = toScheduleRecord(existing);
    const attachmentIds = schedule.attachments.map((attachment) => attachment.id);

    await strapi.db.query(UID).delete({ where: { id } });

    if (attachmentIds.length > 0) {
      await deleteUploadFiles(strapi, attachmentIds);
    }

    return ctx.send({ ok: true });
  },

  async excludeOccurrence(ctx) {
    const owner = await resolveOwnerFromContext(strapi, ctx);

    if ('error' in owner) {
      return owner.status === 401
        ? ctx.unauthorized(owner.error)
        : ctx.forbidden(owner.error);
    }

    const id = Number(ctx.params.id);
    const date = parseOccurrenceDate(String(ctx.params.date ?? ''));

    if (!Number.isInteger(id) || id <= 0 || !date) {
      return ctx.badRequest('유효한 id와 date가 필요합니다.');
    }

    const existing = await findOwnedSchedule(strapi, owner.userId, id);

    if (!existing) {
      return ctx.notFound('일정을 찾을 수 없습니다.');
    }

    const schedule = toScheduleRecord(existing);

    if (!isOccurrenceEditableSource(schedule, date)) {
      return ctx.badRequest('해당 날짜는 이 반복 일정에 포함되지 않습니다.');
    }

    const updated = await strapi.db.query(UID).update({
      where: { id },
      data: buildOccurrenceExclusionUpdate(schedule, date),
      populate: SCHEDULE_POPULATE,
    });

    return ctx.send({ schedule: serializeSchedule(updated as Record<string, unknown>) });
  },

  async detachOccurrence(ctx) {
    const owner = await resolveOwnerFromContext(strapi, ctx);

    if ('error' in owner) {
      return owner.status === 401
        ? ctx.unauthorized(owner.error)
        : ctx.forbidden(owner.error);
    }

    const id = Number(ctx.params.id);
    const fromDate = parseOccurrenceDate(String(ctx.params.date ?? ''));

    if (!Number.isInteger(id) || id <= 0 || !fromDate) {
      return ctx.badRequest('유효한 id와 date가 필요합니다.');
    }

    const existing = await findOwnedSchedule(strapi, owner.userId, id);

    if (!existing) {
      return ctx.notFound('일정을 찾을 수 없습니다.');
    }

    const schedule = toScheduleRecord(existing);
    const body = ctx.request.body as OccurrenceDetachInput;
    const fields = resolveOccurrenceFields(schedule, fromDate);
    const detachInput: OccurrenceDetachInput = {
      toDate: String(body.toDate ?? ''),
      title: body.title?.trim() || fields.title,
      startTime: body.startTime || fields.startTime,
      endTime: body.endTime || fields.endTime,
    };
    const error = validateOccurrenceDetachInput(schedule, fromDate, detachInput);

    if (error) {
      return ctx.badRequest(error);
    }

    const updatedParent = await strapi.db.query(UID).update({
      where: { id },
      data: buildParentOccurrenceDetachUpdate(schedule, fromDate),
      populate: SCHEDULE_POPULATE,
    });

    const created = await strapi.db.query(UID).create({
      data: {
        ...buildDetachedOnceScheduleCreateData(schedule, detachInput),
        user: owner.userId,
      },
      populate: SCHEDULE_POPULATE,
    });

    return ctx.send({
      parentSchedule: serializeSchedule(updatedParent as Record<string, unknown>),
      onceSchedule: serializeSchedule(created as Record<string, unknown>),
    });
  },

  async updateOccurrence(ctx) {
    const owner = await resolveOwnerFromContext(strapi, ctx);

    if ('error' in owner) {
      return owner.status === 401
        ? ctx.unauthorized(owner.error)
        : ctx.forbidden(owner.error);
    }

    const id = Number(ctx.params.id);
    const date = parseOccurrenceDate(String(ctx.params.date ?? ''));

    if (!Number.isInteger(id) || id <= 0 || !date) {
      return ctx.badRequest('유효한 id와 date가 필요합니다.');
    }

    const existing = await findOwnedSchedule(strapi, owner.userId, id);

    if (!existing) {
      return ctx.notFound('일정을 찾을 수 없습니다.');
    }

    const schedule = toScheduleRecord(existing);

    if (!isOccurrenceEditableSource(schedule, date)) {
      return ctx.badRequest('해당 날짜는 이 반복 일정에 포함되지 않습니다.');
    }

    const body = ctx.request.body as OccurrenceOverrideInput;
    const error = validateOccurrenceOverride(body, { allDay: schedule.allDay });

    if (error) {
      return ctx.badRequest(error);
    }

    const updated = await strapi.db.query(UID).update({
      where: { id },
      data: buildOccurrenceOverrideUpdate(schedule, date, body),
      populate: SCHEDULE_POPULATE,
    });

    return ctx.send({ schedule: serializeSchedule(updated as Record<string, unknown>) });
  },

  async moveOccurrence(ctx) {
    const owner = await resolveOwnerFromContext(strapi, ctx);

    if ('error' in owner) {
      return owner.status === 401
        ? ctx.unauthorized(owner.error)
        : ctx.forbidden(owner.error);
    }

    const id = Number(ctx.params.id);
    const fromDate = parseOccurrenceDate(String(ctx.params.date ?? ''));

    if (!Number.isInteger(id) || id <= 0 || !fromDate) {
      return ctx.badRequest('유효한 id와 date가 필요합니다.');
    }

    const existing = await findOwnedSchedule(strapi, owner.userId, id);

    if (!existing) {
      return ctx.notFound('일정을 찾을 수 없습니다.');
    }

    const schedule = toScheduleRecord(existing);

    if (!isOccurrenceEditableSource(schedule, fromDate)) {
      return ctx.badRequest('해당 날짜는 이 반복 일정에 포함되지 않습니다.');
    }

    const body = ctx.request.body as OccurrenceMoveInput;
    const validationError = validateOccurrenceMove(body, { allDay: schedule.allDay });

    if (validationError) {
      return ctx.badRequest(validationError);
    }

    const fields = resolveOccurrenceFields(schedule, fromDate);
    const detachInput: OccurrenceDetachInput = {
      toDate: body.toDate.slice(0, 10),
      title: body.title?.trim() || fields.title,
      startTime: body.startTime || fields.startTime,
      endTime: body.endTime || fields.endTime,
    };
    const detachError = validateOccurrenceDetachInput(schedule, fromDate, detachInput);

    if (detachError) {
      return ctx.badRequest(detachError);
    }

    const updatedParent = await strapi.db.query(UID).update({
      where: { id },
      data: buildParentOccurrenceDetachUpdate(schedule, fromDate),
      populate: SCHEDULE_POPULATE,
    });

    const created = await strapi.db.query(UID).create({
      data: {
        ...buildDetachedOnceScheduleCreateData(schedule, detachInput),
        user: owner.userId,
      },
      populate: SCHEDULE_POPULATE,
    });

    return ctx.send({
      parentSchedule: serializeSchedule(updatedParent as Record<string, unknown>),
      onceSchedule: serializeSchedule(created as Record<string, unknown>),
    });
  },
}));
