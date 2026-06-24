import { fetchOpsInternal, requireOperatorSession } from '@/lib/ops/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  const auth = await requireOperatorSession();

  if ('error' in auth && auth.error) {
    return auth.error;
  }

  const result = await fetchOpsInternal<{ reviews: unknown[] }>(
    '/api/user-reviews/internal/ops'
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data);
}
