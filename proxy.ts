import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Next 16 names this file proxy.ts. A file called middleware.ts produces no
// error and no behaviour at all.

// Sign-up must be public: Clerk's invitation emails land on /sign-up with a
// ticket, and restricted mode is what stops anyone uninvited from using it.
//
// /api is here for a different reason. A fetch must never follow a redirect into the
// sign-in HTML and then fail parsing it as JSON — an error that points nowhere near the
// real problem. Returning 401 from *this* file does not achieve that: on a Clerk
// development instance the handshake redirects unauthenticated API requests before this
// callback ever runs (observable as `x-clerk-auth-reason: dev-browser-missing`).
//
// So the proxy stays out of /api entirely and every route handler enforces its own auth
// with an explicit 401 JSON — which it has to do regardless, since it needs the person
// record. See requireApiPerson() in lib/auth/person.ts.
const PUBLIC_PREFIXES = ["/sign-in", "/sign-up", "/api"];

const isPublic = (p: string) =>
  PUBLIC_PREFIXES.some((x) => p === x || p.startsWith(`${x}/`));

export default clerkMiddleware(async (auth, request) => {
  if (isPublic(request.nextUrl.pathname)) return;

  const { userId } = await auth();
  if (userId) return;

  const signIn = request.nextUrl.clone();
  signIn.pathname = "/sign-in";
  signIn.search = "";
  return NextResponse.redirect(signIn);
});

// This proxy answers "is there a session" only. "May this person in" is a database
// question, and the proxy has no database access — that check lives in
// lib/auth/person.ts, called from every gated page and API route.

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico)).*)",
    "/(api|trpc)(.*)",
  ],
};
