import { NextResponse } from 'next/server';
import { fetchOpsInternal, requireOperatorSession } from '@/lib/ops/auth';

export async function PATCH(
  request: Request,
  context: { params: { userId: string } }
) {
  const auth = await requireOperatorSession();
  if ('error' in auth && auth.error) {
    return auth.error;
  }

  const body = await request.json().catch(() => ({}));
  const operatorLabel =
    auth.session.user.email || auth.session.user.username || `user-${auth.session.user.id}`;

  const result = await fetchOpsInternal(
    `/api/ops/internal/subscriptions/${context.params.userId}/discount`,
    {
      method: 'PATCH',
      body: JSON.stringify(body),
      operatorLabel,
    }
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data);
}
