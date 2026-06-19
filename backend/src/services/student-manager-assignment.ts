import type { Core } from '@strapi/strapi';
import { isApprovedManager } from './manager-access';
import { isAnyStudentSchoolLevel } from './school-level';

const ASSIGNMENT_UID = 'api::student-manager-assignment.student-manager-assignment' as const;
const PROFILE_UID = 'api::user-profile.user-profile' as const;

export type AssignmentStatus = 'active' | 'removed';

export type UserSummary = {
  id: number;
  username: string;
  email: string;
};

export type StudentManagerAssignmentRecord = {
  id: number;
  status: AssignmentStatus;
  assignedAt: string | null;
  student: UserSummary;
  manager: UserSummary;
};

type AssignmentRow = {
  id: number;
  documentId?: string;
  status: AssignmentStatus;
  assignedAt?: string | null;
  student?: UserSummary | null;
  manager?: UserSummary | null;
};

type StudentProfileRow = {
  id: number;
  documentId?: string;
  schoolLevel: string;
};

function formatUserSummary(
  user: { id: number; username: string; email: string } | null | undefined
): UserSummary | null {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    email: user.email,
  };
}

function serializeAssignment(row: AssignmentRow): StudentManagerAssignmentRecord | null {
  const student = formatUserSummary(row.student);
  const manager = formatUserSummary(row.manager);

  if (!student || !manager) {
    return null;
  }

  return {
    id: row.id,
    status: row.status,
    assignedAt: row.assignedAt ?? null,
    student,
    manager,
  };
}

async function findAssignmentRow(
  strapi: Core.Strapi,
  studentUserId: number,
  managerUserId: number,
  status?: AssignmentStatus
): Promise<AssignmentRow | null> {
  const where: Record<string, unknown> = {
    student: { id: studentUserId },
    manager: { id: managerUserId },
  };

  if (status) {
    where.status = status;
  }

  return (await strapi.db.query(ASSIGNMENT_UID).findOne({
    where,
    populate: ['student', 'manager'],
  })) as AssignmentRow | null;
}

async function assertStudentCanAssignManager(
  strapi: Core.Strapi,
  studentUserId: number,
  managerUserId: number
): Promise<StudentProfileRow> {
  const profile = (await strapi.db.query(PROFILE_UID).findOne({
    where: { user: studentUserId },
  })) as StudentProfileRow | null;

  if (!profile) {
    throw new Error('프로필이 없습니다.');
  }

  if (profile.schoolLevel === 'manager') {
    throw new Error('매니저 계정은 매니저를 설정할 수 없습니다.');
  }

  if (!isAnyStudentSchoolLevel(profile.schoolLevel)) {
    throw new Error('학생 계정만 매니저를 설정할 수 있습니다.');
  }

  if (managerUserId === studentUserId) {
    throw new Error('본인을 매니저로 설정할 수 없습니다.');
  }

  const isManager = await isApprovedManager(strapi, managerUserId);

  if (!isManager) {
    throw new Error('승인된 매니저만 설정할 수 있습니다.');
  }

  return profile;
}

async function createAssignment(
  strapi: Core.Strapi,
  studentUserId: number,
  managerUserId: number
): Promise<StudentManagerAssignmentRecord> {
  const now = new Date().toISOString();

  const created = (await strapi.db.query(ASSIGNMENT_UID).create({
    data: {
      student: studentUserId,
      manager: managerUserId,
      status: 'active',
      assignedAt: now,
    },
    populate: ['student', 'manager'],
  })) as AssignmentRow;

  const serialized = serializeAssignment(created);

  if (!serialized) {
    throw new Error('매니저 할당을 저장하지 못했습니다.');
  }

  return serialized;
}

async function reactivateAssignment(
  strapi: Core.Strapi,
  row: AssignmentRow
): Promise<StudentManagerAssignmentRecord> {
  const now = new Date().toISOString();
  const updateData = {
    status: 'active' as const,
    assignedAt: now,
  };

  if (row.documentId) {
    await strapi.documents(ASSIGNMENT_UID).update({
      documentId: row.documentId,
      data: updateData,
    });
  } else {
    await strapi.db.query(ASSIGNMENT_UID).update({
      where: { id: row.id },
      data: updateData,
    });
  }

  const updated = await findAssignmentRow(
    strapi,
    row.student!.id,
    row.manager!.id,
    'active'
  );

  const serialized = updated ? serializeAssignment(updated) : null;

  if (!serialized) {
    throw new Error('매니저 할당을 복구하지 못했습니다.');
  }

  return serialized;
}

export async function findActiveByStudent(
  strapi: Core.Strapi,
  studentUserId: number
): Promise<StudentManagerAssignmentRecord[]> {
  const rows = (await strapi.db.query(ASSIGNMENT_UID).findMany({
    where: {
      student: { id: studentUserId },
      status: 'active',
    },
    populate: ['manager', 'student'],
    orderBy: { assignedAt: 'asc' },
  })) as AssignmentRow[];

  return rows
    .map((row) => serializeAssignment(row))
    .filter((row): row is StudentManagerAssignmentRecord => row !== null);
}

export async function findActiveByManager(
  strapi: Core.Strapi,
  managerUserId: number
): Promise<StudentManagerAssignmentRecord[]> {
  const rows = (await strapi.db.query(ASSIGNMENT_UID).findMany({
    where: {
      manager: { id: managerUserId },
      status: 'active',
    },
    populate: ['student', 'manager'],
    orderBy: { assignedAt: 'asc' },
  })) as AssignmentRow[];

  return rows
    .map((row) => serializeAssignment(row))
    .filter((row): row is StudentManagerAssignmentRecord => row !== null);
}

export async function isActiveAssignment(
  strapi: Core.Strapi,
  studentUserId: number,
  managerUserId: number
): Promise<boolean> {
  const row = await findAssignmentRow(strapi, studentUserId, managerUserId, 'active');
  return Boolean(row);
}

export async function assignManager(
  strapi: Core.Strapi,
  studentUserId: number,
  managerUserId: number
): Promise<StudentManagerAssignmentRecord> {
  await assertStudentCanAssignManager(strapi, studentUserId, managerUserId);

  const active = await findAssignmentRow(strapi, studentUserId, managerUserId, 'active');

  if (active) {
    throw new Error('이미 지정된 매니저입니다.');
  }

  const removed = await findAssignmentRow(strapi, studentUserId, managerUserId, 'removed');

  if (removed) {
    return reactivateAssignment(strapi, removed);
  }

  return createAssignment(strapi, studentUserId, managerUserId);
}

export async function removeManager(
  strapi: Core.Strapi,
  studentUserId: number,
  managerUserId: number
): Promise<void> {
  const active = await findAssignmentRow(strapi, studentUserId, managerUserId, 'active');

  if (!active) {
    throw new Error('지정된 매니저가 아닙니다.');
  }

  if (active.documentId) {
    await strapi.documents(ASSIGNMENT_UID).update({
      documentId: active.documentId,
      data: { status: 'removed' },
    });
  } else {
    await strapi.db.query(ASSIGNMENT_UID).update({
      where: { id: active.id },
      data: { status: 'removed' },
    });
  }
}
