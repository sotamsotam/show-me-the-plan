import { NextResponse } from 'next/server';
import { fetchOpsInternal, requireOperatorSession } from '@/lib/ops/auth';

export async function POST(
  request: Request,
  context: { params: { userId: string } }
) {
  const auth = await requireOperatorSession();
  if ('error' in auth && auth.error) {
    return auth.error;
  }

  const body = await request.json().catch(() => ({}));
  const result = await fetchOpsInternal(
    `/api/ops/internal/subscriptions/${context.params.userId}/discount/preview`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    }
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data);
}
