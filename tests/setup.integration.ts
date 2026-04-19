import { initializeRuntimeEnv } from "../server/config/runtimeEnv";
import { beforeEach } from "vitest";
import { prepareIntegrationOrE2eIsolation, resetIsolationExecutionState } from "./helpers/testIsolationExecution";
import { configureTestStorageIsolation } from "./helpers/testStorageIsolation";

process.env.NODE_ENV = "test";
process.env.MUGPLAN_MODE = "test";
process.env.LOG_LEVEL = "OFF";
initializeRuntimeEnv();
await configureTestStorageIsolation();
resetIsolationExecutionState();

beforeEach(async () => {
  const { expect } = await import("vitest");
  await prepareIntegrationOrE2eIsolation(expect.getState().testPath ?? "");
});
