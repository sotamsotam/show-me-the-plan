import { factories, type Core } from '@strapi/strapi';
import {
  getSchoolTimetableBundle,
  isoDateRangeToYmd,
} from '../../../services/neis';
import {
  hasSchoolProfileIdentityChanged,
  resolveFallbackSubjectsForOtherStudent,
  resolveSeedSubjectsForProfile,
  type StudentSchoolProfileForSeed,
} from '../../../services/user-subject-seed';
import {
  buildAllowedPlanSubjectIds,
  resolveProfileSubjects,
  validateAndNormalizeUserSubjects,
} from '../../../services/user-subject-validation';
import {
  isApprovedManager,
  resolveOwnerFromContext,
  resolveTargetUserId,
} from '../../../services/manager-access';
import {
  assignManager as assignManagerRecord,
  findActiveByManager,
  findActiveByStudent,
  removeManager as removeManagerRecord,
} from '../../../services/student-manager-assignment';
import {
  isAnyStudentSchoolLevel,
  isNeisSchoolLevel,
  isOtherSchoolLevel,
  type NeisSchoolLevel,
} from '../../../services/school-level';
import {
  buildOtherStudentTimetableResponse,
  createEmptyNeisScheduleBundle,
  shouldSkipNeisScheduleFetch,
} from '../../../services/student-neis-schedule';
import {
  buildConsentProfileFields,
  validateSignupConsents,
} from '../../../services/legal-consent';
import { deleteUserAccount } from '../../../services/account-deletion';
import { maskEmailHint } from '../../../services/email-hint';
import {
  createTrialSubscription,
  getSubscriptionSummaryForUser,
  hasActiveSubscription,
} from '../../../services/subscription';
import {
  validateSignupProfile,
  validateStudentProfileFields,
} from '../../../services/user-profile-validation';

import {
  assignExamRoundSlots,
  buildExamRoundPreview,
  createDefaultExamPrepWeeksByRound,
  DEFAULT_EXAM_PREP_WEEKS,
  groupExamEvents,
  MAX_EXAM_PREP_WEEKS,
  MIN_EXAM_PREP_WEEKS,
  resolveExamCountdownYearDateRange,
  resolveExamPrepWeeksByRound,
  validateExamPrepWeeksByRoundInput,
} from '../../../services/exam-countdown';
import {
  buildNeisExamSuggestionsFromPreview,
  resolveEffectiveExamRoundPreview,
  resolveExamPeriodSettings,
  validateExamPeriodSettingsInput,
} from '../../../services/exam-period-settings';
import {
  createEmptyExamPrepWeeklyPlans,
  resolveExamPrepWeeklyPlans,
  validateExamPrepWeeklyPlansInput,
} from '../../../services/exam-prep-weekly-plan';
import {
  carryOverExamPrepWeeklyPlanItem,
  deleteExamPrepWeeklyPlanItem,
} from '../../../services/exam-prep-weekly-plan-unachieved';
import { cancelAllPendingForTodo } from '../../../services/study-plan-todo-notify';
import {
  appendExamPrepWeeklyPlanTemplate,
  createEmptyExamPrepWeeklyPlanTemplates,
  removeExamPrepWeeklyPlanTemplate,
  resolveExamPrepWeeklyPlanTemplates,
  validateCreateExamPrepWeeklyPlanTemplateInput,
} from '../../../services/exam-prep-weekly-plan-template';
import {
  buildNeisVacationSuggestions,
  buildVacationPeriodPreviewFromSettings,
  resolveVacationPeriodSettings,
  validateVacationPeriodSettingsInput,
} from '../../../services/vacation-period-settings';
import {
  resolveVacationWeeklyPlans,
  validateVacationWeeklyPlansInput,
} from '../../../services/vacation-weekly-plan';
import {
  appendVacationWeeklyPlanTemplate,
  createEmptyVacationWeeklyPlanTemplates,
  removeVacationWeeklyPlanTemplate,
  resolveVacationWeeklyPlanTemplates,
  validateCreateVacationWeeklyPlanTemplateInput,
} from '../../../services/vacation-weekly-plan-template';
import { buildRegularPeriodSegmentPreview } from '../../../services/regular-period-segments';
import {
  resolveRegularWeeklyPlans,
  validateRegularWeeklyPlansInput,
} from '../../../services/regular-weekly-plan';
import {
  appendRegularWeeklyPlanTemplate,
  removeRegularWeeklyPlanTemplate,
  resolveRegularWeeklyPlanTemplates,
  validateCreateRegularWeeklyPlanTemplateInput,
} from '../../../services/regular-weekly-plan-template';

const STUDY_PLAN_TODO_UID = 'api::study-plan-todo.study-plan-todo' as const;

async function deleteOwnedStudyPlanTodoWithoutWeeklyPlanRevert(
  strapi: Core.Strapi,
  userId: number,
  todoId: number
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  if (!Number.isInteger(todoId) || todoId <= 0) {
    return { ok: false, error: '유효한 todo id가 필요합니다.', status: 400 };
  }

  const existing = await strapi.db.query(STUDY_PLAN_TODO_UID).findOne({
    where: { id: todoId, user: userId },
  });

  if (!existing) {
    return { ok: false, error: '스터디 플랜을 찾을 수 없습니다.', status: 404 };
  }

  await cancelAllPendingForTodo(strapi, todoId, 'cancelled');
  await strapi.db.query(STUDY_PLAN_TODO_UID).delete({ where: { id: todoId } });

  return { ok: true };
}

function parseExamPrepWeeklyPlanItemRef(body: Record<string, unknown>) {
  const roundSlot = typeof body.roundSlot === 'string' ? body.roundSlot.trim() : '';
  const weekNumber = Number(body.weekNumber ?? body.fromWeek);
  const subjectId = typeof body.subjectId === 'string' ? body.subjectId.trim() : '';
  const itemId = typeof body.itemId === 'string' ? body.itemId.trim() : '';

  if (
    !roundSlot ||
    !Number.isInteger(weekNumber) ||
    weekNumber < 1 ||
    !subjectId ||
    !itemId
  ) {
    return null;
  }

  return { roundSlot, weekNumber, subjectId, itemId };
}

async function findRegistrationConflict(
  strapi: Core.Strapi,
  username: string,
  email: string
): Promise<string | null> {
  const normalizedEmail = email.toLowerCase();

  const existingByEmail = await strapi.db
    .query('plugin::users-permissions.user')
    .findOne({ where: { email: normalizedEmail } });

  if (existingByEmail) {
    return '이미 사용 중인 이메일입니다.';
  }

  const existingByUsername = await strapi.db
    .query('plugin::users-permissions.user')
    .findOne({ where: { username } });

  if (existingByUsername) {
    return '이미 사용 중인 닉네임입니다.';
  }

  const emailUsedAsUsername = await strapi.db
    .query('plugin::users-permissions.user')
    .findOne({ where: { username: normalizedEmail } });

  if (emailUsedAsUsername) {
    return '이미 사용 중인 이메일입니다.';
  }

  const nicknameUsedAsEmail = await strapi.db
    .query('plugin::users-permissions.user')
    .findOne({ where: { email: username } });

  if (nicknameUsedAsEmail) {
    return '이미 사용 중인 닉네임입니다.';
  }

  return null;
}

function formatRole(role: { id: number; name: string; type: string } | null) {
  if (!role) {
    return null;
  }

  return {
    id: role.id,
    name: role.name,
    type: role.type,
  };
}

function formatManagerUser(
  user: { id: number; username: string; email: string } | null | undefined
) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    email: user.email,
  };
}

