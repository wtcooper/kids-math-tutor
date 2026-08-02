import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    // Unpooled for DDL. Schema changes through a connection pooler can land on a
    // different backend than the one that opened the transaction — exactly the wrong
    // property for a migration. The pooled URL is for the request path.
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "",
  },
  strict: true,
});
