import { defineConfig, mergeConfig } from "vitest/config";
import baseConfig from "./vitest.config";

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      setupFiles: ["./tests/setup.env.ts", "./tests/setup.integration.ts"],
    },
  }),
);