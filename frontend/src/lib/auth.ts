import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { getToken } from 'next-auth/jwt';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import type { AccountInfo } from '@/types/school';

const STRAPI_URL = process.env.STRAPI_URL ?? 'http://localhost:1337';

async function fetchAccountInfo(jwt: string): Promise<AccountInfo | null> {
  const res = await fetch(`${STRAPI_URL}/api/user-profiles/me`, {
    headers: { Authorization: `Bearer ${jwt}` },
    cache: 'no-store',
  });

  if (!res.ok) {
    return null;
  }

  const data = await res.json();
  return {
    user: data.user ?? null,
    role: data.role ?? null,
    profile: data.profile ?? null,
  };
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        identifier: { label: 'Email or Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) {
          return null;
        }

        const res = await fetch(`${STRAPI_URL}/api/auth/local`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identifier: credentials.identifier,
            password: credentials.password,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          return null;
        }

        const account = await fetchAccountInfo(data.jwt);

        return {
          id: String(data.user.id),
          email: data.user.email,
          username: data.user.username,
          strapiJwt: data.jwt,
          roleType: account?.role?.type,
          managerStatus: account?.profile?.managerStatus ?? null,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.username = user.username;
        token.strapiJwt = user.strapiJwt;
        token.roleType = user.roleType;
        token.managerStatus = user.managerStatus;
      }

      if (trigger === 'update' && session) {
        if (typeof session.username === 'string') {
          token.username = session.username;
        }
        if (typeof session.email === 'string') {
          token.email = session.email;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.email = token.email as string;
        session.user.username = token.username;
        session.user.roleType = token.roleType;
        session.user.managerStatus = token.managerStatus;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export async function getServerStrapiJwt(
  request?: NextRequest
): Promise<string | null> {
  const req: NextRequest =
    request ??
    ({
      headers: {
        cookie: cookies()
          .getAll()
          .map(({ name, value }) => `${name}=${value}`)
          .join('; '),
      },
    } as unknown as NextRequest);

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  return token?.strapiJwt ?? null;
}
