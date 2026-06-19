import { strapiFetch } from '@/lib/strapi';
import type { ManagedStudent } from '@/lib/manager-student';

export async function fetchManagedStudents(
  jwt: string
): Promise<ManagedStudent[]> {
  const res = await strapiFetch('/api/user-profiles/manager/students', { jwt });

  if (!res.ok) {
    return [];
  }

  const data = await res.json();
  return (data.students ?? []) as ManagedStudent[];
}
