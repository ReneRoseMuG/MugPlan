import { initializeRuntimeEnv } from "../server/config/runtimeEnv";

process.env.NODE_ENV = "test";
process.env.ENV_FILES_DIR = ".";
initializeRuntimeEnv();
