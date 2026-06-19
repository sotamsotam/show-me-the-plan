import { describe, expect, it } from 'vitest';
import {
  composeStudyPlanTitle,
  createEmptyStudyPlanTitleParts,
  toggleStudyPlanTitleSelection,
} from './study-plan-title-builder';

describe('study-plan-title-builder', () => {
  it('composeStudyPlanTitle joins selected parts with spaces', () => {
    expect(
      composeStudyPlanTitle({
        selectedTextbook: '쎈 수학',
        selectedStudyMethod: '유형',
        rangeSuffix: '1과 - 2과',
      })
    ).toBe('쎈 수학 유형 1과 - 2과');
  });

  it('composeStudyPlanTitle skips empty parts', () => {
    expect(
      composeStudyPlanTitle({
        ...createEmptyStudyPlanTitleParts(),
        selectedTextbook: 'RPM',
      })
    ).toBe('RPM');
  });

  it('toggleStudyPlanTitleSelection deselects the same value', () => {
    expect(toggleStudyPlanTitleSelection('개념', '개념')).toBeNull();
    expect(toggleStudyPlanTitleSelection(null, '개념')).toBe('개념');
  });
});
