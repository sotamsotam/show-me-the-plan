import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

const STRAPI_URL = process.env.STRAPI_URL ?? 'http://localhost:1337';

export async function getStrapiJwt(req: NextRequest): Promise<string | null> {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  return token?.strapiJwt ?? null;
}

export async function strapiFetch(
  path: string,
  options: RequestInit & { jwt?: string } = {}
) {
  const { jwt, ...fetchOptions } = options;
  const headers = new Headers(fetchOptions.headers);
  headers.set('Content-Type', 'application/json');

  if (jwt) {
    headers.set('Authorization', `Bearer ${jwt}`);
  }

  return fetch(`${STRAPI_URL}${path}`, {
    ...fetchOptions,
    headers,
  });
}
