/**
 * Test Scope:
 *
 * Feature: FT07 - Automatischer Kalenderbackup
 * Use Case: UC07 - Scheduler-Lauf bei deaktivierten Backups
 *
 * Abgedeckte Regeln:
 * - Scheduler liest den globalen Wert `backup_enabled`.
 * - Bei `backup_enabled=false` wird ein `skipped`-Log mit Grund `disabled` geschrieben.
 * - Bei aktiviertem Schalter wird kein Disabled-Skipped-Log erzeugt.
 *
 * Fehlerfaelle:
 * - Deaktivierter Scheduler-Status ohne nachvollziehbaren Logeintrag.
 *
 * Ziel:
 * Sicherstellen, dass der Schalter deterministisch in das Scheduler-Verhalten eingreift.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../server/services/userSettingsService", () => ({
  getGlobalSettingValue: vi.fn(),
}));

vi.mock("../../../server/services/backupService", () => ({
  createSkippedBackupLog: vi.fn(),
}));

vi.mock("../../../server/repositories/backupRepository", () => ({
  createBackupLogEntry: vi.fn(),
}));

import { getGlobalSettingValue } from "../../../server/services/userSettingsService";
import { createSkippedBackupLog } from "../../../server/services/backupService";
import { runBackupSchedulerTick } from "../../../server/services/backupScheduler";

describe("FT07 service: backup scheduler disabled handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes skipped disabled log when backup_enabled is false", async () => {
    vi.mocked(getGlobalSettingValue).mockResolvedValue(false);

    await runBackupSchedulerTick();

    expect(getGlobalSettingValue).toHaveBeenCalledWith("backup_enabled");
    expect(createSkippedBackupLog).toHaveBeenCalledWith("disabled");
  });

  it("does not write disabled skipped log when backup_enabled is true", async () => {
    vi.mocked(getGlobalSettingValue).mockResolvedValue(true);

    await runBackupSchedulerTick();

    expect(createSkippedBackupLog).not.toHaveBeenCalled();
  });
});

