import { describe, expect, it } from 'vitest';
import { composeStudyPlanTitle } from './study-plan-title-builder';
import { tryAddSubjectTag } from './subject-tags';
import { findUserSubject } from './user-subject';

describe('subject tags flow', () => {
  const profileSubjects = [
    {
      id: 'neis-korean',
      label: '공통국어1',
      source: 'neis' as const,
      textbooks: ['교과서', '참고서', '프린트'],
      studyMethods: ['단권화정리', '문제풀기', '개념공부'],
    },
    {
      id: 'neis-math',
      label: '공통수학1',
      source: 'neis' as const,
    },
  ];

  it('findUserSubject returns textbooks and studyMethods for configured subject', () => {
    const subject = findUserSubject('neis-korean', profileSubjects);

    expect(subject?.textbooks).toEqual(['교과서', '참고서', '프린트']);
    expect(subject?.studyMethods).toEqual(['단권화정리', '문제풀기', '개념공부']);
  });

  it('findUserSubject returns empty tags for subject without presets', () => {
    const subject = findUserSubject('neis-math', profileSubjects);

    expect(subject?.textbooks).toBeUndefined();
    expect(subject?.studyMethods).toBeUndefined();
  });

  it('composeStudyPlanTitle builds title from chip selections', () => {
    expect(
      composeStudyPlanTitle({
        selectedTextbook: '교과서',
        selectedStudyMethod: '단권화정리',
        rangeSuffix: '2과 - 3과',
      })
    ).toBe('교과서 단권화정리 2과 - 3과');
  });

  it('tryAddSubjectTag prevents duplicate tags', () => {
    const tags = ['교과서'];

    expect(tryAddSubjectTag(tags, '교과서')).toEqual({
      ok: false,
      message: '이미 추가된 태그입니다.',
    });
    expect(tryAddSubjectTag(tags, ' RPM ')).toEqual({ ok: true, tag: 'RPM' });
  });
});
