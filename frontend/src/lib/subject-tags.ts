import { MAX_SUBJECT_TAG_LENGTH, MAX_SUBJECT_TAGS } from '@/lib/user-subject';

export function normalizeSubjectTag(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function hasSubjectTag(tags: string[], value: string): boolean {
  const key = normalizeSubjectTag(value).toLowerCase();
  if (!key) {
    return false;
  }

  return tags.some((tag) => normalizeSubjectTag(tag).toLowerCase() === key);
}

export type AddSubjectTagResult =
  | { ok: true; tag: string }
  | { ok: false; message: string };

export function tryAddSubjectTag(
  tags: string[],
  rawValue: string,
  maxTags: number = MAX_SUBJECT_TAGS,
  maxLength: number = MAX_SUBJECT_TAG_LENGTH
): AddSubjectTagResult {
  const tag = normalizeSubjectTag(rawValue);

  if (!tag) {
    return { ok: false, message: '태그를 입력해 주세요.' };
  }

  if (tag.length > maxLength) {
    return {
      ok: false,
      message: `태그는 ${maxLength}자 이하여야 합니다.`,
    };
  }

  if (tags.length >= maxTags) {
    return {
      ok: false,
      message: `태그는 최대 ${maxTags}개까지 등록할 수 있습니다.`,
    };
  }

  if (hasSubjectTag(tags, tag)) {
    return { ok: false, message: '이미 추가된 태그입니다.' };
  }

  return { ok: true, tag };
}
