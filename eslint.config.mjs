import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import { createConfig as createBoundariesConfig } from "eslint-plugin-boundaries/config";

const recommended = tseslint.configs["flat/recommended"];

export default [
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "tests/coverage/**",
      ".tmp-analysis/**",
    ],
  },
  {
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.eslint.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  ...recommended,
  {
    files: ["client/src/**/*.{ts,tsx}", "server/**/*.ts", "shared/**/*.ts"],
    rules: {
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-namespace": "off",
      "no-unused-vars": "off",
    },
  },
  createBoundariesConfig({
    settings: {
      "boundaries/elements": [
        { type: "shared", pattern: "shared/**/*" },
        { type: "server-route", pattern: "server/routes/**/*" },
        { type: "server-controller", pattern: "server/controllers/**/*" },
        { type: "server-service", pattern: "server/services/**/*" },
        { type: "server-repository", pattern: "server/repositories/**/*" },
        { type: "server-infra", pattern: "server/{bootstrap,config,lib,middleware,security,settings}/**/*" },
        { type: "server-root", pattern: "server/*.{ts,tsx}" },
        { type: "client-page", pattern: "client/src/pages/**/*" },
        { type: "client-component", pattern: "client/src/components/*.{ts,tsx}" },
        { type: "client-feature", pattern: "client/src/components/*/**/*", capture: ["featureName"] },
        { type: "client-ui", pattern: "client/src/components/ui/**/*" },
        { type: "client-hook", pattern: "client/src/hooks/**/*" },
        { type: "client-lib", pattern: "client/src/lib/**/*" },
        { type: "client-provider", pattern: "client/src/{providers,contexts}/**/*" },
        { type: "client-root", pattern: "client/src/*.{ts,tsx}" },
        { type: "test", pattern: "tests/**/*" },
      ],
    },
    rules: {
      "boundaries/dependencies": ["error", {
        default: "allow",
        rules: [
          {
            from: { type: "shared" },
            disallow: {
              to: {
                type: [
                  "client-page",
                  "client-component",
                  "client-feature",
                  "client-ui",
                  "client-hook",
                  "client-lib",
                  "client-provider",
                  "client-root",
                  "server-route",
                  "server-controller",
                  "server-service",
                  "server-repository",
                  "server-infra",
                  "server-root",
                  "test",
                ],
              },
            },
          },
          {
            from: {
              type: [
                "client-page",
                "client-component",
                "client-feature",
                "client-ui",
                "client-hook",
                "client-lib",
                "client-provider",
                "client-root",
              ],
            },
            disallow: {
              to: {
                type: [
                  "server-route",
                  "server-controller",
                  "server-service",
                  "server-repository",
                  "server-infra",
                  "server-root",
                ],
              },
            },
          },
          {
            from: { type: "server-route" },
            allow: { to: { type: ["server-controller", "shared", "server-infra", "server-root"] } },
          },
          {
            from: { type: "server-controller" },
            allow: { to: { type: ["server-service", "shared", "server-infra"] } },
          },
          {
            from: { type: "server-service" },
            allow: { to: { type: ["server-repository", "shared", "server-infra", "server-service"] } },
          },
          {
            from: { type: "server-repository" },
            allow: { to: { type: ["shared", "server-infra"] } },
          },
          {
            from: { type: "test" },
            allow: {
              to: {
                type: [
                  "shared",
                  "server-route",
                  "server-controller",
                  "server-service",
                  "server-repository",
                  "server-infra",
                  "server-root",
                  "client-page",
                  "client-component",
                  "client-feature",
                  "client-ui",
                  "client-hook",
                  "client-lib",
                  "client-provider",
                  "client-root",
                  "test",
                ],
              },
            },
          },
        ],
      }],
    },
  }),
];
