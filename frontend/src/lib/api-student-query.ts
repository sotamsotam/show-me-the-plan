import type { NextRequest } from 'next/server';

export function getStudentUserIdFromRequest(request: NextRequest): string | null {
  return request.nextUrl.searchParams.get('studentUserId');
}

export function appendStudentUserIdToParams(
  params: URLSearchParams,
  request: NextRequest
): URLSearchParams {
  const studentUserId = getStudentUserIdFromRequest(request);

  if (studentUserId) {
    params.set('studentUserId', studentUserId);
  }

  return params;
}

export function appendStudentUserIdToPath(
  path: string,
  request: NextRequest
): string {
  const studentUserId = getStudentUserIdFromRequest(request);

  if (!studentUserId) {
    return path;
  }

  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}studentUserId=${encodeURIComponent(studentUserId)}`;
}
