import { buildStudentCachePrefix } from '@/lib/range-query-cache';
import type { ProfileSubjectsInput } from '@/lib/user-subject';

const subjectsCache = new Map<string, ProfileSubjectsInput>();

export function readCachedProfileSubjects(studentUserId: number | null): ProfileSubjectsInput | undefined {
  const key = buildStudentCachePrefix(studentUserId);
  return subjectsCache.get(key);
}

export function writeCachedProfileSubjects(
  studentUserId: number | null,
  subjects: ProfileSubjectsInput
): void {
  const key = buildStudentCachePrefix(studentUserId);
  subjectsCache.set(key, subjects);
}

export function invalidateCachedProfileSubjects(studentUserId: number | null): void {
  const key = buildStudentCachePrefix(studentUserId);
  subjectsCache.delete(key);
}
