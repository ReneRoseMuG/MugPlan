import { initializeRuntimeEnv } from "../server/config/runtimeEnv";

process.env.NODE_ENV = "test";
process.env.MUGPLAN_MODE = "test";
initializeRuntimeEnv();
