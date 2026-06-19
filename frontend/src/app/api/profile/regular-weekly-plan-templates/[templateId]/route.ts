import { appendStudentUserIdToPath } from '@/lib/api-student-query';
import { getServerStrapiJwt } from '@/lib/auth';
import { strapiFetch } from '@/lib/strapi';
import { NextRequest, NextResponse } from 'next/server';

function resolveTemplateApiError(
  res: Response,
  rawError: string | null,
  fallbackMessage: string
): string {
  if (res.status === 403 && rawError === 'Forbidden') {
    return '템플릿 API 권한이 없습니다. 백엔드 서버를 재시작한 뒤 다시 시도해 주세요.';
  }

  return rawError ?? fallbackMessage;
}

function readErrorMessage(data: { error?: { message?: string } | string }): string | null {
  return data.error?.message ?? (typeof data.error === 'string' ? data.error : null);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  const jwt = await getServerStrapiJwt(request);

  if (!jwt) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const path = appendStudentUserIdToPath(
    `/api/user-profiles/regular-weekly-plan-templates/${encodeURIComponent(params.templateId)}`,
    request
  );
  const res = await strapiFetch(path, {
    method: 'DELETE',
    jwt,
  });
  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      {
        error: resolveTemplateApiError(
          res,
          readErrorMessage(data),
          '평소기간 공부계획 템플릿 삭제에 실패했습니다.'
        ),
      },
      { status: res.status }
    );
  }

  return NextResponse.json(data);
}
