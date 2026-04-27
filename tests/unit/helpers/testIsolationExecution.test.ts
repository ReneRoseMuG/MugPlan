import { afterEach, describe, expect, it } from "vitest";

import {
  defineTestIsolation,
  normalizeTestPath,
  readIsolationExecutionConfig,
  readIsolationExecutionConfigForSuite,
  resetIsolationExecutionState,
  shouldUseCandidateBaseline,
} from "../../helpers/testIsolationExecution";

const originalEnv = {
  TEST_ISOLATION_MODE: process.env.TEST_ISOLATION_MODE,
  TEST_ISOLATION_TARGET_SUITE: process.env.TEST_ISOLATION_TARGET_SUITE,
  TEST_ISOLATION_BASELINE: process.env.TEST_ISOLATION_BASELINE,
  TEST_ISOLATION_STORAGE_PROFILE: process.env.TEST_ISOLATION_STORAGE_PROFILE,
  TEST_ISOLATION_CANARY_PROFILE: process.env.TEST_ISOLATION_CANARY_PROFILE,
  TEST_ISOLATION_RESET_SCOPE: process.env.TEST_ISOLATION_RESET_SCOPE,
  TEST_ISOLATION_VERBOSE: process.env.TEST_ISOLATION_VERBOSE,
};

afterEach(() => {
  process.env.TEST_ISOLATION_MODE = originalEnv.TEST_ISOLATION_MODE;
  process.env.TEST_ISOLATION_TARGET_SUITE = originalEnv.TEST_ISOLATION_TARGET_SUITE;
  process.env.TEST_ISOLATION_BASELINE = originalEnv.TEST_ISOLATION_BASELINE;
  process.env.TEST_ISOLATION_STORAGE_PROFILE = originalEnv.TEST_ISOLATION_STORAGE_PROFILE;
  process.env.TEST_ISOLATION_CANARY_PROFILE = originalEnv.TEST_ISOLATION_CANARY_PROFILE;
  process.env.TEST_ISOLATION_RESET_SCOPE = originalEnv.TEST_ISOLATION_RESET_SCOPE;
  process.env.TEST_ISOLATION_VERBOSE = originalEnv.TEST_ISOLATION_VERBOSE;
  resetIsolationExecutionState();
});

