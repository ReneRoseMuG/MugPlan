import { applyTestSystemSeed, resetDatabase } from "./resetDatabase";
import {
  type DatabaseCanaryProfile,
  type StorageCanaryProfile,
  injectDatabaseCanaries,
  injectStorageCanaries,
} from "./testIsolationCanaries";
import { assertCombinedTestFingerprint } from "./testIsolationFingerprint";
import { resetIsolatedTestStorage } from "./testStorageIsolation";
import { resetTestDataFactoryState } from "./testDataFactory";

export type TestIsolationClass = "A" | "B" | "C" | "S";
export type TestIsolationBaseline = "core" | "seeded";
export type TestIsolationStorageProfile = "none" | "uploads" | "backups" | "both";
export type TestIsolationMode = "legacy-reset" | "candidate-baseline";
export type TestIsolationResetScope = "per-test" | "per-suite";

export type TestIsolationMetadata = {
  isolationClass: TestIsolationClass;
  baseline: TestIsolationBaseline;
  storageProfile: TestIsolationStorageProfile;
  canaryProfile?: DatabaseCanaryProfile | StorageCanaryProfile;
  requiresNegativeProof?: boolean;
};

type IsolationExecutionConfig = {
  mode: TestIsolationMode;
  targetSuite: string | null;
  baseline: TestIsolationBaseline;
  storageProfile: TestIsolationStorageProfile;
  canaryProfile: DatabaseCanaryProfile | StorageCanaryProfile | null;
  resetScope: TestIsolationResetScope;
  verbose: boolean;
};

const preparedCandidateSuites = new Set<string>();
const databaseCanaryProfiles = new Set<DatabaseCanaryProfile>([
  "project-list-confusion",
  "week-plan-confusion",
  "seed-shadow",
]);
const storageCanaryProfiles = new Set<StorageCanaryProfile>([
  "attachment-confusion",
  "backup-confusion",
]);

export function defineTestIsolation(metadata: TestIsolationMetadata) {
  return metadata;
}

export function normalizeTestPath(testPath: string | null | undefined) {
  return (testPath ?? "").replaceAll("\\", "/");
}

export function readIsolationExecutionConfig(): IsolationExecutionConfig {
  const mode = process.env.TEST_ISOLATION_MODE === "candidate-baseline"
    ? "candidate-baseline"
    : "legacy-reset";
  const targetSuite = process.env.TEST_ISOLATION_TARGET_SUITE
    ? normalizeTestPath(process.env.TEST_ISOLATION_TARGET_SUITE)
    : null;
  const baseline = process.env.TEST_ISOLATION_BASELINE === "seeded" ? "seeded" : "core";
  const storageProfile = parseStorageProfile(process.env.TEST_ISOLATION_STORAGE_PROFILE);
  const canaryProfile = parseCanaryProfile(process.env.TEST_ISOLATION_CANARY_PROFILE);
  const resetScope = process.env.TEST_ISOLATION_RESET_SCOPE === "per-test" ? "per-test" : "per-suite";
  const verbose = process.env.TEST_ISOLATION_VERBOSE === "1";

  return {
    mode,
    targetSuite,
    baseline,
    storageProfile,
    canaryProfile,
    resetScope,
    verbose,
  };
}

export function resetIsolationExecutionState() {
  preparedCandidateSuites.clear();
}

export function shouldInjectConfiguredCanaries() {
  return readIsolationExecutionConfig().canaryProfile !== null;
}

export async function assertIsolationFingerprintForConfiguredRun(suitePath: string) {
  const config = readIsolationExecutionConfig();
  await assertFingerprintWithLogging(config, normalizeTestPath(suitePath));
}

export async function injectConfiguredCanariesForRun() {
  const config = readIsolationExecutionConfig();
  await injectConfiguredCanaries(config);
}

