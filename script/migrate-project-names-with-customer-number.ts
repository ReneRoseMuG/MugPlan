import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../server/db";

async function migrateProjectNamesWithCustomerNumber() {
  const previewRows = await db.execute(sql`
    select
      p.id as projectId,
      p.name as currentName,
      c.customer_number as customerNumber
    from project p
    inner join customer c on c.id = p.customer_id
    where p.name not regexp '^K: .+ - .+$'
    order by p.id
    limit 10
  `);

  const affectedPreviewRows = (previewRows as unknown as Array<{
    projectId: number;
    currentName: string;
    customerNumber: string;
  }>);

  const updateResult = await db.execute(sql`
    update project p
    inner join customer c on c.id = p.customer_id
    set p.name = concat('K: ', c.customer_number, ' - ', p.name)
    where p.name not regexp '^K: .+ - .+$'
  `);

  const affectedRows = Number((updateResult as any)?.[0]?.affectedRows ?? (updateResult as any)?.affectedRows ?? 0);

  console.log("[migrate-project-names-with-customer-number] completed", {
    affectedRows,
    preview: affectedPreviewRows,
  });
}

migrateProjectNamesWithCustomerNumber()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[migrate-project-names-with-customer-number] failed", error);
    process.exit(1);
  });