function formatExamPrepSettings(profile: Record<string, unknown>) {
  const settings = resolveExamPrepWeeksByRound(
    profile.examPrepWeeksByRound,
    profile.examPrepWeeksBefore
  );

  return {
    examPrepWeeksBefore: settings.defaultWeeks,
    examPrepWeeksByRound: settings,
  };
}

function buildEffectiveExamRoundPreview(
  profile: StudentExamPrepProfile,
  neisPreview: ReturnType<typeof buildExamRoundPreview>
) {
  return resolveEffectiveExamRoundPreview(
    resolveExamPeriodSettings(profile.examPeriodSettings),
    neisPreview
  );
}

async function seedSubjectsForStudentProfile(
  profile: StudentSchoolProfileForSeed
) {
  return resolveSeedSubjectsForProfile(profile);
}

function toStudentSchoolProfileForSeed(profile: {
  schoolLevel: string;
  atptOfcdcScCode: string;
  sdSchulCode: string;
  grade: string;
  className: string;
}): StudentSchoolProfileForSeed {
  return {
    schoolLevel: profile.schoolLevel as StudentSchoolProfileForSeed['schoolLevel'],
    atptOfcdcScCode: profile.atptOfcdcScCode,
    sdSchulCode: profile.sdSchulCode,
    grade: profile.grade,
    className: profile.className,
  };
}

async function findStudentProfileForSubjects(
  strapi: Core.Strapi,
  userId: number,
  studentUserId?: string | number | null
): Promise<
  | { profile: { id: number; documentId?: string; schoolLevel: string; subjects?: unknown } }
  | { error: string; status: 400 | 403 }
> {
  const target = await resolveTargetUserId(strapi, userId, studentUserId);

  if ('error' in target) {
    return { error: target.error, status: 403 };
  }

  const profile = await strapi.db.query('api::user-profile.user-profile').findOne({
    where: { user: target.userId },
  });

  if (!profile) {
    return { error: '프로필이 없습니다.', status: 400 };
  }

  if (profile.schoolLevel === 'manager') {
    return { error: '매니저 계정은 과목 설정을 사용할 수 없습니다.', status: 403 };
  }

  if (!isAnyStudentSchoolLevel(profile.schoolLevel)) {
    return { error: '학생 계정만 과목 설정을 사용할 수 있습니다.', status: 403 };
  }

  return { profile };
}

type StudentExamPrepProfile = {
  id: number;
  documentId?: string;
  schoolLevel: string;
  atptOfcdcScCode?: string | null;
  sdSchulCode?: string | null;
  grade?: string | null;
  className?: string | null;
  examPrepWeeksBefore?: number;
  examPrepWeeksByRound?: unknown;
  examPrepWeeklyPlans?: unknown;
  examPrepWeeklyPlanTemplates?: unknown;
  examPeriodSettings?: unknown;
  vacationWeeklyPlans?: unknown;
  vacationWeeklyPlanTemplates?: unknown;
  vacationPeriodSettings?: unknown;
  regularWeeklyPlans?: unknown;
  regularWeeklyPlanTemplates?: unknown;
  subjects?: unknown;
};

async function findStudentProfileForExamPrep(
  strapi: Core.Strapi,
  userId: number,
  studentUserId?: string | number | null,
  messages?: {
    missingProfile?: string;
    notStudent?: string;
  }
): Promise<
  | { profile: StudentExamPrepProfile }
  | { error: string; status: 400 | 403 }
> {
  const target = await resolveTargetUserId(strapi, userId, studentUserId);

  if ('error' in target) {
    return { error: target.error, status: 403 };
  }

  const profile = await strapi.db.query('api::user-profile.user-profile').findOne({
    where: { user: target.userId },
  });

  if (!profile) {
    return {
      error: messages?.missingProfile ?? '프로필이 없습니다.',
      status: 400,
    };
  }

  if (!isAnyStudentSchoolLevel(profile.schoolLevel)) {
    return {
      error:
        messages?.notStudent ??
        '학생 계정만 시험기간 주차별 공부계획을 사용할 수 있습니다.',
      status: 403,
    };
  }

  return { profile: profile as StudentExamPrepProfile };
}

async function fetchStudentScheduleBundle(profile: StudentExamPrepProfile) {
  if (shouldSkipNeisScheduleFetch(profile.schoolLevel)) {
    return createEmptyNeisScheduleBundle();
  }

  const { fromDate, toDate } = resolveExamCountdownYearDateRange(new Date());
  return getSchoolTimetableBundle({
    schoolLevel: profile.schoolLevel as NeisSchoolLevel,
    atptOfcdcScCode: profile.atptOfcdcScCode as string,
    sdSchulCode: profile.sdSchulCode as string,
    grade: profile.grade as string,
    className: profile.className as string,
    fromDate,
    toDate,
  });
}

async function buildExamPrepWeeklyPlansContext(profile: StudentExamPrepProfile) {
  const { scheduleEvents } = await fetchStudentScheduleBundle(profile);

  const examEvents = scheduleEvents
    .filter((event) => event.kind === 'exam')
    .map(({ date, title }) => ({ date, title }));

  const holidayEvents = scheduleEvents
    .filter((event) => event.kind === 'holiday')
    .map(({ date, title }) => ({ date, title }));

  const groupsWithSlots = assignExamRoundSlots(groupExamEvents(examEvents), holidayEvents);
  const neisExamRoundPreview = buildExamRoundPreview(groupsWithSlots);
  const examPrepSettings = formatExamPrepSettings(profile);
  const subjects = resolveProfileSubjects(profile.subjects ?? null);

  return {
    ...examPrepSettings,
    examPrepWeeklyPlans: resolveExamPrepWeeklyPlans(profile.examPrepWeeklyPlans),
    examPeriodSettings: resolveExamPeriodSettings(profile.examPeriodSettings),
    subjects,
    examRoundPreview: buildEffectiveExamRoundPreview(profile, neisExamRoundPreview),
  };
}

async function buildVacationWeeklyPlansContext(profile: StudentExamPrepProfile) {
  const subjects = resolveProfileSubjects(profile.subjects ?? null);
  const vacationPeriodSettings = resolveVacationPeriodSettings(profile.vacationPeriodSettings);
  const vacationPeriodPreview = buildVacationPeriodPreviewFromSettings(vacationPeriodSettings);

  return {
    vacationWeeklyPlans: resolveVacationWeeklyPlans(profile.vacationWeeklyPlans),
    vacationPeriodPreview,
    subjects,
  };
}

async function buildRegularWeeklyPlansContext(profile: StudentExamPrepProfile) {
  const examContext = await buildExamPrepWeeklyPlansContext(profile);
  const vacationPeriodSettings = resolveVacationPeriodSettings(profile.vacationPeriodSettings);
  const regularPeriodPreview = buildRegularPeriodSegmentPreview({
    vacationPeriodSettings,
    examRoundPreview: examContext.examRoundPreview,
    examPrepWeeksByRound: examContext.examPrepWeeksByRound,
  });

  return {
    regularWeeklyPlans: resolveRegularWeeklyPlans(profile.regularWeeklyPlans),
    regularPeriodPreview,
    subjects: examContext.subjects,
  };
}

async function buildVacationPeriodSettingsContext(profile: StudentExamPrepProfile) {
  const { scheduleEvents } = await fetchStudentScheduleBundle(profile);

  const holidayEvents = scheduleEvents
    .filter((event) => event.kind === 'holiday')
    .map(({ date, title }) => ({ date, title }));

  return {
    vacationPeriodSettings: resolveVacationPeriodSettings(profile.vacationPeriodSettings),
    neisVacationSuggestions: buildNeisVacationSuggestions(holidayEvents),
  };
}

