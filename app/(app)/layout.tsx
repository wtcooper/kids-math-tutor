import { requireAllowedPerson } from "@/lib/auth/person";

/**
 * Route group for everything that requires being on the list.
 *
 * This call is for the group's own chrome and is cached, so it costs nothing. It is NOT
 * the enforcement — a layout's children can begin rendering before its redirect lands,
 * which would put content into the RSC payload. Every page below calls
 * requireAllowedPerson() itself, and that is what actually gates.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireAllowedPerson();
  return <>{children}</>;
}
