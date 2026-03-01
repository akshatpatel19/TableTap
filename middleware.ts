import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Protect staff internal routes
    if (pathname.match(/^\/[^\/]+\/staff\/(dashboard|bills)/)) {
        const staffSession = request.cookies.get('staff_session');

        // Redirect to staff login if there's no staff_session
        if (!staffSession) {
            const url = request.nextUrl.clone();
            url.pathname = '/owner/login';
            return NextResponse.redirect(url);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
