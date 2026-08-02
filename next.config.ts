import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The original tutor is a static HTML file read at request time by app/legacy/route.ts.
  // Tracing does not follow the read on its own, so name it explicitly or the file is
  // missing from the deployed bundle.
  //
  // This key MUST track the route. Dev reads from disk regardless, so a wrong key passes
  // every local check and only 500s in production. Removed entirely at cutover, once the
  // React tutor is the only one.
  outputFileTracingIncludes: {
    "/legacy": ["./docs/math-table.html"],
  },
};

export default nextConfig;
