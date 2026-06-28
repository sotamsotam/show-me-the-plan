import { factories, type Core } from '@strapi/strapi';
import { resolveOwnerFromContext } from '../../../services/manager-access';
import {
  buildExecutionUpdate,
  buildFindInRangeResponse,
  buildOccurrenceExclusionUpdate,
  buildOccurrenceOverrideUpdate,
  buildStudyPlanTodoData,
  buildTodoOverlapWhereClause,
  collectStudyPlanTodoTitles,
  expandStudyPlanTodosToEvents,
  filterTitlesByQuery,
  isOccurrenceEditableSource,
  isValidExecutionDate,
  parseStudyPlanFindInclude,
  serializeStudyPlanTodo,
  toStudyPlanTodoRecord,
  buildAllowedPlanSubjectIds,
  parseUserSubjects,
  validateExecutionInput,
  validateOccurrenceOverride,
  validateStudyPlanTodoInput,
  type ExecutionRecordInput,
  type OccurrenceOverrideInput,
  type StudyPlanTodoInput,
} from '../../../services/study-plan-todo';
import {
  cancelAllPendingForTodo,
  handleExecutionNotificationUpdate,
  syncTodoNotificationQueueFromRaw,
} from '../../../services/study-plan-todo-notify';
import {
  clearExamPrepWeeklyPlanItemScheduledTodoId,
  clearExamPrepWeeklyPlanScheduledTodoIdByTodoId,
  resolveExamPrepWeeklyPlans,
} from '../../../services/exam-prep-weekly-plan';
import {
  clearRegularWeeklyPlanItemScheduledTodoId,
  clearRegularWeeklyPlanScheduledTodoIdByTodoId,
  resolveRegularWeeklyPlans,
} from '../../../services/regular-weekly-plan';
import {
  clearVacationWeeklyPlanItemScheduledTodoId,
  clearVacationWeeklyPlanScheduledTodoIdByTodoId,
  resolveVacationWeeklyPlans,
} from '../../../services/vacation-weekly-plan';
import { resolveProfileSubjects } from '../../../services/user-subject-validation';

const UID = 'api::study-plan-todo.study-plan-todo' as const;

async function loadAllowedSubjectIds(strapi: Core.Strapi, userId: number) {
  const profile = await strapi.db.query('api::user-profile.user-profile').findOne({
    where: { user: userId },
  });

  return buildAllowedPlanSubjectIds(parseUserSubjects(profile?.subjects ?? null));
}

async function loadProfileSubjects(strapi: Core.Strapi, userId: number) {
  const profile = await strapi.db.query('api::user-profile.user-profile').findOne({
    where: { user: userId },
  });

  return parseUserSubjects(profile?.subjects ?? null);
}

async function findOwnedTodo(strapi: Core.Strapi, userId: number, id: number) {
  return strapi.db.query(UID).findOne({
    where: { id, user: userId },
  }) as Promise<Record<string, unknown> | null>;
}

async function revertWeeklyPlansOnTodoDelete(
  strapi: Core.Strapi,
  userId: number,
  todo: ReturnType<typeof toStudyPlanTodoRecord>
): Promise<void> {
  const profile = await strapi.db.query('api::user-profile.user-profile').findOne({
    where: { user: userId },
  });

  if (!profile) {
    return;
  }

  const currentExamPlans = resolveExamPrepWeeklyPlans(profile.examPrepWeeklyPlans);
  const currentVacationPlans = resolveVacationWeeklyPlans(profile.vacationWeeklyPlans);
  const currentRegularPlans = resolveRegularWeeklyPlans(profile.regularWeeklyPlans);
  let nextExamPlans = currentExamPlans;
  let nextVacationPlans = currentVacationPlans;
  let nextRegularPlans = currentRegularPlans;
  const source = todo.weeklyPlanSource;

  if (source?.kind === 'exam-prep') {
    nextExamPlans = clearExamPrepWeeklyPlanItemScheduledTodoId(
      nextExamPlans,
      source.roundSlot,
      source.weekNumber,
      source.subjectId,
      source.itemId
    );
  }

  if (source?.kind === 'vacation') {
    nextVacationPlans = clearVacationWeeklyPlanItemScheduledTodoId(
      nextVacationPlans,
      source.periodSlot,
      source.weekNumber,
      source.subjectId,
      source.itemId
    );
  }

  if (source?.kind === 'regular') {
    nextRegularPlans = clearRegularWeeklyPlanItemScheduledTodoId(
      nextRegularPlans,
      source.periodKey,
      source.weekNumber,
      source.subjectId,
      source.itemId
    );
  }

  nextExamPlans = clearExamPrepWeeklyPlanScheduledTodoIdByTodoId(nextExamPlans, todo.id);
  nextVacationPlans = clearVacationWeeklyPlanScheduledTodoIdByTodoId(
    nextVacationPlans,
    todo.id
  );
  nextRegularPlans = clearRegularWeeklyPlanScheduledTodoIdByTodoId(nextRegularPlans, todo.id);

  const examChanged = nextExamPlans !== currentExamPlans;
  const vacationChanged = nextVacationPlans !== currentVacationPlans;
  const regularChanged = nextRegularPlans !== currentRegularPlans;

  if (!examChanged && !vacationChanged && !regularChanged) {
    return;
  }

  const data: Record<string, unknown> = {};
  if (examChanged) {
    data.examPrepWeeklyPlans = nextExamPlans;
  }
  if (vacationChanged) {
    data.vacationWeeklyPlans = nextVacationPlans;
  }
  if (regularChanged) {
    data.regularWeeklyPlans = nextRegularPlans;
  }

  await strapi.db.query('api::user-profile.user-profile').update({
    where: { id: profile.id },
    data,
  });
}

