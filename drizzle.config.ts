import { defineConfig } from "drizzle-kit";
if (!process.env.MYSQL_DATABASE_URL) {
  throw new Error("MYSQL_DATABASE_URL, ensure the database is provisioned");
}
export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "mysql",
  dbCredentials: {
    url: process.env.MYSQL_DATABASE_URL,
  },
});
