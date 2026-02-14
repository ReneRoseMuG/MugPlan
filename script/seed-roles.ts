import "dotenv/config";
import { ensureSystemRoles } from "../server/bootstrap/ensureSystemRoles";

async function seedRoles() {
  await ensureSystemRoles();
  console.log("Roles seed completed.");
}

seedRoles()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Roles seed failed", error);
    process.exit(1);
  });
