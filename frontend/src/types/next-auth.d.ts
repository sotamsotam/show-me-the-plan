import 'next-auth';
import 'next-auth/jwt';
import type { ManagerStatus } from '@/types/school';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      username: string;
      roleType?: string;
      managerStatus?: ManagerStatus | null;
    };
  }

  interface User {
    id: string;
    email: string;
    username: string;
    strapiJwt: string;
    roleType?: string;
    managerStatus?: ManagerStatus | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    username: string;
    strapiJwt: string;
    roleType?: string;
    managerStatus?: ManagerStatus | null;
  }
}
