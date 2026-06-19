'use client';

import { useCallback } from 'react';
import { appendStudentUserId, withStudentUserId } from '@/lib/manager-student';
import { useManagerStudent } from '@/contexts/ManagerStudentContext';

export function useStudentApi() {
  const { isManagerMode, selectedStudentId } = useManagerStudent();
  const studentUserId = isManagerMode ? selectedStudentId : null;

  const withStudent = useCallback(
    (url: string) => withStudentUserId(url, studentUserId),
    [studentUserId]
  );

  const appendToParams = useCallback(
    (params: URLSearchParams) => appendStudentUserId(params, studentUserId),
    [studentUserId]
  );

  return {
    studentUserId,
    withStudent,
    appendToParams,
  };
}
