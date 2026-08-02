import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The tutor is a single static HTML file read at request time by app/route.ts.
  // Tracing does not follow the read on its own, so name it explicitly or the
  // file is missing from the deployed bundle.
  outputFileTracingIncludes: {
    "/": ["./docs/math-table.html"],
  },
};

export default nextConfig;
