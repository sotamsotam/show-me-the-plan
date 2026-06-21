import 'next-auth';
import 'next-auth/jwt';
import type { ManagerStatus } from '@/types/school';
import type { SubscriptionSessionPayload } from '@/lib/subscription-access';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      username: string;
      roleType?: string;
      managerStatus?: ManagerStatus | null;
      schoolLevel?: string | null;
      subscription?: SubscriptionSessionPayload | null;
      isOperator?: boolean;
    };
  }

  interface User {
    id: string;
    email: string;
    username: string;
    strapiJwt: string;
    roleType?: string;
    managerStatus?: ManagerStatus | null;
    schoolLevel?: string | null;
    subscription?: SubscriptionSessionPayload | null;
    isOperator?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    username: string;
    strapiJwt: string;
    roleType?: string;
    managerStatus?: ManagerStatus | null;
    schoolLevel?: string | null;
    subscription?: SubscriptionSessionPayload | null;
    isOperator?: boolean;
  }
}
