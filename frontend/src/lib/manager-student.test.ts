import { describe, expect, it } from 'vitest';
import { formatManagedStudentLabel } from './manager-student';

describe('formatManagedStudentLabel', () => {
  it('uses school level label for other students without school info', () => {
    expect(
      formatManagedStudentLabel({
        userId: 1,
        username: '재수생A',
        email: 'a@example.com',
        schoolLevel: 'other',
        schoolName: null,
        grade: null,
        className: null,
      })
    ).toBe('기타학생 재수생A');
  });

  it('prefers school name when all school fields exist', () => {
    expect(
      formatManagedStudentLabel({
        userId: 2,
        username: '학생B',
        email: 'b@example.com',
        schoolLevel: 'high',
        schoolName: '테스트고',
        grade: '2',
        className: '3',
      })
    ).toBe('테스트고 2학년 3반 학생B');
  });
});
