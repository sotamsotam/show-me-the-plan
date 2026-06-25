/** 과목 색상 선택 팔레트 — frontend subject-color-presets.ts 와 동기화 */
export const SUBJECT_COLOR_PRESETS = [
  '#D93025',
  '#1A73E8',
  '#9334E6',
  '#F9AB00',
  '#34A853',
  '#E91E8C',
  '#00838F',
  '#1976D2',
  '#E8710A',
  '#EF6C00',
  '#5F6368',
  '#B71C1C',
  '#0D47A1',
  '#4A148C',
  '#1B5E20',
  '#880E4F',
  '#00695C',
  '#4527A0',
  '#C62828',
  '#283593',
  '#2E7D32',
  '#6A1B9A',
  '#AD1457',
  '#BF360C',
  '#558B2F',
  '#827717',
  '#37474F',
  '#4E342E',
  '#1565C0',
  '#7B1FA2',
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
