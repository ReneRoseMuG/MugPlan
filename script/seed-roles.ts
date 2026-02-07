import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../server/db";

async function seedRoles() {
  await db.execute(sql`
    INSERT INTO roles (code, name, description, is_system)
    VALUES
      ('READER', 'Leser', 'Lesezugriff nur. Keine Bearbeitungsrechte.', 1),
      ('DISPATCHER', 'Disponent', 'Fachliche Bearbeitung von Projekten, Terminen und Kunden.', 1),
      ('ADMIN', 'Admin', 'Vollzugriff. Systemadministration und Stammdaten.', 1)
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      description = VALUES(description),
      is_system = VALUES(is_system)
  `);

  console.log("Roles seed completed.");
}

seedRoles()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Roles seed failed", error);
    process.exit(1);
  });
