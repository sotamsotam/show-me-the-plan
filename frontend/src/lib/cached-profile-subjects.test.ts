import { describe, expect, it } from 'vitest';
import {
  invalidateCachedProfileSubjects,
  readCachedProfileSubjects,
  writeCachedProfileSubjects,
} from '@/lib/cached-profile-subjects';

describe('cached-profile-subjects', () => {
  it('caches subjects per student user id', () => {
    const subjects = [{ id: 'neis-math1', label: '수학Ⅰ', source: 'neis' as const }];

    writeCachedProfileSubjects(42, subjects);
    expect(readCachedProfileSubjects(42)).toEqual(subjects);
    expect(readCachedProfileSubjects(null)).toBeUndefined();
  });

  it('invalidates cached subjects for a student', () => {
    writeCachedProfileSubjects(7, []);
    invalidateCachedProfileSubjects(7);
    expect(readCachedProfileSubjects(7)).toBeUndefined();
  });
});