describe("testIsolationExecution", () => {
  it("normalizes windows paths and keeps stable metadata", () => {
    const metadata = defineTestIsolation({
      isolationClass: "B",
      baseline: "core",
      storageProfile: "none",
      canaryProfile: "project-list-confusion",
      requiresNegativeProof: true,
    });

    expect(metadata).toEqual({
      isolationClass: "B",
      baseline: "core",
      storageProfile: "none",
      canaryProfile: "project-list-confusion",
      requiresNegativeProof: true,
    });
    expect(normalizeTestPath("tests\\integration\\suite.test.ts")).toBe("tests/integration/suite.test.ts");
  });

  it("reads candidate execution config from env", () => {
    process.env.TEST_ISOLATION_MODE = "candidate-baseline";
    process.env.TEST_ISOLATION_TARGET_SUITE = "tests\\integration\\suite.test.ts";
    process.env.TEST_ISOLATION_BASELINE = "seeded";
    process.env.TEST_ISOLATION_STORAGE_PROFILE = "uploads";
    process.env.TEST_ISOLATION_CANARY_PROFILE = "attachment-confusion";
    process.env.TEST_ISOLATION_RESET_SCOPE = "per-test";
    process.env.TEST_ISOLATION_VERBOSE = "1";

    expect(readIsolationExecutionConfig()).toEqual({
      mode: "candidate-baseline",
      targetSuite: "tests/integration/suite.test.ts",
      baseline: "seeded",
      storageProfile: "uploads",
      canaryProfile: "attachment-confusion",
      resetScope: "per-test",
      verbose: true,
    });
  });

  it("defaults validated rollout suites to candidate baseline without env overrides", () => {
    delete process.env.TEST_ISOLATION_MODE;
    delete process.env.TEST_ISOLATION_TARGET_SUITE;
    delete process.env.TEST_ISOLATION_BASELINE;
    delete process.env.TEST_ISOLATION_STORAGE_PROFILE;
    delete process.env.TEST_ISOLATION_CANARY_PROFILE;
    delete process.env.TEST_ISOLATION_RESET_SCOPE;
    delete process.env.TEST_ISOLATION_VERBOSE;

    expect(
      readIsolationExecutionConfigForSuite("tests/integration/server/projects.paged-list.integration.test.ts"),
    ).toEqual({
      mode: "candidate-baseline",
      targetSuite: "tests/integration/server/projects.paged-list.integration.test.ts",
      baseline: "core",
      storageProfile: "none",
      canaryProfile: null,
      resetScope: "per-suite",
      verbose: false,
    });
  });

  it("defaults validated browser rollout suites to seeded candidate baseline without env overrides", () => {
    delete process.env.TEST_ISOLATION_MODE;
    delete process.env.TEST_ISOLATION_TARGET_SUITE;
    delete process.env.TEST_ISOLATION_BASELINE;
    delete process.env.TEST_ISOLATION_STORAGE_PROFILE;
    delete process.env.TEST_ISOLATION_CANARY_PROFILE;
    delete process.env.TEST_ISOLATION_RESET_SCOPE;
    delete process.env.TEST_ISOLATION_VERBOSE;

    expect(
      readIsolationExecutionConfigForSuite("tests/e2e-browser/appointments-list.filter-scope.browser.e2e.spec.ts"),
    ).toEqual({
      mode: "candidate-baseline",
      targetSuite: "tests/e2e-browser/appointments-list.filter-scope.browser.e2e.spec.ts",
      baseline: "seeded",
      storageProfile: "none",
      canaryProfile: null,
      resetScope: "per-suite",
      verbose: false,
    });
  });

  it("defaults validated customer paging suites to core candidate baseline without env overrides", () => {
    delete process.env.TEST_ISOLATION_MODE;
    delete process.env.TEST_ISOLATION_TARGET_SUITE;
    delete process.env.TEST_ISOLATION_BASELINE;
    delete process.env.TEST_ISOLATION_STORAGE_PROFILE;
    delete process.env.TEST_ISOLATION_CANARY_PROFILE;
    delete process.env.TEST_ISOLATION_RESET_SCOPE;
    delete process.env.TEST_ISOLATION_VERBOSE;

    expect(
      readIsolationExecutionConfigForSuite("tests/integration/server/customers.paged-list.integration.test.ts"),
    ).toEqual({
      mode: "candidate-baseline",
      targetSuite: "tests/integration/server/customers.paged-list.integration.test.ts",
      baseline: "core",
      storageProfile: "none",
      canaryProfile: null,
      resetScope: "per-suite",
      verbose: false,
    });
  });

  it("defaults validated project scope browser suites to seeded candidate baseline without env overrides", () => {
    delete process.env.TEST_ISOLATION_MODE;
    delete process.env.TEST_ISOLATION_TARGET_SUITE;
    delete process.env.TEST_ISOLATION_BASELINE;
    delete process.env.TEST_ISOLATION_STORAGE_PROFILE;
    delete process.env.TEST_ISOLATION_CANARY_PROFILE;
    delete process.env.TEST_ISOLATION_RESET_SCOPE;
    delete process.env.TEST_ISOLATION_VERBOSE;

    expect(
      readIsolationExecutionConfigForSuite("tests/e2e-browser/projects.filter-scopes.browser.e2e.spec.ts"),
    ).toEqual({
      mode: "candidate-baseline",
      targetSuite: "tests/e2e-browser/projects.filter-scopes.browser.e2e.spec.ts",
      baseline: "seeded",
      storageProfile: "none",
      canaryProfile: null,
      resetScope: "per-suite",
      verbose: false,
    });
  });

  it("uses candidate baseline only for the targeted suite", () => {
    process.env.TEST_ISOLATION_MODE = "candidate-baseline";
    process.env.TEST_ISOLATION_TARGET_SUITE = "tests/integration/server/projects.paged-list.integration.test.ts";

    expect(shouldUseCandidateBaseline("tests/integration/server/projects.paged-list.integration.test.ts")).toBe(true);
    expect(
      shouldUseCandidateBaseline("C:/repo/tests/integration/server/projects.paged-list.integration.test.ts"),
    ).toBe(true);
    expect(shouldUseCandidateBaseline("tests/integration/server/other.integration.test.ts")).toBe(false);
  });
});