async function updateProfileRecord(
  strapi: Core.Strapi,
  profile: { id: number; documentId?: string },
  data: Record<string, unknown>
) {
  if (profile.documentId) {
    await strapi.documents('api::user-profile.user-profile').update({
      documentId: profile.documentId,
      data,
    });
    return;
  }

  await strapi.db.query('api::user-profile.user-profile').update({
    where: { id: profile.id },
    data,
  });
}

function parseManagerUserId(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') {
    return null;
  }

  const id = typeof raw === 'number' ? raw : Number(raw);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

async function formatProfileWithManagers(
  strapi: Core.Strapi,
  studentUserId: number,
  profile: Record<string, unknown> | null
) {
  if (!profile) {
    return null;
  }

  const assignments = await findActiveByStudent(strapi, studentUserId);

  return {
    ...profile,
    ...formatExamPrepSettings(profile),
    examPrepWeeklyPlans: resolveExamPrepWeeklyPlans(profile.examPrepWeeklyPlans),
    assignedManagers: assignments.map((assignment) => assignment.manager),
  };
}

async function buildAccountResponse(
  strapi: Core.Strapi,
  user: { id: number; username?: string; email?: string }
) {
  const userWithRole = await strapi.db
    .query('plugin::users-permissions.user')
    .findOne({
      where: { id: user.id },
      populate: ['role'],
    });

  const profile = await strapi.db.query('api::user-profile.user-profile').findOne({
    where: { user: user.id },
  });

  return {
    user: {
      id: user.id,
      username: userWithRole?.username ?? user.username,
      email: userWithRole?.email ?? user.email,
    },
    role: formatRole(userWithRole?.role ?? null),
    profile: await formatProfileWithManagers(
      strapi,
      user.id,
      profile as Record<string, unknown> | null
    ),
    subscription: await getSubscriptionSummaryForUser(strapi, user.id),
  };
}

