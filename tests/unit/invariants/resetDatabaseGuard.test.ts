import { afterEach, describe, expect, it, vi } from "vitest";

const createConnectionMock = vi.fn();
const dotenvConfigMock = vi.fn();

vi.mock("mysql2/promise", () => ({
  default: {
    createConnection: createConnectionMock,
  },
}));

vi.mock("dotenv", () => ({
  default: {
    config: dotenvConfigMock,
  },
}));

describe("PKG-02 Invariant: resetDatabase guardrails", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("throws when NODE_ENV is not test", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("MYSQL_DATABASE_URL", "mysql://user:pw@localhost:3306/mugplan_test");

    await expect(import("../../helpers/resetDatabase")).rejects.toThrow(
      "resetDatabase darf nur im Testmodus laufen.",
    );
    expect(createConnectionMock).not.toHaveBeenCalled();
  });

  it("throws when MYSQL_DATABASE_URL is not a test database", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("MYSQL_DATABASE_URL", "mysql://user:pw@localhost:3306/mugplan_prod");

    await expect(import("../../helpers/resetDatabase")).rejects.toThrow(
      "resetDatabase verweigert",
    );
    expect(createConnectionMock).not.toHaveBeenCalled();
  });

  it("does not execute database actions when environment is invalid", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("MYSQL_DATABASE_URL", "mysql://user:pw@localhost:3306/mugplan_prod");

    await expect(import("../../helpers/resetDatabase")).rejects.toThrow();
    expect(dotenvConfigMock).toHaveBeenCalledWith({ path: ".env.test" });
    expect(createConnectionMock).not.toHaveBeenCalled();
  });
});
