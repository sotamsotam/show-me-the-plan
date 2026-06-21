import { NextRequest, NextResponse } from 'next/server';
import { fetchOpsInternal, requireOperatorSession } from '@/lib/ops/auth';

export async function GET(request: NextRequest) {
  const auth = await requireOperatorSession();
  if ('error' in auth && auth.error) {
    return auth.error;
  }

  const query = request.nextUrl.searchParams.toString();
  const path = query
    ? `/api/ops/internal/members?${query}`
    : '/api/ops/internal/members';

  const result = await fetchOpsInternal(path);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data);
}
