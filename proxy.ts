import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Next 16 names this file proxy.ts. A file called middleware.ts produces no
// error and no behaviour at all.

// Sign-up must be public: Clerk's invitation emails land on /sign-up with a
// ticket, and restricted mode is what stops anyone uninvited from using it.
const PUBLIC_PREFIXES = ["/sign-in", "/sign-up"];

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

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico)).*)",
    "/(api|trpc)(.*)",
  ],
};
