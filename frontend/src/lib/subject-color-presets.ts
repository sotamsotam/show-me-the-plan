/** 과목 색상 선택 팔레트 — 6×5 격자 (30색). 빨→주→노→초→파→남→보 순 정렬. */
export const SUBJECT_COLOR_PRESETS = [
  // 빨
  '#D93025',
  '#C62828',
  '#B71C1C',
  '#E91E8C',
  '#AD1457',
  '#880E4F',
  // 주·노
  '#E8710A',
  '#EF6C00',
  '#BF360C',
  '#F9AB00',
  '#827717',
  '#34A853',
  // 초
  '#558B2F',
  '#2E7D32',
  '#1B5E20',
  '#00838F',
  '#00695C',
  '#1565C0',
  // 파·남
  '#1976D2',
  '#1A73E8',
  '#0D47A1',
  '#283593',
  '#4527A0',
  '#9334E6',
  // 보·무채
  '#7B1FA2',
  '#6A1B9A',
  '#4A148C',
  '#5F6368',
  '#37474F',
  '#4E342E',
] as const;

export type SubjectColorPreset = (typeof SUBJECT_COLOR_PRESETS)[number];

const PRESET_SET = new Set<string>(
  SUBJECT_COLOR_PRESETS.map((color) => color.toUpperCase())
);

export function normalizeSubjectColor(value: string): string {
  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const hex = trimmed.slice(1);
    return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`.toUpperCase();
  }

  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  return trimmed.toUpperCase();
}

export function isAllowedSubjectColor(value: string): boolean {
  return PRESET_SET.has(normalizeSubjectColor(value));
}
