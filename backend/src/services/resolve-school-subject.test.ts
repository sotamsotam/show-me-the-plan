import { describe, expect, it } from 'vitest';
import { resolveSchoolSubject } from './resolve-school-subject';

describe('resolveSchoolSubject', () => {
  it('maps common NEIS subject names to legacy categories', () => {
    expect(resolveSchoolSubject('수학Ⅰ')).toBe('math');
    expect(resolveSchoolSubject('미적분')).toBe('math');
    expect(resolveSchoolSubject('영어')).toBe('english');
    expect(resolveSchoolSubject('통합과학')).toBe('science');
    expect(resolveSchoolSubject('통합사회')).toBe('social');
    expect(resolveSchoolSubject('한국사')).toBe('history');
    expect(resolveSchoolSubject('윤리와 사상')).toBe('ethics');
    expect(resolveSchoolSubject('기술·가정')).toBe('tech_home');
    expect(resolveSchoolSubject('정보')).toBe('info');
    expect(resolveSchoolSubject('한문')).toBe('chinese');
    expect(resolveSchoolSubject('국어')).toBe('korean');
  });

  it('ignores whitespace when matching', () => {
    expect(resolveSchoolSubject('  수학 Ⅰ ')).toBe('math');
  });

  it('returns other for unrecognized subjects', () => {
    expect(resolveSchoolSubject('논술')).toBe('other');
    expect(resolveSchoolSubject('')).toBe('other');
  });
});