export default factories.createCoreController(
  'api::user-profile.user-profile',
  ({ strapi }) => ({
    async emailHintByUsername(ctx) {
      const { username } = ctx.request.body as { username?: string };

      if (!username || typeof username !== 'string' || !username.trim()) {
        return ctx.badRequest('닉네임은 필수입니다.');
      }

      const user = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { username: username.trim() },
        select: ['email'],
      });

      if (!user?.email) {
        return ctx.notFound('입력하신 닉네임과 일치하는 계정을 찾을 수 없습니다.');
      }

      return ctx.send({
        maskedEmail: maskEmailHint(String(user.email)),
      });
    },

    async registerWithProfile(ctx) {
      const { username, email, password, profile, consents } = ctx.request.body as {
        username?: string;
        email?: string;
        password?: string;
        profile?: Record<string, unknown>;
        consents?: Record<string, unknown>;
      };

      if (!username || !email || !password) {
        return ctx.badRequest('username, email, password는 필수입니다.');
      }

      const consentError = validateSignupConsents(consents);
      if (consentError) {
        return ctx.badRequest(consentError);
      }

      const profileError = validateSignupProfile(profile ?? {});
      if (profileError) {
        return ctx.badRequest(profileError);
      }

      if (profile && 'isOperator' in profile && profile.isOperator) {
        return ctx.badRequest('운영자 계정은 공개 가입으로 생성할 수 없습니다.');
      }

      const consentFields = buildConsentProfileFields(consents!);

      const authenticatedRole = await strapi.db
        .query('plugin::users-permissions.role')
        .findOne({ where: { type: 'authenticated' } });

      if (!authenticatedRole) {
        return ctx.internalServerError('기본 사용자 역할을 찾을 수 없습니다.');
      }

      const isManagerSignup = profile?.schoolLevel === 'manager';
      const isOtherStudentSignup = isOtherSchoolLevel(profile?.schoolLevel);

      const registrationConflict = await findRegistrationConflict(
        strapi,
        username,
        email
      );
      if (registrationConflict) {
        return ctx.badRequest(registrationConflict);
      }

      try {
        const user = await strapi.plugin('users-permissions').service('user').add({
          username,
          email: email.toLowerCase(),
          password,
          provider: 'local',
          role: authenticatedRole.id,
          confirmed: true,
        });

        const neisStudentProfile = {
          schoolLevel: profile!.schoolLevel as NeisSchoolLevel,
          atptOfcdcScCode: profile!.atptOfcdcScCode as string,
          sdSchulCode: profile!.sdSchulCode as string,
          schoolName: profile!.schoolName as string,
          grade: profile!.grade as string,
          className: profile!.className as string,
          examPrepWeeksBefore: DEFAULT_EXAM_PREP_WEEKS,
          examPrepWeeksByRound: createDefaultExamPrepWeeksByRound(),
          examPrepWeeklyPlans: createEmptyExamPrepWeeklyPlans(),
          examPrepWeeklyPlanTemplates: createEmptyExamPrepWeeklyPlanTemplates(),
          subjects: await seedSubjectsForStudentProfile(
            toStudentSchoolProfileForSeed({
              schoolLevel: profile!.schoolLevel as string,
              atptOfcdcScCode: profile!.atptOfcdcScCode as string,
              sdSchulCode: profile!.sdSchulCode as string,
              grade: profile!.grade as string,
              className: profile!.className as string,
            })
          ),
          user: user.id,
        };

        const otherStudentProfile = {
          schoolLevel: 'other' as const,
          examPrepWeeksBefore: DEFAULT_EXAM_PREP_WEEKS,
          examPrepWeeksByRound: createDefaultExamPrepWeeksByRound(),
          examPrepWeeklyPlans: createEmptyExamPrepWeeklyPlans(),
          examPrepWeeklyPlanTemplates: createEmptyExamPrepWeeklyPlanTemplates(),
          subjects: resolveFallbackSubjectsForOtherStudent(),
          user: user.id,
        };

        await strapi.db.query('api::user-profile.user-profile').create({
          data: isManagerSignup
            ? {
                schoolLevel: 'manager' as const,
                managerStatus: 'approved' as const,
                user: user.id,
                ...consentFields,
              }
            : isOtherStudentSignup
              ? { ...otherStudentProfile, ...consentFields }
              : { ...neisStudentProfile, ...consentFields },
        });

        if (!isManagerSignup) {
          await createTrialSubscription(strapi, user.id);
        }

        const jwt = strapi.plugin('users-permissions').service('jwt').issue({
          id: user.id,
        });

        return ctx.send({
          jwt,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
          },
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '회원가입에 실패했습니다.';
        return ctx.badRequest(message);
      }
    },

    async me(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('로그인이 필요합니다.');
      }

      return ctx.send(await buildAccountResponse(strapi, user));
    },

    async deleteMe(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('로그인이 필요합니다.');
      }

      const { password } = ctx.request.body as { password?: unknown };
      const result = await deleteUserAccount(strapi, Number(user.id), password);

      if (result.ok === false) {
        if (result.status === 400) {
          return ctx.badRequest(result.error);
        }
        if (result.status === 401) {
          return ctx.unauthorized(result.error);
        }
        if (result.status === 404) {
          return ctx.notFound(result.error);
        }
        return ctx.internalServerError(result.error);
      }

      return ctx.send({ success: true });
    },

    async updateMe(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('로그인이 필요합니다.');
      }

      const { username, email, profile: profileUpdate } = ctx.request.body as {
        username?: string;
        email?: string;
        profile?: Record<string, unknown>;
      };

      const userUpdates: { username?: string; email?: string } = {};

      if (username !== undefined) {
        if (typeof username !== 'string' || username.trim().length < 3) {
          return ctx.badRequest('사용자명은 3자 이상이어야 합니다.');
        }
        userUpdates.username = username.trim();
      }

      if (email !== undefined) {
        if (typeof email !== 'string' || !email.trim()) {
          return ctx.badRequest('이메일은 필수입니다.');
        }
        userUpdates.email = email.trim().toLowerCase();
      }

      const existingProfile = await strapi.db
        .query('api::user-profile.user-profile')
        .findOne({ where: { user: user.id } });

      if (profileUpdate) {
        if (!existingProfile) {
          return ctx.badRequest('프로필이 없습니다.');
        }

        if ('isOperator' in profileUpdate) {
          return ctx.badRequest('운영자 권한은 변경할 수 없습니다.');
        }

        if (existingProfile.schoolLevel === 'manager') {
          return ctx.badRequest('매니저 계정은 학교 정보를 수정할 수 없습니다.');
        }

        if (isOtherSchoolLevel(existingProfile.schoolLevel)) {
          return ctx.badRequest('기타학생 계정은 학교 정보를 수정할 수 없습니다.');
        }

        if (!isNeisSchoolLevel(profileUpdate.schoolLevel)) {
          return ctx.badRequest('초등학교, 중학교, 고등학교만 지원합니다.');
        }

        const profileError = validateStudentProfileFields(profileUpdate);
        if (profileError) {
          return ctx.badRequest(profileError);
        }
      }

      try {
        if (Object.keys(userUpdates).length > 0) {
          await strapi.plugin('users-permissions').service('user').edit(user.id, userUpdates);
        }

        if (profileUpdate && existingProfile) {
          const profileData: Record<string, unknown> = {
            schoolLevel: profileUpdate.schoolLevel as NeisSchoolLevel,
            atptOfcdcScCode: profileUpdate.atptOfcdcScCode as string,
            sdSchulCode: profileUpdate.sdSchulCode as string,
            schoolName: profileUpdate.schoolName as string,
            grade: profileUpdate.grade as string,
            className: profileUpdate.className as string,
          };

          if (
            hasSchoolProfileIdentityChanged(existingProfile, {
              atptOfcdcScCode: profileData.atptOfcdcScCode as string,
              sdSchulCode: profileData.sdSchulCode as string,
              grade: profileData.grade as string,
              className: profileData.className as string,
            })
          ) {
            profileData.subjects = await seedSubjectsForStudentProfile(
              toStudentSchoolProfileForSeed({
                schoolLevel: profileData.schoolLevel as string,
                atptOfcdcScCode: profileData.atptOfcdcScCode as string,
                sdSchulCode: profileData.sdSchulCode as string,
                grade: profileData.grade as string,
                className: profileData.className as string,
              })
            );
          }

          await updateProfileRecord(strapi, existingProfile, profileData);
        }

        return ctx.send(await buildAccountResponse(strapi, user));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '내정보 수정에 실패했습니다.';
        return ctx.badRequest(message);
      }
    },

    async searchManagers(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('로그인이 필요합니다.');
      }

      const { q = '' } = ctx.query as { q?: string };
      const query = String(q).trim();

      if (query.length < 2) {
        return ctx.badRequest('검색어는 2자 이상이어야 합니다.');
      }

      const managerProfiles = (await strapi.db
        .query('api::user-profile.user-profile')
        .findMany({
          where: {
            schoolLevel: 'manager',
            managerStatus: 'approved',
          },
          populate: ['user'],
        })) as Array<{
        user?: { id: number; username: string; email: string } | null;
      }>;

      const managerUserIds = managerProfiles
        .map((profile) => profile.user?.id)
        .filter((id): id is number => typeof id === 'number');

      if (managerUserIds.length === 0) {
        return ctx.send({ managers: [] });
      }

      const users = (await strapi.db.query('plugin::users-permissions.user').findMany({
        where: {
          id: { $in: managerUserIds },
          $or: [
            { username: { $containsi: query } },
            { email: { $containsi: query } },
          ],
        },
        limit: 20,
      })) as Array<{ id: number; username: string; email: string }>;

      return ctx.send({
        managers: users.map((manager) => formatManagerUser(manager)),
      });
    },

    async listMyManagers(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('로그인이 필요합니다.');
      }

      const assignments = await findActiveByStudent(strapi, user.id);

      return ctx.send({
        managers: assignments.map((assignment) => assignment.manager),
      });
    },

    async addMyManager(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('로그인이 필요합니다.');
      }

      const { managerUserId } = ctx.request.body as { managerUserId?: number };

      if (parseManagerUserId(managerUserId) === null) {
        return ctx.badRequest('유효한 매니저를 선택해 주세요.');
      }

      const subscriptionActive = await hasActiveSubscription(strapi, user.id);

      if (!subscriptionActive) {
        return ctx.badRequest(
          '구독 또는 무료 체험 기간 중에만 매니저를 추가할 수 있습니다.'
        );
      }

      try {
        await assignManagerRecord(strapi, user.id, managerUserId!);
        return ctx.send(await buildAccountResponse(strapi, user));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '매니저 추가에 실패했습니다.';
        return ctx.badRequest(message);
      }
    },

    async removeMyManager(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('로그인이 필요합니다.');
      }

      const managerUserId = parseManagerUserId(ctx.params.managerUserId);

      if (managerUserId === null) {
        return ctx.badRequest('유효한 매니저를 선택해 주세요.');
      }

      try {
        await removeManagerRecord(strapi, user.id, managerUserId);
        return ctx.send(await buildAccountResponse(strapi, user));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '매니저 해제에 실패했습니다.';
        return ctx.badRequest(message);
      }
    },

    async listStudents(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('로그인이 필요합니다.');
      }

      const isManager = await isApprovedManager(strapi, user.id);

      if (!isManager) {
        return ctx.forbidden('매니저만 조회할 수 있습니다.');
      }

      const assignments = await findActiveByManager(strapi, user.id);
      const studentUserIds = [
        ...new Set(assignments.map((assignment) => assignment.student.id)),
      ];

      if (studentUserIds.length === 0) {
        return ctx.send({ students: [] });
      }

      const profiles = (await strapi.db.query('api::user-profile.user-profile').findMany({
        where: { user: { id: { $in: studentUserIds } } },
        populate: ['user'],
        orderBy: { id: 'asc' },
      })) as Array<{
        schoolLevel: string;
        schoolName?: string | null;
        grade?: string | null;
        className?: string | null;
        user?: { id: number; username: string; email: string } | null;
      }>;

      const accessFlags = await Promise.all(
        studentUserIds.map(async (studentUserId) => ({
          studentUserId,
          isAccessAllowed: await hasActiveSubscription(strapi, studentUserId),
        }))
      );
      const accessByUserId = new Map(
        accessFlags.map((entry) => [entry.studentUserId, entry.isAccessAllowed])
      );

      return ctx.send({
        students: profiles
          .filter((profile) => profile.user)
          .map((profile) => ({
            userId: profile.user!.id,
            username: profile.user!.username,
            email: profile.user!.email,
            schoolLevel: profile.schoolLevel,
            schoolName: profile.schoolName ?? null,
            grade: profile.grade ?? null,
            className: profile.className ?? null,
            isAccessAllowed: accessByUserId.get(profile.user!.id) ?? false,
          })),
      });
    },

    async examCountdownContext(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('로그인이 필요합니다.');
      }

      const { studentUserId } = ctx.query as { studentUserId?: string };
      const result = await findStudentProfileForExamPrep(strapi, user.id, studentUserId, {
        missingProfile: '학교 프로필이 없습니다. 학교 정보를 등록해 주세요.',
        notStudent: '학생 계정만 시험기간 설정을 사용할 수 있습니다.',
      });

      if ('error' in result) {
        return result.status === 403
          ? ctx.forbidden(result.error)
          : ctx.badRequest(result.error);
      }

      try {
        const { scheduleEvents } = await fetchStudentScheduleBundle(result.profile);

        const examEvents = scheduleEvents
          .filter((event) => event.kind === 'exam')
          .map(({ date, title }) => ({ date, title }));

        const holidayEvents = scheduleEvents
          .filter((event) => event.kind === 'holiday')
          .map(({ date, title }) => ({ date, title }));

        const groupsWithSlots = assignExamRoundSlots(
          groupExamEvents(examEvents),
          holidayEvents
        );
        const neisExamRoundPreview = buildExamRoundPreview(groupsWithSlots);
        const examPrepSettings = formatExamPrepSettings(result.profile);
        const examPeriodSettings = resolveExamPeriodSettings(result.profile.examPeriodSettings);
        const neisExamSuggestions = buildNeisExamSuggestionsFromPreview(neisExamRoundPreview);
        const examRoundPreview = resolveEffectiveExamRoundPreview(
          examPeriodSettings,
          neisExamRoundPreview
        );

        return ctx.send({
          ...examPrepSettings,
          examEvents,
          holidayEvents,
          examRoundPreview,
          examPeriodSettings,
          neisExamSuggestions,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '시험 일정 조회에 실패했습니다.';
        return ctx.badRequest(message);
      }
    },

    async getExamPrepWeeklyPlans(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('로그인이 필요합니다.');
      }

      const { studentUserId } = ctx.query as { studentUserId?: string };
      const result = await findStudentProfileForExamPrep(strapi, user.id, studentUserId);

      if ('error' in result) {
        return result.status === 403
          ? ctx.forbidden(result.error)
          : ctx.badRequest(result.error);
      }

      try {
        return ctx.send(await buildExamPrepWeeklyPlansContext(result.profile));
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : '시험기간 주차별 공부계획을 불러오지 못했습니다.';
        return ctx.badRequest(message);
      }
    },

    async updateExamPrepWeeklyPlans(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('로그인이 필요합니다.');
      }

      const { examPrepWeeklyPlans, studentUserId } = ctx.request.body as {
        examPrepWeeklyPlans?: unknown;
        studentUserId?: number;
      };

      const result = await findStudentProfileForExamPrep(strapi, user.id, studentUserId);

      if ('error' in result) {
        return result.status === 403
          ? ctx.forbidden(result.error)
          : ctx.badRequest(result.error);
      }

      const subjects = resolveProfileSubjects(result.profile.subjects ?? null);
      const examPrepSettings = formatExamPrepSettings(result.profile);
      const validated = validateExamPrepWeeklyPlansInput(examPrepWeeklyPlans, {
        allowedSubjectIds: buildAllowedPlanSubjectIds(subjects),
        examPrepWeeksByRound: examPrepSettings.examPrepWeeksByRound,
      });

      if ('error' in validated) {
        return ctx.badRequest(validated.error);
      }

      try {
        await updateProfileRecord(strapi, result.profile, {
          examPrepWeeklyPlans: validated.plans,
        });

        return ctx.send({
          examPrepWeeklyPlans: validated.plans,
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : '시험기간 주차별 공부계획 저장에 실패했습니다.';
        return ctx.badRequest(message);
      }
    },

    async carryOverExamPrepWeeklyPlanItem(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('로그인이 필요합니다.');
      }

      const body = ctx.request.body as Record<string, unknown> & {
        studentUserId?: number;
      };
      const { studentUserId } = body;
      const ref = parseExamPrepWeeklyPlanItemRef(body);
      const toWeek = Number(body.toWeek);

      if (!ref || !Number.isInteger(toWeek) || toWeek < 1) {
        return ctx.badRequest('roundSlot, weekNumber, toWeek, subjectId, itemId가 필요합니다.');
      }

      const target = await resolveTargetUserId(strapi, user.id, studentUserId);
      if ('error' in target) {
        return ctx.forbidden(target.error);
      }

      const result = await findStudentProfileForExamPrep(strapi, user.id, studentUserId);

      if ('error' in result) {
        return result.status === 403
          ? ctx.forbidden(result.error)
          : ctx.badRequest(result.error);
      }

      const subjects = resolveProfileSubjects(result.profile.subjects ?? null);
      const examPrepSettings = formatExamPrepSettings(result.profile);
      const currentPlans = resolveExamPrepWeeklyPlans(result.profile.examPrepWeeklyPlans);
      const item = currentPlans[ref.roundSlot as keyof typeof currentPlans]?.weeks?.[
        String(ref.weekNumber)
      ]?.[ref.subjectId]?.find((entry) => entry.id === ref.itemId);

      if (!item?.scheduledTodoId) {
        return ctx.badRequest('배치된 공부 계획 항목만 이월할 수 있습니다.');
      }

      const carryResult = carryOverExamPrepWeeklyPlanItem(currentPlans, {
        roundSlot: ref.roundSlot as Parameters<typeof carryOverExamPrepWeeklyPlanItem>[1]['roundSlot'],
        weekNumber: ref.weekNumber,
        subjectId: ref.subjectId,
        itemId: ref.itemId,
        toWeek,
      });

      if ('error' in carryResult) {
        return ctx.badRequest(carryResult.error);
      }

      const validated = validateExamPrepWeeklyPlansInput(carryResult.plans, {
        allowedSubjectIds: buildAllowedPlanSubjectIds(subjects),
        examPrepWeeksByRound: examPrepSettings.examPrepWeeksByRound,
      });

      if ('error' in validated) {
        return ctx.badRequest(validated.error);
      }

      try {
        await updateProfileRecord(strapi, result.profile, {
          examPrepWeeklyPlans: validated.plans,
        });

        const deleteResult = await deleteOwnedStudyPlanTodoWithoutWeeklyPlanRevert(
          strapi,
          target.userId,
          item.scheduledTodoId
        );

        if (deleteResult.ok === false) {
          return ctx.badRequest(deleteResult.error);
        }

        return ctx.send({
          examPrepWeeklyPlans: validated.plans,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '공부 계획 이월에 실패했습니다.';
        return ctx.badRequest(message);
      }
    },

    async deleteExamPrepWeeklyPlanItem(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('로그인이 필요합니다.');
      }

      const body = ctx.request.body as Record<string, unknown> & {
        studentUserId?: number;
      };
      const { studentUserId } = body;
      const ref = parseExamPrepWeeklyPlanItemRef(body);

      if (!ref) {
        return ctx.badRequest('roundSlot, weekNumber, subjectId, itemId가 필요합니다.');
      }

      const target = await resolveTargetUserId(strapi, user.id, studentUserId);
      if ('error' in target) {
        return ctx.forbidden(target.error);
      }

      const result = await findStudentProfileForExamPrep(strapi, user.id, studentUserId);

      if ('error' in result) {
        return result.status === 403
          ? ctx.forbidden(result.error)
          : ctx.badRequest(result.error);
      }

      const subjects = resolveProfileSubjects(result.profile.subjects ?? null);
      const examPrepSettings = formatExamPrepSettings(result.profile);
      const currentPlans = resolveExamPrepWeeklyPlans(result.profile.examPrepWeeklyPlans);
      const deleteResult = deleteExamPrepWeeklyPlanItem(currentPlans, {
        roundSlot: ref.roundSlot as Parameters<typeof deleteExamPrepWeeklyPlanItem>[1]['roundSlot'],
        weekNumber: ref.weekNumber,
        subjectId: ref.subjectId,
        itemId: ref.itemId,
      });

      if ('error' in deleteResult) {
        return ctx.badRequest(deleteResult.error);
      }

      const validated = validateExamPrepWeeklyPlansInput(deleteResult.plans, {
        allowedSubjectIds: buildAllowedPlanSubjectIds(subjects),
        examPrepWeeksByRound: examPrepSettings.examPrepWeeksByRound,
      });

      if ('error' in validated) {
        return ctx.badRequest(validated.error);
      }

      try {
        await updateProfileRecord(strapi, result.profile, {
          examPrepWeeklyPlans: validated.plans,
        });

        if (deleteResult.scheduledTodoId) {
          const todoDeleteResult = await deleteOwnedStudyPlanTodoWithoutWeeklyPlanRevert(
            strapi,
            target.userId,
            deleteResult.scheduledTodoId
          );

          if (todoDeleteResult.ok === false) {
            return ctx.badRequest(todoDeleteResult.error);
          }
        }

        return ctx.send({
          examPrepWeeklyPlans: validated.plans,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '공부 계획 항목 삭제에 실패했습니다.';
        return ctx.badRequest(message);
      }
    },

    async getExamPrepWeeklyPlanTemplates(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('로그인이 필요합니다.');
      }

      const { studentUserId } = ctx.query as { studentUserId?: string };
      const result = await findStudentProfileForExamPrep(strapi, user.id, studentUserId);

      if ('error' in result) {
        return result.status === 403
          ? ctx.forbidden(result.error)
          : ctx.badRequest(result.error);
      }

      return ctx.send({
        examPrepWeeklyPlanTemplates: resolveExamPrepWeeklyPlanTemplates(
          result.profile.examPrepWeeklyPlanTemplates
        ),
      });
    },

    async createExamPrepWeeklyPlanTemplate(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('로그인이 필요합니다.');
      }

      const { name, weekCount, weeks, studentUserId } = ctx.request.body as {
        name?: unknown;
        weekCount?: unknown;
        weeks?: unknown;
        studentUserId?: number;
      };

      const result = await findStudentProfileForExamPrep(strapi, user.id, studentUserId);

      if ('error' in result) {
        return result.status === 403
          ? ctx.forbidden(result.error)
          : ctx.badRequest(result.error);
      }

      const validated = validateCreateExamPrepWeeklyPlanTemplateInput({
        name,
        weekCount,
        weeks,
      });

      if ('error' in validated) {
        return ctx.badRequest(validated.error);
      }

      const currentTemplates = resolveExamPrepWeeklyPlanTemplates(
        result.profile.examPrepWeeklyPlanTemplates
      );
      const appended = appendExamPrepWeeklyPlanTemplate(
        currentTemplates,
        validated.template
      );

      if ('error' in appended) {
        return ctx.badRequest(appended.error);
      }

      try {
        await updateProfileRecord(strapi, result.profile, {
          examPrepWeeklyPlanTemplates: appended.templates,
        });

        return ctx.send({
          examPrepWeeklyPlanTemplates: appended.templates,
          template: appended.template,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '템플릿 저장에 실패했습니다.';
        return ctx.badRequest(message);
      }
    },

    async deleteExamPrepWeeklyPlanTemplate(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('로그인이 필요합니다.');
      }

      const { templateId } = ctx.params as { templateId?: string };
      const { studentUserId } = ctx.query as { studentUserId?: string };
      const result = await findStudentProfileForExamPrep(strapi, user.id, studentUserId);

      if ('error' in result) {
        return result.status === 403
          ? ctx.forbidden(result.error)
          : ctx.badRequest(result.error);
      }

      const currentTemplates = resolveExamPrepWeeklyPlanTemplates(
        result.profile.examPrepWeeklyPlanTemplates
      );
      const removed = removeExamPrepWeeklyPlanTemplate(
        currentTemplates,
        templateId ?? ''
      );

      if ('error' in removed) {
        return ctx.badRequest(removed.error);
      }

      try {
        await updateProfileRecord(strapi, result.profile, {
          examPrepWeeklyPlanTemplates: removed.templates,
        });

        return ctx.send({
          examPrepWeeklyPlanTemplates: removed.templates,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '템플릿 삭제에 실패했습니다.';
        return ctx.badRequest(message);
      }
    },

    async getVacationWeeklyPlans(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('로그인이 필요합니다.');
      }

      const { studentUserId } = ctx.query as { studentUserId?: string };
      const result = await findStudentProfileForExamPrep(strapi, user.id, studentUserId, {
        notStudent: '학생 계정만 방학기간 주차별 공부계획을 사용할 수 있습니다.',
      });

      if ('error' in result) {
        return result.status === 403
          ? ctx.forbidden(result.error)
          : ctx.badRequest(result.error);
      }

      try {
        return ctx.send(await buildVacationWeeklyPlansContext(result.profile));
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : '방학기간 주차별 공부계획을 불러오지 못했습니다.';
        return ctx.badRequest(message);
      }
    },

    async updateVacationWeeklyPlans(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('로그인이 필요합니다.');
      }

      const { vacationWeeklyPlans, studentUserId } = ctx.request.body as {
        vacationWeeklyPlans?: unknown;
        studentUserId?: number;
      };

      const result = await findStudentProfileForExamPrep(strapi, user.id, studentUserId, {
        notStudent: '학생 계정만 방학기간 주차별 공부계획을 사용할 수 있습니다.',
      });

      if ('error' in result) {
        return result.status === 403
          ? ctx.forbidden(result.error)
          : ctx.badRequest(result.error);
      }

      const subjects = resolveProfileSubjects(result.profile.subjects ?? null);
      const { vacationPeriodPreview } = await buildVacationWeeklyPlansContext(result.profile);
      const validated = validateVacationWeeklyPlansInput(vacationWeeklyPlans, {
        allowedSubjectIds: buildAllowedPlanSubjectIds(subjects),
        vacationPeriodPreview,
      });

      if ('error' in validated) {
        return ctx.badRequest(validated.error);
      }

      try {
        await updateProfileRecord(strapi, result.profile, {
          vacationWeeklyPlans: validated.plans,
        });

        return ctx.send({
          vacationWeeklyPlans: validated.plans,
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : '방학기간 주차별 공부계획 저장에 실패했습니다.';
        return ctx.badRequest(message);
      }
    },

    async getVacationWeeklyPlanTemplates(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('로그인이 필요합니다.');
      }

      const { studentUserId } = ctx.query as { studentUserId?: string };
      const result = await findStudentProfileForExamPrep(strapi, user.id, studentUserId, {
        notStudent: '학생 계정만 방학기간 주차별 공부계획을 사용할 수 있습니다.',
      });

      if ('error' in result) {
        return result.status === 403
          ? ctx.forbidden(result.error)
          : ctx.badRequest(result.error);
      }

      return ctx.send({
        vacationWeeklyPlanTemplates: resolveVacationWeeklyPlanTemplates(
          result.profile.vacationWeeklyPlanTemplates
        ),
      });
    },

    async createVacationWeeklyPlanTemplate(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('로그인이 필요합니다.');
      }

      const { name, weekCount, weeks, studentUserId } = ctx.request.body as {
        name?: unknown;
        weekCount?: unknown;
        weeks?: unknown;
        studentUserId?: number;
      };

      const result = await findStudentProfileForExamPrep(strapi, user.id, studentUserId, {
        notStudent: '학생 계정만 방학기간 주차별 공부계획을 사용할 수 있습니다.',
      });

      if ('error' in result) {
        return result.status === 403
          ? ctx.forbidden(result.error)
          : ctx.badRequest(result.error);
      }

      const validated = validateCreateVacationWeeklyPlanTemplateInput({
        name,
        weekCount,
        weeks,
      });

      if ('error' in validated) {
        return ctx.badRequest(validated.error);
      }

      const currentTemplates = resolveVacationWeeklyPlanTemplates(
        result.profile.vacationWeeklyPlanTemplates
      );
      const appended = appendVacationWeeklyPlanTemplate(
        currentTemplates,
        validated.template
      );

      if ('error' in appended) {
        return ctx.badRequest(appended.error);
      }

      try {
        await updateProfileRecord(strapi, result.profile, {
          vacationWeeklyPlanTemplates: appended.templates,
        });

        return ctx.send({
          vacationWeeklyPlanTemplates: appended.templates,
          template: appended.template,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '템플릿 저장에 실패했습니다.';
        return ctx.badRequest(message);
      }
    },

    async deleteVacationWeeklyPlanTemplate(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('로그인이 필요합니다.');
      }

      const { templateId } = ctx.params as { templateId?: string };
      const { studentUserId } = ctx.query as { studentUserId?: string };
      const result = await findStudentProfileForExamPrep(strapi, user.id, studentUserId, {
        notStudent: '학생 계정만 방학기간 주차별 공부계획을 사용할 수 있습니다.',
      });

      if ('error' in result) {
        return result.status === 403
          ? ctx.forbidden(result.error)
          : ctx.badRequest(result.error);
      }

      const currentTemplates = resolveVacationWeeklyPlanTemplates(
        result.profile.vacationWeeklyPlanTemplates
      );
      const removed = removeVacationWeeklyPlanTemplate(
        currentTemplates,
        templateId ?? ''
      );

      if ('error' in removed) {
        return ctx.badRequest(removed.error);
      }

      try {
        await updateProfileRecord(strapi, result.profile, {
          vacationWeeklyPlanTemplates: removed.templates,
        });

        return ctx.send({
          vacationWeeklyPlanTemplates: removed.templates,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '템플릿 삭제에 실패했습니다.';
        return ctx.badRequest(message);
      }
    },

    async getRegularWeeklyPlans(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('로그인이 필요합니다.');
      }

      const { studentUserId } = ctx.query as { studentUserId?: string };
      const result = await findStudentProfileForExamPrep(strapi, user.id, studentUserId, {
        notStudent: '학생 계정만 평소기간 주차별 공부계획을 사용할 수 있습니다.',
      });

      if ('error' in result) {
        return result.status === 403
          ? ctx.forbidden(result.error)
          : ctx.badRequest(result.error);
      }

      try {
        return ctx.send(await buildRegularWeeklyPlansContext(result.profile));
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : '평소기간 주차별 공부계획을 불러오지 못했습니다.';
        return ctx.badRequest(message);
      }
    },

    async updateRegularWeeklyPlans(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('로그인이 필요합니다.');
      }

      const { regularWeeklyPlans, studentUserId } = ctx.request.body as {
        regularWeeklyPlans?: unknown;
        studentUserId?: number;
      };

      const result = await findStudentProfileForExamPrep(strapi, user.id, studentUserId, {
        notStudent: '학생 계정만 평소기간 주차별 공부계획을 사용할 수 있습니다.',
      });

      if ('error' in result) {
        return result.status === 403
          ? ctx.forbidden(result.error)
          : ctx.badRequest(result.error);
      }

      const subjects = resolveProfileSubjects(result.profile.subjects ?? null);
      const { regularPeriodPreview } = await buildRegularWeeklyPlansContext(result.profile);
      const validated = validateRegularWeeklyPlansInput(regularWeeklyPlans, {
        allowedSubjectIds: buildAllowedPlanSubjectIds(subjects),
        regularPeriodPreview,
      });

      if ('error' in validated) {
        return ctx.badRequest(validated.error);
      }

      try {
        await updateProfileRecord(strapi, result.profile, {
          regularWeeklyPlans: validated.plans,
        });

        return ctx.send({
          regularWeeklyPlans: validated.plans,
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : '평소기간 주차별 공부계획 저장에 실패했습니다.';
        return ctx.badRequest(message);
      }
    },

    async getRegularWeeklyPlanTemplates(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('로그인이 필요합니다.');
      }

      const { studentUserId } = ctx.query as { studentUserId?: string };
      const result = await findStudentProfileForExamPrep(strapi, user.id, studentUserId, {
        notStudent: '학생 계정만 평소기간 주차별 공부계획을 사용할 수 있습니다.',
      });

      if ('error' in result) {
        return result.status === 403
          ? ctx.forbidden(result.error)
          : ctx.badRequest(result.error);
      }

      return ctx.send({
        regularWeeklyPlanTemplates: resolveRegularWeeklyPlanTemplates(
          result.profile.regularWeeklyPlanTemplates
        ),
      });
    },

    async createRegularWeeklyPlanTemplate(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('로그인이 필요합니다.');
      }

      const { name, weekCount, weeks, studentUserId } = ctx.request.body as {
        name?: unknown;
        weekCount?: unknown;
        weeks?: unknown;
        studentUserId?: number;
      };

      const result = await findStudentProfileForExamPrep(strapi, user.id, studentUserId, {
        notStudent: '학생 계정만 평소기간 주차별 공부계획을 사용할 수 있습니다.',
      });

      if ('error' in result) {
        return result.status === 403
          ? ctx.forbidden(result.error)
          : ctx.badRequest(result.error);
      }

      const validated = validateCreateRegularWeeklyPlanTemplateInput({
        name,
        weekCount,
        weeks,
      });

      if ('error' in validated) {
        return ctx.badRequest(validated.error);
      }

      const currentTemplates = resolveRegularWeeklyPlanTemplates(
        result.profile.regularWeeklyPlanTemplates
      );
      const appended = appendRegularWeeklyPlanTemplate(
        currentTemplates,
        validated.template
      );

      if ('error' in appended) {
        return ctx.badRequest(appended.error);
      }

      try {
        await updateProfileRecord(strapi, result.profile, {
          regularWeeklyPlanTemplates: appended.templates,
        });

        return ctx.send({
          regularWeeklyPlanTemplates: appended.templates,
          template: appended.template,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '템플릿 저장에 실패했습니다.';
        return ctx.badRequest(message);
      }
    },

    async deleteRegularWeeklyPlanTemplate(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('로그인이 필요합니다.');
      }

      const { templateId } = ctx.params as { templateId?: string };
      const { studentUserId } = ctx.query as { studentUserId?: string };
      const result = await findStudentProfileForExamPrep(strapi, user.id, studentUserId, {
        notStudent: '학생 계정만 평소기간 주차별 공부계획을 사용할 수 있습니다.',
      });

      if ('error' in result) {
        return result.status === 403
          ? ctx.forbidden(result.error)
          : ctx.badRequest(result.error);
      }

      const currentTemplates = resolveRegularWeeklyPlanTemplates(
        result.profile.regularWeeklyPlanTemplates
      );
      const removed = removeRegularWeeklyPlanTemplate(
        currentTemplates,
        templateId ?? ''
      );

      if ('error' in removed) {
        return ctx.badRequest(removed.error);
      }

      try {
        await updateProfileRecord(strapi, result.profile, {
          regularWeeklyPlanTemplates: removed.templates,
        });

        return ctx.send({
          regularWeeklyPlanTemplates: removed.templates,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '템플릿 삭제에 실패했습니다.';
        return ctx.badRequest(message);
      }
    },

    async getVacationPeriodSettings(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('로그인이 필요합니다.');
      }

      const { studentUserId } = ctx.query as { studentUserId?: string };
      const result = await findStudentProfileForExamPrep(strapi, user.id, studentUserId, {
        notStudent: '학생 계정만 방학기간 설정을 사용할 수 있습니다.',
      });

      if ('error' in result) {
        return result.status === 403
          ? ctx.forbidden(result.error)
          : ctx.badRequest(result.error);
      }

      try {
        return ctx.send(await buildVacationPeriodSettingsContext(result.profile));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '방학기간 설정을 불러오지 못했습니다.';
        return ctx.badRequest(message);
      }
    },

    async updateVacationPeriodSettings(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('로그인이 필요합니다.');
      }

      const { vacationPeriodSettings, studentUserId } = ctx.request.body as {
        vacationPeriodSettings?: unknown;
        studentUserId?: number;
      };

      const result = await findStudentProfileForExamPrep(strapi, user.id, studentUserId, {
        notStudent: '학생 계정만 방학기간 설정을 사용할 수 있습니다.',
      });

      if ('error' in result) {
        return result.status === 403
          ? ctx.forbidden(result.error)
          : ctx.badRequest(result.error);
      }

      const validated = validateVacationPeriodSettingsInput(vacationPeriodSettings);

      if ('error' in validated) {
        return ctx.badRequest(validated.error);
      }

      try {
        await updateProfileRecord(strapi, result.profile, {
          vacationPeriodSettings: validated.settings,
        });

        return ctx.send({
          vacationPeriodSettings: validated.settings,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '방학기간 설정 저장에 실패했습니다.';
        return ctx.badRequest(message);
      }
    },

    async updateExamPrepSettings(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('로그인이 필요합니다.');
      }

      const { examPrepWeeksByRound, examPeriodSettings, studentUserId } = ctx.request.body as {
        examPrepWeeksByRound?: unknown;
        examPeriodSettings?: unknown;
        studentUserId?: number;
      };

      const settings = validateExamPrepWeeksByRoundInput(examPrepWeeksByRound);

      if (settings === null) {
        return ctx.badRequest(
          `각 회차의 시험 준비 기간은 ${MIN_EXAM_PREP_WEEKS}~${MAX_EXAM_PREP_WEEKS}주 사이로 설정해 주세요.`
        );
      }

      let validatedPeriodSettings: ReturnType<typeof resolveExamPeriodSettings> | undefined;

      if (examPeriodSettings !== undefined) {
        const validated = validateExamPeriodSettingsInput(examPeriodSettings);

        if ('error' in validated) {
          return ctx.badRequest(validated.error);
        }

        validatedPeriodSettings = validated.settings;
      }

      const target = await resolveTargetUserId(strapi, user.id, studentUserId);

      if ('error' in target) {
        return ctx.forbidden(target.error);
      }

      const existingProfile = await strapi.db
        .query('api::user-profile.user-profile')
        .findOne({ where: { user: target.userId } });

      if (!existingProfile) {
        return ctx.badRequest('프로필이 없습니다.');
      }

      if (!isNeisSchoolLevel(existingProfile.schoolLevel)) {
        return ctx.badRequest('학생 계정만 시험기간을 설정할 수 있습니다.');
      }

      try {
        await updateProfileRecord(strapi, existingProfile, {
          examPrepWeeksBefore: settings.defaultWeeks,
          examPrepWeeksByRound: settings,
          ...(validatedPeriodSettings !== undefined
            ? { examPeriodSettings: validatedPeriodSettings }
            : {}),
        });

        return ctx.send({
          examPrepWeeksBefore: settings.defaultWeeks,
          examPrepWeeksByRound: settings,
          examPeriodSettings:
            validatedPeriodSettings ??
            resolveExamPeriodSettings(existingProfile.examPeriodSettings),
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '시험기간 설정 저장에 실패했습니다.';
        return ctx.badRequest(message);
      }
    },

    async getSubjects(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('로그인이 필요합니다.');
      }

      const owner = await resolveOwnerFromContext(strapi, ctx);

      if ('error' in owner) {
        return owner.status === 401
          ? ctx.unauthorized(owner.error)
          : ctx.forbidden(owner.error);
      }

      const profile = await strapi.db.query('api::user-profile.user-profile').findOne({
        where: { user: owner.userId },
      });

      if (!profile) {
        return ctx.badRequest('프로필이 없습니다.');
      }

      if (!isAnyStudentSchoolLevel(profile.schoolLevel)) {
        return ctx.forbidden('학생 계정만 과목 설정을 사용할 수 있습니다.');
      }

      return ctx.send({
        subjects: resolveProfileSubjects(profile.subjects ?? null),
      });
    },

    async updateSubjects(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('로그인이 필요합니다.');
      }

      const result = await findStudentProfileForSubjects(strapi, user.id);

      if ('error' in result) {
        return result.status === 403
          ? ctx.forbidden(result.error)
          : ctx.badRequest(result.error);
      }

      const { subjects: rawSubjects } = ctx.request.body as { subjects?: unknown };
      const validated = validateAndNormalizeUserSubjects(rawSubjects);

      if ('error' in validated) {
        return ctx.badRequest(validated.error);
      }

      try {
        await updateProfileRecord(strapi, result.profile, {
          subjects: validated.subjects,
        });

        return ctx.send({ subjects: validated.subjects });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '과목 설정 저장에 실패했습니다.';
        return ctx.badRequest(message);
      }
    },

    async timetable(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('로그인이 필요합니다.');
      }

      const { start = '', end = '', studentUserId, refresh } = ctx.query as {
        start?: string;
        end?: string;
        studentUserId?: string;
        refresh?: string;
      };

      if (!start || !end) {
        return ctx.badRequest('start, end는 필수입니다. (YYYY-MM-DD)');
      }

      const target = await resolveTargetUserId(strapi, user.id, studentUserId);

      if ('error' in target) {
        return ctx.forbidden(target.error);
      }

      const profile = await strapi.db.query('api::user-profile.user-profile').findOne({
        where: { user: target.userId },
      });

      if (!profile) {
        return ctx.badRequest('학교 프로필이 없습니다. 학교 정보를 등록해 주세요.');
      }

      if (isOtherSchoolLevel(profile.schoolLevel)) {
        return ctx.send(buildOtherStudentTimetableResponse(profile));
      }

      if (!isNeisSchoolLevel(profile.schoolLevel)) {
        return ctx.badRequest('초등학교, 중학교, 고등학교 시간표만 지원합니다.');
      }

      try {
        const { fromDate, toDate } = isoDateRangeToYmd(String(start), String(end));
        const shouldRefresh = refresh === 'true' || refresh === '1';
        const { entries, scheduleEvents } = await getSchoolTimetableBundle(
          {
            schoolLevel: profile.schoolLevel,
            atptOfcdcScCode: profile.atptOfcdcScCode,
            sdSchulCode: profile.sdSchulCode,
            grade: profile.grade,
            className: profile.className,
            fromDate,
            toDate,
          },
          { refresh: shouldRefresh }
        );

        return ctx.send({
          profile: {
            schoolName: profile.schoolName,
            grade: profile.grade,
            className: profile.className,
            schoolLevel: profile.schoolLevel,
          },
          entries,
          scheduleEvents,
          subjects: resolveProfileSubjects(profile.subjects ?? null),
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '시간표 조회에 실패했습니다.';
        return ctx.badRequest(message);
      }
    },

    async updateNotificationsEnabled(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('로그인이 필요합니다.');
      }

      const { enabled } = ctx.request.body as { enabled?: unknown };

      if (typeof enabled !== 'boolean') {
        return ctx.badRequest('enabled(boolean)는 필수입니다.');
      }

      const profile = await strapi.db.query('api::user-profile.user-profile').findOne({
        where: { user: user.id },
      });

      if (!profile) {
        return ctx.notFound('프로필을 찾을 수 없습니다.');
      }

      await strapi.db.query('api::user-profile.user-profile').update({
        where: { id: profile.id },
        data: { notificationsEnabled: enabled },
      });

      return ctx.send({ notificationsEnabled: enabled });
    },
  })
);
