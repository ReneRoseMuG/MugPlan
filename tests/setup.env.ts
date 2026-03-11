import { initializeRuntimeEnv } from "../server/config/runtimeEnv";
import { beforeEach, expect } from "vitest";
import { resetDatabase } from "./helpers/resetDatabase";
import { configureTestStorageIsolation, resetIsolatedTestStorage } from "./helpers/testStorageIsolation";

process.env.NODE_ENV = "test";
process.env.MUGPLAN_MODE = "test";
initializeRuntimeEnv();
await configureTestStorageIsolation();

beforeEach(async () => {
  const testPath = expect.getState().testPath ?? "";
  const isIntegrationTest =
    testPath.includes("/tests/integration/") || testPath.includes("\\tests\\integration\\");
  const isE2ETest = testPath.includes("/tests/e2e/") || testPath.includes("\\tests\\e2e\\");

  if (isIntegrationTest || isE2ETest) {
    await resetIsolatedTestStorage();
    await resetDatabase();
  }
});
