import { factories, type Core } from '@strapi/strapi';
import {
  isApprovedManager,
  isManagerOfStudent,
  parseStudentUserId,
  resolveOwnerFromContext,
  resolveTargetUserId,
} from '../../../services/manager-access';
import {
  buildTodoDayStampRangeWhere,
  parseTodoDayStampDate,
  serializeTodoDayStamp,
  TODO_DAY_STAMP_UID,
  validateTodoDayStampMessage,
  type TodoDayStampInput,
} from '../../../services/todo-day-stamp';

async function findStampByStudentAndDate(
  strapi: Core.Strapi,
  studentUserId: number,
  date: string
) {
  return strapi.db.query(TODO_DAY_STAMP_UID).findOne({
    where: {
      student: studentUserId,
      date,
    },
  }) as Promise<Record<string, unknown> | null>;
}

export default factories.createCoreController(TODO_DAY_STAMP_UID, ({ strapi }) => ({
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

    const rangeStart = String(start);
    const rangeEnd = String(end);

    const rows = await strapi.db.query(TODO_DAY_STAMP_UID).findMany({
      where: buildTodoDayStampRangeWhere(owner.userId, rangeStart, rangeEnd),
      orderBy: { date: 'asc' },
    });

    return ctx.send({
      stamps: rows.map((row) => serializeTodoDayStamp(row as Record<string, unknown>)),
    });
  },

  async upsertForDate(ctx) {
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized('로그인이 필요합니다.');
    }

    const queryId = ctx.query.studentUserId as string | undefined;
    const bodyId = ctx.request.body?.studentUserId as string | number | undefined;
    const studentUserIdRaw = queryId ?? bodyId;

    if (studentUserIdRaw === undefined || studentUserIdRaw === null || studentUserIdRaw === '') {
      return ctx.forbidden('매니저만 확인도장을 등록할 수 있습니다.');
    }

    const studentUserId = parseStudentUserId(studentUserIdRaw);

    if (studentUserId === null) {
      return ctx.badRequest('유효한 studentUserId가 필요합니다.');
    }

    const isManager = await isApprovedManager(strapi, user.id);

    if (!isManager) {
      return ctx.forbidden('매니저만 확인도장을 등록할 수 있습니다.');
    }

    const assigned = await isManagerOfStudent(strapi, user.id, studentUserId);

    if (!assigned) {
      return ctx.forbidden('담당 학생이 아닙니다.');
    }

    const subscribed = await resolveTargetUserId(strapi, user.id, studentUserId);

    if ('error' in subscribed) {
      return ctx.forbidden(subscribed.error);
    }

    const date = parseTodoDayStampDate(String(ctx.params.date ?? ''));

    if (!date) {
      return ctx.badRequest('유효한 date가 필요합니다. (YYYY-MM-DD)');
    }

    const body = ctx.request.body as TodoDayStampInput;
    const messageError = validateTodoDayStampMessage(String(body.message ?? ''));

    if (messageError) {
      return ctx.badRequest(messageError);
    }

    const message = String(body.message).trim();
    const stampedAt = new Date();
    const existing = await findStampByStudentAndDate(strapi, studentUserId, date);

    const saved = existing
      ? await strapi.db.query(TODO_DAY_STAMP_UID).update({
          where: { id: existing.id },
          data: {
            message,
            manager: user.id,
            stampedAt,
          },
        })
      : await strapi.db.query(TODO_DAY_STAMP_UID).create({
          data: {
            student: studentUserId,
            manager: user.id,
            date,
            message,
            stampedAt,
          },
        });

    return ctx.send({
      stamp: serializeTodoDayStamp(saved as Record<string, unknown>),
    });
  },
}));
