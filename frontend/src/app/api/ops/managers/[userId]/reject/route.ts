import { NextResponse } from 'next/server';
import { fetchOpsInternal, requireOperatorSession } from '@/lib/ops/auth';

export async function POST(
  _request: Request,
  context: { params: { userId: string } }
) {
  const auth = await requireOperatorSession();
  if ('error' in auth && auth.error) {
    return auth.error;
  }

  const result = await fetchOpsInternal(
    `/api/ops/internal/managers/${context.params.userId}/reject`,
    { method: 'POST' }
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data);
}
