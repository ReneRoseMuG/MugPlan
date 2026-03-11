import { initializeRuntimeEnv } from "../server/config/runtimeEnv";
import { configureTestStorageIsolation } from "./helpers/testStorageIsolation";

process.env.NODE_ENV = "test";
process.env.MUGPLAN_MODE = "test";
initializeRuntimeEnv();
await configureTestStorageIsolation();
