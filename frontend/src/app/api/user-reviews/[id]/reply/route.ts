import { parseUserReviewError } from '@/lib/user-review';
import { fetchOpsInternal, requireOperatorSession } from '@/lib/ops/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireOperatorSession();

  if ('error' in auth && auth.error) {
    return auth.error;
  }

  const body = await request.json();
  const operatorUserId = Number(auth.session.user.id);

  if (!Number.isInteger(operatorUserId) || operatorUserId <= 0) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await fetchOpsInternal<{ review: unknown }>(
    `/api/user-reviews/internal/${params.id}/reply`,
    {
      method: 'PUT',
      body: JSON.stringify({ ...body, operatorUserId }),
      operatorLabel: auth.session.user.username ?? undefined,
    }
  );

  if (!result.ok) {
    return NextResponse.json(
      { error: parseUserReviewError(result, '답글 저장에 실패했습니다.') },
      { status: result.status }
    );
  }

  return NextResponse.json(result.data);
}
