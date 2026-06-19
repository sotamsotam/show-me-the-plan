'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  MANAGER_SELECTED_STUDENT_KEY,
  type ManagedStudent,
} from '@/lib/manager-student';

interface ManagerStudentContextValue {
  isManagerMode: boolean;
  students: ManagedStudent[];
  selectedStudent: ManagedStudent | null;
  selectedStudentId: number | null;
  loading: boolean;
  setSelectedStudentId: (studentUserId: number | null) => void;
  refreshStudents: () => Promise<void>;
}

const ManagerStudentContext = createContext<ManagerStudentContextValue | null>(null);

interface ManagerStudentProviderProps {
  isManagerMode: boolean;
  initialStudents?: ManagedStudent[];
  children: ReactNode;
}

function resolveInitialSelectedId(students: ManagedStudent[]): number | null {
  if (students.length === 0) {
    return null;
  }

  if (typeof window === 'undefined') {
    return students[0]?.userId ?? null;
  }

  const storedId = sessionStorage.getItem(MANAGER_SELECTED_STUDENT_KEY);
  const storedStudentId = storedId ? Number(storedId) : null;

  if (
    storedStudentId &&
    students.some((student) => student.userId === storedStudentId)
  ) {
    return storedStudentId;
  }

  return students[0]?.userId ?? null;
}

export function ManagerStudentProvider({
  isManagerMode,
  initialStudents = [],
  children,
}: ManagerStudentProviderProps) {
  const [students, setStudents] = useState<ManagedStudent[]>(initialStudents);
  const [selectedStudentId, setSelectedStudentIdState] = useState<number | null>(
    () => (isManagerMode ? resolveInitialSelectedId(initialStudents) : null)
  );
  const [loading, setLoading] = useState(
    isManagerMode && initialStudents.length === 0
  );

  const refreshStudents = useCallback(async (silent = false) => {
    if (!isManagerMode) {
      setStudents([]);
      setLoading(false);
      return;
    }

    if (!silent) {
      setLoading(true);
    }

    try {
      const res = await fetch('/api/profile/manager/students', {
        credentials: 'include',
      });
      const data = await res.json();

      if (!res.ok) {
        setStudents([]);
        return;
      }

      const nextStudents = (data.students ?? []) as ManagedStudent[];
      setStudents(nextStudents);

      const storedId = sessionStorage.getItem(MANAGER_SELECTED_STUDENT_KEY);
      const storedStudentId = storedId ? Number(storedId) : null;
      const validStoredId =
        storedStudentId &&
        nextStudents.some((student) => student.userId === storedStudentId)
          ? storedStudentId
          : null;

      setSelectedStudentIdState(validStoredId ?? nextStudents[0]?.userId ?? null);
    } finally {
      setLoading(false);
    }
  }, [isManagerMode]);

  useEffect(() => {
    if (!isManagerMode) {
      return;
    }

    if (initialStudents.length > 0) {
      refreshStudents(true);
      return;
    }

    refreshStudents();
  }, [isManagerMode, initialStudents.length, refreshStudents]);

  const setSelectedStudentId = useCallback((studentUserId: number | null) => {
    setSelectedStudentIdState(studentUserId);

    if (studentUserId) {
      sessionStorage.setItem(MANAGER_SELECTED_STUDENT_KEY, String(studentUserId));
    } else {
      sessionStorage.removeItem(MANAGER_SELECTED_STUDENT_KEY);
    }
  }, []);

  const selectedStudent = useMemo(
    () => students.find((student) => student.userId === selectedStudentId) ?? null,
    [students, selectedStudentId]
  );

  const value = useMemo(
    () => ({
      isManagerMode,
      students,
      selectedStudent,
      selectedStudentId,
      loading,
      setSelectedStudentId,
      refreshStudents,
    }),
    [
      isManagerMode,
      students,
      selectedStudent,
      selectedStudentId,
      loading,
      setSelectedStudentId,
      refreshStudents,
    ]
  );

  return (
    <ManagerStudentContext.Provider value={value}>
      {children}
    </ManagerStudentContext.Provider>
  );
}

export function useManagerStudent() {
  const context = useContext(ManagerStudentContext);

  if (!context) {
    return {
      isManagerMode: false,
      students: [],
      selectedStudent: null,
      selectedStudentId: null,
      loading: false,
      setSelectedStudentId: () => {},
      refreshStudents: async () => {},
    };
  }

  return context;
}
