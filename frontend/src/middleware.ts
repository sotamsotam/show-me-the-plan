import { withAuth } from 'next-auth/middleware';

import { NextResponse } from 'next/server';

import type { NextRequestWithAuth } from 'next-auth/middleware';

import { isOpsApiPath, isOpsPagePath } from '@/lib/ops/paths';

import {

  isApiAllowedWhenExpired,

  isBillingPathAllowedWhenExpired,

  isDashboardBillingAllowed,

  isPublicApiPath,

} from '@/lib/subscription-access';

import { isAnyStudent } from '@/types/school';

import type { SubscriptionSummary } from '@/types/subscription';



const STRAPI_URL = process.env.STRAPI_URL ?? 'http://localhost:1337';



async function fetchStudentSubscription(

  strapiJwt: string

): Promise<SubscriptionSummary | null> {

  try {

    const res = await fetch(`${STRAPI_URL}/api/subscriptions/me`, {

      headers: { Authorization: `Bearer ${strapiJwt}` },

      cache: 'no-store',

    });



    if (!res.ok) {

      return null;

    }



    const data = await res.json();

    return (data.subscription as SubscriptionSummary | null) ?? null;

  } catch {

    return null;

  }

}



function resolveStudentAccessAllowed(

  subscription: SubscriptionSummary | null,

  tokenSubscription: { isAccessAllowed?: boolean } | null | undefined

): boolean {

  if (subscription) {

    return subscription.isAccessAllowed;

  }



  if (typeof tokenSubscription?.isAccessAllowed === 'boolean') {

    return tokenSubscription.isAccessAllowed;

  }



  return true;

}



export default withAuth(

  async function middleware(req: NextRequestWithAuth) {

    const { pathname } = req.nextUrl;

    const token = req.nextauth.token;



    if (isPublicApiPath(pathname)) {

      return NextResponse.next();

    }



    if (isOpsPagePath(pathname) || isOpsApiPath(pathname)) {

      if (!token?.isOperator) {

        if (isOpsApiPath(pathname)) {

          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        }



        return NextResponse.redirect(new URL('/dashboard', req.url));

      }



      return NextResponse.next();

    }



    if (token?.isOperator) {

      if (pathname.startsWith('/dashboard')) {

        return NextResponse.redirect(new URL('/ops', req.url));

      }



      return NextResponse.next();

    }



    if (!token?.strapiJwt || !token.schoolLevel) {

      return NextResponse.next();

    }



    if (!isAnyStudent(token.schoolLevel)) {

      return NextResponse.next();

    }



    const subscription = await fetchStudentSubscription(token.strapiJwt);

    const isAccessAllowed = resolveStudentAccessAllowed(

      subscription,

      token.subscription

    );



    if (isAccessAllowed) {

      return NextResponse.next();

    }



    if (pathname.startsWith('/dashboard')) {

      if (isDashboardBillingAllowed(pathname)) {

        return NextResponse.next();

      }



      return NextResponse.redirect(new URL('/billing/expired', req.url));

    }



    if (isBillingPathAllowedWhenExpired(pathname)) {

      return NextResponse.next();

    }



    if (pathname.startsWith('/api')) {

      if (isApiAllowedWhenExpired(pathname)) {

        return NextResponse.next();

      }



      return NextResponse.json(

        { error: '구독 또는 무료 체험이 만료되었습니다.' },

        { status: 403 }

      );

    }



    return NextResponse.next();

  },

  {

    callbacks: {

      authorized: ({ token, req }) => {

        if (isPublicApiPath(req.nextUrl.pathname)) {

          return true;

        }



        return !!token;

      },

    },

  }

);



export const config = {

  matcher: [

    '/dashboard/:path*',

    '/billing/:path*',

    '/api/:path*',

    '/ops',

    '/ops/:path*',

  ],

};

