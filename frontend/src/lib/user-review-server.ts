import { headers } from 'next/headers';
import { parseUserReviewError, type UserReview } from './user-review';

function getAppOrigin(): string {
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL.replace(/\/$/, '');
  }

  return 'http://127.0.0.1:3000';
}

export async function loadUserReviewsFromAppApi(
  path: string,
  fallbackError: string
): Promise<{ reviews: UserReview[]; error: string | null }> {
  const cookie = headers().get('cookie');

  if (!cookie) {
    return { reviews: [], error: null };
  }

  try {
    const res = await fetch(`${getAppOrigin()}${path}`, {
      headers: { cookie },
      cache: 'no-store',
    });
    const data = await res.json();

    if (!res.ok) {
      return {
        reviews: [],
        error: parseUserReviewError(data, fallbackError),
      };
    }

    return {
      reviews: (data as { reviews?: UserReview[] }).reviews ?? [],
      error: null,
    };
  } catch {
    return { reviews: [], error: fallbackError };
  }
}