function parseOccurrenceDate(raw: string): string | null {
  const date = raw.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

export default factories.createCoreController(UID, ({ strapi }) => ({
  async findInRange(ctx) {
    const owner = await resolveOwnerFromContext(strapi, ctx);

    if ('error' in owner) {
      return owner.status === 401
        ? ctx.unauthorized(owner.error)
        : ctx.forbidden(owner.error);
    }

    const { start = '', end = '', include: includeRaw } = ctx.query as {
      start?: string;
      end?: string;
      include?: string;
    };

    if (!start || !end) {
      return ctx.badRequest('start, end는 필수입니다. (YYYY-MM-DD)');
    }

    const parsedInclude = parseStudyPlanFindInclude(includeRaw);

    if ('error' in parsedInclude) {
      return ctx.badRequest(parsedInclude.error);
    }

    const rangeStart = String(start);
    const rangeEnd = String(end);

    const rows = await strapi.db.query(UID).findMany({
      where: buildTodoOverlapWhereClause(owner.userId, rangeStart, rangeEnd),
      orderBy: { id: 'asc' },
    });

    const todos = rows.map((row) =>
      serializeStudyPlanTodo(row as Record<string, unknown>, {
        start: rangeStart,
        end: rangeEnd,
      })
    );
    const events = expandStudyPlanTodosToEvents(
      rows.map((row) => toStudyPlanTodoRecord(row as Record<string, unknown>)),
      rangeStart,
      rangeEnd
    );
    const profileSubjects = resolveProfileSubjects(
      await loadProfileSubjects(strapi, owner.userId)
    );

    return ctx.send({
      ...buildFindInRangeResponse(parsedInclude, todos, events),
      subjects: profileSubjects,
    });
  },

  async findTitles(ctx) {
    const owner = await resolveOwnerFromContext(strapi, ctx);

    if ('error' in owner) {
      return owner.status === 401
        ? ctx.unauthorized(owner.error)
        : ctx.forbidden(owner.error);
    }

    const { q = '' } = ctx.query as { q?: string; subject?: string };
    const subjectRaw = typeof ctx.query.subject === 'string' ? ctx.query.subject.trim() : '';
    const allowedSubjectIds = await loadAllowedSubjectIds(strapi, owner.userId);
    const subject =
      subjectRaw && allowedSubjectIds.has(subjectRaw) ? subjectRaw : undefined;

    const rows = await strapi.db.query(UID).findMany({
      where: { user: owner.userId },
      select: ['title', 'overrides', 'subject'],
      orderBy: { id: 'asc' },
    });

    const titles = filterTitlesByQuery(
      collectStudyPlanTodoTitles(
        rows.map((row) => toStudyPlanTodoRecord(row as Record<string, unknown>)),
        subject
      ),
      String(q)
    );

    return ctx.send({ titles });
  },

  async create(ctx) {
    const owner = await resolveOwnerFromContext(strapi, ctx);

    if ('error' in owner) {
      return owner.status === 401
        ? ctx.unauthorized(owner.error)
        : ctx.forbidden(owner.error);
    }

    const body = ctx.request.body as StudyPlanTodoInput;
    const profileSubjects = await loadProfileSubjects(strapi, owner.userId);
    const error = validateStudyPlanTodoInput(body, { profileSubjects });

    if (error) {
      return ctx.badRequest(error);
    }

    const created = await strapi.db.query(UID).create({
      data: {
        ...buildStudyPlanTodoData(body),
        user: owner.userId,
      },
    });

    await syncTodoNotificationQueueFromRaw(
      strapi,
      created as Record<string, unknown>,
      owner.userId
    );

    return ctx.send({
      todo: serializeStudyPlanTodo(created as Record<string, unknown>),
    });
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

    const existing = await findOwnedTodo(strapi, owner.userId, id);

    if (!existing) {
      return ctx.notFound('스터디 플랜을 찾을 수 없습니다.');
    }

    const body = ctx.request.body as StudyPlanTodoInput;
    const profileSubjects = await loadProfileSubjects(strapi, owner.userId);
    const error = validateStudyPlanTodoInput(body, { partial: true, profileSubjects });

    if (error) {
      return ctx.badRequest(error);
    }

    const current = toStudyPlanTodoRecord(existing);
    const merged: StudyPlanTodoInput = {
      subject: body.subject ?? current.subject,
      title: body.title ?? current.title,
      startTime: body.startTime ?? current.startTime,
      endTime: body.endTime ?? current.endTime,
      recurrenceType: body.recurrenceType ?? current.recurrenceType,
      daysOfWeek: body.daysOfWeek ?? current.daysOfWeek,
      validFrom: body.validFrom ?? current.validFrom ?? undefined,
      validUntil: body.validUntil ?? current.validUntil ?? undefined,
      date: body.date ?? current.date ?? undefined,
      excludedDates: body.excludedDates ?? current.excludedDates,
      overrides: body.overrides ?? current.overrides,
      weeklyPlanSource:
        body.weeklyPlanSource !== undefined
          ? body.weeklyPlanSource
          : current.weeklyPlanSource ?? undefined,
    };

    const fullError = validateStudyPlanTodoInput(merged, { profileSubjects });

    if (fullError) {
      return ctx.badRequest(fullError);
    }

    const updated = await strapi.db.query(UID).update({
      where: { id },
      data: buildStudyPlanTodoData(merged),
    });

    await syncTodoNotificationQueueFromRaw(
      strapi,
      updated as Record<string, unknown>,
      owner.userId
    );

    return ctx.send({
      todo: serializeStudyPlanTodo(updated as Record<string, unknown>),
    });
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

    const existing = await findOwnedTodo(strapi, owner.userId, id);

    if (!existing) {
      return ctx.notFound('스터디 플랜을 찾을 수 없습니다.');
    }

    const todo = toStudyPlanTodoRecord(existing);

    await revertWeeklyPlansOnTodoDelete(strapi, owner.userId, todo);
    await cancelAllPendingForTodo(strapi, id, 'cancelled');
    await strapi.db.query(UID).delete({ where: { id } });

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

    const existing = await findOwnedTodo(strapi, owner.userId, id);

    if (!existing) {
      return ctx.notFound('스터디 플랜을 찾을 수 없습니다.');
    }

    const todo = toStudyPlanTodoRecord(existing);

    if (!isOccurrenceEditableSource(todo, date)) {
      return ctx.badRequest('해당 날짜는 이 반복 일정에 포함되지 않습니다.');
    }

    const updated = await strapi.db.query(UID).update({
      where: { id },
      data: buildOccurrenceExclusionUpdate(todo, date),
    });

    await syncTodoNotificationQueueFromRaw(
      strapi,
      updated as Record<string, unknown>,
      owner.userId
    );

    return ctx.send({
      todo: serializeStudyPlanTodo(updated as Record<string, unknown>),
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

    const existing = await findOwnedTodo(strapi, owner.userId, id);

    if (!existing) {
      return ctx.notFound('스터디 플랜을 찾을 수 없습니다.');
    }

    const todo = toStudyPlanTodoRecord(existing);

    if (!isOccurrenceEditableSource(todo, date)) {
      return ctx.badRequest('해당 날짜는 이 반복 일정에 포함되지 않습니다.');
    }

    const body = ctx.request.body as OccurrenceOverrideInput;
    const error = validateOccurrenceOverride(body);

    if (error) {
      return ctx.badRequest(error);
    }

    const updated = await strapi.db.query(UID).update({
      where: { id },
      data: buildOccurrenceOverrideUpdate(todo, date, body),
    });

    await syncTodoNotificationQueueFromRaw(
      strapi,
      updated as Record<string, unknown>,
      owner.userId
    );

    return ctx.send({
      todo: serializeStudyPlanTodo(updated as Record<string, unknown>),
    });
  },

  async updateExecution(ctx) {
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

    const existing = await findOwnedTodo(strapi, owner.userId, id);

    if (!existing) {
      return ctx.notFound('스터디 플랜을 찾을 수 없습니다.');
    }

    const todo = toStudyPlanTodoRecord(existing);

    if (!isValidExecutionDate(todo, date)) {
      return ctx.badRequest('해당 날짜는 이 스터디 플랜에 포함되지 않습니다.');
    }

    const body = ctx.request.body as ExecutionRecordInput;
    const error = validateExecutionInput(body);

    if (error) {
      return ctx.badRequest(error);
    }

    const updated = await strapi.db.query(UID).update({
      where: { id },
      data: buildExecutionUpdate(todo, date, body),
    });

    const updatedTodo = toStudyPlanTodoRecord(updated as Record<string, unknown>);

    await handleExecutionNotificationUpdate(
      strapi,
      updatedTodo,
      owner.userId,
      date,
      body.status!
    );

    return ctx.send({
      todo: serializeStudyPlanTodo(updated as Record<string, unknown>),
    });
  },
}));
