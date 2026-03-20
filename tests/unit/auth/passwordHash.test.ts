/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Passwoerter werden mit dem erwarteten Format gehasht.
 * - Korrekte und falsche Passwoerter werden sauber verifiziert.
 *
 * Fehlerfaelle:
 * - Hash-Format oder Verifikation verhalten sich inkonsistent.
 *
 * Ziel:
 * Die Grundfunktionen des Passwort-Hashings absichern.
 */
import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../../../server/security/passwordHash";

describe("passwordHash", () => {
  it("hashes and verifies a password", async () => {
    const plain = "very-secure-password";
    const encoded = await hashPassword(plain);

    expect(encoded.startsWith("scrypt$")).toBe(true);
    await expect(verifyPassword(plain, encoded)).resolves.toBe(true);
    await expect(verifyPassword("wrong-password", encoded)).resolves.toBe(false);
  });
});
