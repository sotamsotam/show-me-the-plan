/** backend/src/services/user-subject-seed.ts createNeisSubjectId 와 동일한 해시 */
export function createNeisSubjectId(label: string): string {
  const normalized = label.replace(/\s+/g, '').trim();
  let hash = 2166136261;

  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return `neis-${(hash >>> 0).toString(36)}`;
}