export function shouldUseCandidateBaseline(testPath: string | null | undefined) {
  const config = readIsolationExecutionConfig();
  if (config.mode !== "candidate-baseline" || !config.targetSuite) {
    return false;
  }

  return matchesTargetSuite(normalizeTestPath(testPath), config.targetSuite);
}

export async function prepareIntegrationOrE2eIsolation(testPath: string | null | undefined) {
  const normalizedPath = normalizeTestPath(testPath);
  const config = readIsolationExecutionConfig();
  const isTargetSuite = !!config.targetSuite && matchesTargetSuite(normalizedPath, config.targetSuite);

  if (config.mode === "candidate-baseline" && isTargetSuite) {
    if (config.resetScope === "per-suite" && preparedCandidateSuites.has(normalizedPath)) {
      return;
    }

    await initializeBaseline(config, normalizedPath);
    if (config.resetScope === "per-suite") {
      preparedCandidateSuites.add(normalizedPath);
    }
    return;
  }

  await resetIsolatedTestStorage();
  resetTestDataFactoryState();
  await resetDatabase();

  if (isTargetSuite) {
    await applyConfiguredBaseline(config, normalizedPath);
  }
}

function parseStorageProfile(rawProfile: string | undefined): TestIsolationStorageProfile {
  if (rawProfile === "uploads" || rawProfile === "backups" || rawProfile === "both") {
    return rawProfile;
  }

  return "none";
}

function parseCanaryProfile(rawProfile: string | undefined) {
  if (!rawProfile) {
    return null;
  }

  if (databaseCanaryProfiles.has(rawProfile as DatabaseCanaryProfile)) {
    return rawProfile as DatabaseCanaryProfile;
  }

  if (storageCanaryProfiles.has(rawProfile as StorageCanaryProfile)) {
    return rawProfile as StorageCanaryProfile;
  }

  return null;
}

function matchesTargetSuite(currentPath: string, targetSuite: string) {
  return currentPath === targetSuite || currentPath.endsWith(`/${targetSuite}`);
}

async function initializeBaseline(config: IsolationExecutionConfig, suitePath: string) {
  await resetIsolatedTestStorage();
  resetTestDataFactoryState();
  await resetDatabase();
  await applyConfiguredBaseline(config, suitePath);
}

async function applyConfiguredBaseline(config: IsolationExecutionConfig, suitePath: string) {
  if (config.baseline === "seeded") {
    await applyTestSystemSeed();
  }

  await assertFingerprintWithLogging(config, suitePath);
  await injectConfiguredCanaries(config);
}

async function assertFingerprintWithLogging(config: IsolationExecutionConfig, suitePath: string) {
  try {
    await assertCombinedTestFingerprint(config.baseline, config.storageProfile);
    logIsolationEvent(config, `fingerprint:passed suite=${suitePath} mode=${config.mode}`);
  } catch (error) {
    logIsolationEvent(config, `fingerprint:failed suite=${suitePath} mode=${config.mode}`);
    throw error;
  }
}

async function injectConfiguredCanaries(config: IsolationExecutionConfig) {
  if (!config.canaryProfile) {
    return;
  }

  const token = process.env.TEST_ISOLATION_RUN_TOKEN ?? "pilot";

  if (databaseCanaryProfiles.has(config.canaryProfile as DatabaseCanaryProfile)) {
    await injectDatabaseCanaries(config.canaryProfile as DatabaseCanaryProfile, token);
    logIsolationEvent(config, `canary:db profile=${config.canaryProfile} token=${token}`);
  }

  if (storageCanaryProfiles.has(config.canaryProfile as StorageCanaryProfile)) {
    await injectStorageCanaries(config.canaryProfile as StorageCanaryProfile, token);
    logIsolationEvent(config, `canary:storage profile=${config.canaryProfile} token=${token}`);
  }
}

function logIsolationEvent(config: IsolationExecutionConfig, message: string) {
  if (!config.verbose) {
    return;
  }

  console.log(`[test-isolation] ${message}`);
}
