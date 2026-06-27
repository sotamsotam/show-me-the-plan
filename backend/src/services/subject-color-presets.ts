/** 과목 색상 선택 팔레트 — frontend subject-color-presets.ts 와 동기화 */
export const SUBJECT_COLOR_PRESETS = [
  '#D93025',
  '#C62828',
  '#B71C1C',
  '#E91E8C',
  '#AD1457',
  '#880E4F',
  '#E8710A',
  '#EF6C00',
  '#BF360C',
  '#F9AB00',
  '#827717',
  '#34A853',
  '#558B2F',
  '#2E7D32',
  '#1B5E20',
  '#00838F',
  '#00695C',
  '#1565C0',
  '#1976D2',
  '#1A73E8',
  '#0D47A1',
  '#283593',
  '#4527A0',
  '#9334E6',
  '#7B1FA2',
  '#6A1B9A',
  '#4A148C',
  '#5F6368',
  '#37474F',
  '#4E342E',
] as const;

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
