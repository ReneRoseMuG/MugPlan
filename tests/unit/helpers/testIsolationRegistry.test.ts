import { describe, expect, it } from "vitest";

import {
  getRegisteredIsolationSuite,
  listRegisteredIsolationSuites,
} from "../../helpers/testIsolationRegistry";

describe("testIsolationRegistry", () => {
  it("marks the paged projects suite as the first default rollout candidate", () => {
    expect(getRegisteredIsolationSuite("tests/integration/server/projects.paged-list.integration.test.ts")).toEqual(
      expect.objectContaining({
        rolloutMode: "candidate-default",
        baseline: "core",
        storageProfile: "none",
        resetScope: "per-suite",
        canaryProfile: "project-list-confusion",
      }),
    );
  });

  it("marks the browser scope suite as a seeded default rollout candidate", () => {
    expect(getRegisteredIsolationSuite("tests/e2e-browser/appointments-list.filter-scope.browser.e2e.spec.ts")).toEqual(
      expect.objectContaining({
        rolloutMode: "candidate-default",
        baseline: "seeded",
        storageProfile: "none",
        resetScope: "per-suite",
        canaryProfile: "project-list-confusion",
      }),
    );
  });

  it("matches registered suites by absolute path suffix", () => {
    expect(
      getRegisteredIsolationSuite("C:/repo/tests/integration/server/tourWeekEmployees.integration.test.ts"),
    ).toEqual(
      expect.objectContaining({
        suitePath: "tests/integration/server/tourWeekEmployees.integration.test.ts",
        isolationClass: "A",
        resetScope: "per-test",
      }),
    );
  });

  it("contains the validated pilot suites", () => {
    expect(listRegisteredIsolationSuites().length).toBeGreaterThanOrEqual(7);
  });
});
