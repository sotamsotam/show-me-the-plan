import {
  writeCachedProfileSubjects,
} from '@/lib/cached-profile-subjects';
import { buildStudentCachePrefix } from '@/lib/range-query-cache';
import type { ProfileSubjectsInput } from '@/lib/user-subject';

type ProfileSubjectsListener = () => void;

const listeners = new Set<ProfileSubjectsListener>();

export function subscribeProfileSubjects(listener: ProfileSubjectsListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyProfileSubjectsListeners() {
  listeners.forEach((listener) => listener());
}

export function publishProfileSubjects(
  studentUserId: number | null,
  subjects: ProfileSubjectsInput
): void {
  writeCachedProfileSubjects(studentUserId, subjects);
  notifyProfileSubjectsListeners();
}

export function getProfileSubjectsCacheKey(studentUserId: number | null): string {
  return buildStudentCachePrefix(studentUserId);
}
