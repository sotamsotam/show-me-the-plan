'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useManagerStudent } from '@/contexts/ManagerStudentContext';
import { useProfileSubjects } from '@/hooks/useProfileSubjects';
import {
  getSubjectOptions,
  resolveProfileSubjects,
  type SubjectOption,
  type UserSubject,
} from '@/lib/user-subject';

interface ProfileSubjectsContextValue {
  subjects: UserSubject[];
  subjectOptions: SubjectOption[];
  loading: boolean;
  error: string;
  reload: () => Promise<void>;
}

const ProfileSubjectsContext = createContext<ProfileSubjectsContextValue | null>(null);

export function ProfileSubjectsProvider({ children }: { children: ReactNode }) {
  const { isManagerMode, selectedStudentId } = useManagerStudent();
  const studentUserId = isManagerMode ? selectedStudentId : null;
  const { subjects, subjectOptions, loading, error, reload } = useProfileSubjects({
    studentUserId,
    enabled: !isManagerMode || selectedStudentId !== null,
  });

  return (
    <ProfileSubjectsContext.Provider
      value={{ subjects, subjectOptions, loading, error, reload }}
    >
      {children}
    </ProfileSubjectsContext.Provider>
  );
}

export function useProfileSubjectsContext(): ProfileSubjectsContextValue {
  const context = useContext(ProfileSubjectsContext);

  if (!context) {
    const fallbackSubjects = resolveProfileSubjects(null);
    return {
      subjects: fallbackSubjects,
      subjectOptions: getSubjectOptions(null),
      loading: false,
      error: '',
      reload: async () => {},
    };
  }

  return context;
}
