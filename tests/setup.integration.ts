import { initializeRuntimeEnv } from "../server/config/runtimeEnv";
import { beforeEach } from "vitest";
import { resetDatabase } from "./helpers/resetDatabase";
import { resetTestDataFactoryState } from "./helpers/testDataFactory";

process.env.NODE_ENV = "test";
process.env.MUGPLAN_MODE = "test";
initializeRuntimeEnv();

beforeEach(async () => {
  resetTestDataFactoryState();
  await resetDatabase();
});
