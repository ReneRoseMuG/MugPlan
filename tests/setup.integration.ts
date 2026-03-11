import { initializeRuntimeEnv } from "../server/config/runtimeEnv";
import { beforeEach } from "vitest";
import { resetDatabase } from "./helpers/resetDatabase";
import { resetTestDataFactoryState } from "./helpers/testDataFactory";
import { configureTestStorageIsolation, resetIsolatedTestStorage } from "./helpers/testStorageIsolation";

process.env.NODE_ENV = "test";
process.env.MUGPLAN_MODE = "test";
initializeRuntimeEnv();
await configureTestStorageIsolation();

beforeEach(async () => {
  await resetIsolatedTestStorage();
  resetTestDataFactoryState();
  await resetDatabase();
});
