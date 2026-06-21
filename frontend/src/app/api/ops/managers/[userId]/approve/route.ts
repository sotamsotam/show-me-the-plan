import { NextResponse } from 'next/server';
import { fetchOpsInternal, requireOperatorSession } from '@/lib/ops/auth';

async function handleManagerAction(
  userId: string,
  action: 'approve' | 'reject'
) {
  const auth = await requireOperatorSession();
  if ('error' in auth && auth.error) {
    return auth.error;
  }

  const result = await fetchOpsInternal(
    `/api/ops/internal/managers/${userId}/${action}`,
    { method: 'POST' }
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data);
}

export async function POST(
  _request: Request,
  context: { params: { userId: string } }
) {
  return handleManagerAction(context.params.userId, 'approve');
}
