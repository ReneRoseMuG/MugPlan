import { beforeEach } from "vitest";
import { resetDatabase } from "./helpers/resetDatabase";

beforeEach(async () => {
  await resetDatabase();
});
