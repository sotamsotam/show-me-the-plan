import { NextResponse } from 'next/server';
import { fetchOpsInternal, requireOperatorSession } from '@/lib/ops/auth';

export async function GET(
  _request: Request,
  context: { params: { userId: string } }
) {
  const auth = await requireOperatorSession();
  if ('error' in auth && auth.error) {
    return auth.error;
  }

  const userId = context.params.userId;
  const result = await fetchOpsInternal(`/api/ops/internal/subscriptions/${userId}`);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data);
}
