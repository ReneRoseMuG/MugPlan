import type {
  DatabaseCanaryProfile,
  StorageCanaryProfile,
} from "./testIsolationCanaries";
import type {
  TestIsolationBaseline,
  TestIsolationClass,
  TestIsolationResetScope,
  TestIsolationStorageProfile,
} from "./testIsolationExecution";
import { normalizeTestPath } from "./testIsolationExecution";

export type TestIsolationRegistryEntry = {
  suitePath: string;
  isolationClass: TestIsolationClass;
  baseline: TestIsolationBaseline;
  storageProfile: TestIsolationStorageProfile;
  resetScope: TestIsolationResetScope;
  canaryProfile: DatabaseCanaryProfile | StorageCanaryProfile;
  pilotStatus: "validated" | "validated-with-hard-isolation";
  rolloutMode: "candidate-default" | "pilot-only";
  notes: string;
};

const isolationRegistry: TestIsolationRegistryEntry[] = [
  {
    suitePath: "tests/integration/server/projects.paged-list.integration.test.ts",
    isolationClass: "B",
    baseline: "core",
    storageProfile: "none",
    resetScope: "per-suite",
    canaryProfile: "project-list-confusion",
    pilotStatus: "validated",
    rolloutMode: "candidate-default",
    notes: "Erste kontrollierte default-Rollout-Suite nach stabilem per-suite Canary-Pilot.",
  },
  {
    suitePath: "tests/integration/server/customers.paged-list.integration.test.ts",
    isolationClass: "B",
    baseline: "core",
    storageProfile: "none",
    resetScope: "per-suite",
    canaryProfile: "project-list-confusion",
    pilotStatus: "validated",
    rolloutMode: "candidate-default",
    notes: "Paginierte Kundenliste ist nach Token-Haertung stabil im per-suite Canary-Pilot.",
  },
  {
    suitePath: "tests/integration/server/appointments.attachments.integration.test.ts",
    isolationClass: "S",
    baseline: "core",
    storageProfile: "uploads",
    resetScope: "per-test",
    canaryProfile: "attachment-confusion",
    pilotStatus: "validated-with-hard-isolation",
    rolloutMode: "pilot-only",
    notes: "Storage-Sonderfall bleibt vorerst auf harter Isolation.",
  },
  {
    suitePath: "tests/integration/server/admin.system-seed.integration.test.ts",
    isolationClass: "S",
    baseline: "core",
    storageProfile: "none",
    resetScope: "per-test",
    canaryProfile: "seed-shadow",
    pilotStatus: "validated-with-hard-isolation",
    rolloutMode: "pilot-only",
    notes: "Seed-Suite zeigt echte Cross-Test-Pollution und bleibt per-test.",
  },
  {
    suitePath: "tests/integration/server/tourWeekEmployees.integration.test.ts",
    isolationClass: "A",
    baseline: "core",
    storageProfile: "none",
    resetScope: "per-test",
    canaryProfile: "week-plan-confusion",
    pilotStatus: "validated-with-hard-isolation",
    rolloutMode: "pilot-only",
    notes: "Mehrschrittige Wochenplanung bleibt Klasse A.",
  },
  {
    suitePath: "tests/e2e-browser/appointments-list.filter-scope.browser.e2e.spec.ts",
    isolationClass: "B",
    baseline: "seeded",
    storageProfile: "none",
    resetScope: "per-suite",
    canaryProfile: "project-list-confusion",
    pilotStatus: "validated",
    rolloutMode: "candidate-default",
    notes: "Erste kontrollierte Browser-default-Suite nach stabilem per-suite Canary-Pilot.",
  },
  {
    suitePath: "tests/e2e-browser/projects.filter-scopes.browser.e2e.spec.ts",
    isolationClass: "B",
    baseline: "seeded",
    storageProfile: "none",
    resetScope: "per-suite",
    canaryProfile: "project-list-confusion",
    pilotStatus: "validated",
    rolloutMode: "candidate-default",
    notes: "Projekt-Scope-Browser-Suite ist stabil im seeded per-suite Canary-Pilot.",
  },
  {
    suitePath: "tests/e2e-browser/settingsPage.backup.browser.e2e.spec.ts",
    isolationClass: "S",
    baseline: "seeded",
    storageProfile: "backups",
    resetScope: "per-suite",
    canaryProfile: "backup-confusion",
    pilotStatus: "validated",
    rolloutMode: "pilot-only",
    notes: "Backup-Sonderfall bleibt bis zu weiteren Piloten konservativ.",
  },
  {
    suitePath: "tests/e2e-browser/tour-week-form.browser.e2e.spec.ts",
    isolationClass: "A",
    baseline: "seeded",
    storageProfile: "none",
    resetScope: "per-test",
    canaryProfile: "week-plan-confusion",
    pilotStatus: "validated-with-hard-isolation",
    rolloutMode: "pilot-only",
    notes: "Komplexer Wochenplan-UI-Flow bleibt auf harter Isolation.",
  },
];

export function listRegisteredIsolationSuites(): TestIsolationRegistryEntry[] {
  return isolationRegistry;
}

export function getRegisteredIsolationSuite(testPath: string | null | undefined): TestIsolationRegistryEntry | null {
  const normalizedPath = normalizeTestPath(testPath);
  if (!normalizedPath) {
    return null;
  }

  return isolationRegistry.find((entry) => {
    const suitePath = normalizeTestPath(entry.suitePath);
    return normalizedPath === suitePath || normalizedPath.endsWith(`/${suitePath}`);
  }) ?? null;
}
