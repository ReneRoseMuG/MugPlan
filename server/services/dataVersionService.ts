import { db } from "../db";
import { sql } from "drizzle-orm";

export type DataVersion = {
  appointments: number;
  employees: number;
  projects: number;
  customers: number;
  notes: number;
};

export async function getDataVersion(): Promise<DataVersion> {
  const [appt, emp, proj, cust, note] = await Promise.all([
    db.execute(sql`SELECT COALESCE(UNIX_TIMESTAMP(MAX(updated_at)), 0) AS v FROM appointments`),
    db.execute(sql`SELECT COALESCE(UNIX_TIMESTAMP(MAX(updated_at)), 0) AS v FROM employee`),
    db.execute(sql`SELECT COALESCE(UNIX_TIMESTAMP(MAX(updated_at)), 0) AS v FROM project`),
    db.execute(sql`SELECT COALESCE(UNIX_TIMESTAMP(MAX(updated_at)), 0) AS v FROM customer`),
    db.execute(sql`SELECT COALESCE(UNIX_TIMESTAMP(MAX(updated_at)), 0) AS v FROM note`),
  ]);

  return {
    appointments: Number((appt[0] as any)[0].v),
    employees:    Number((emp[0] as any)[0].v),
    projects:     Number((proj[0] as any)[0].v),
    customers:    Number((cust[0] as any)[0].v),
    notes:        Number((note[0] as any)[0].v),
  };
}
