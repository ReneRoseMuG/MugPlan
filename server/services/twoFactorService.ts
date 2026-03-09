import crypto from "crypto";
import QRCode from "qrcode";
import { generateSecret, generateURI, verify } from "otplib";

const NON_PROD_FALLBACK_KEY = "dev-only-ft29-two-factor-key-change-me";
const CHALLENGE_TTL_MS = 10 * 60 * 1000;
const IV_BYTES = 12;

function getEncryptionKey(): Buffer {
  const raw = process.env.TWO_FACTOR_ENCRYPTION_KEY?.trim();
  if (raw) {
    return crypto.createHash("sha256").update(raw, "utf8").digest();
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("TWO_FACTOR_ENCRYPTION_KEY must be set in production");
  }
  return crypto.createHash("sha256").update(NON_PROD_FALLBACK_KEY, "utf8").digest();
}

function encodeBase64Url(input: Buffer): string {
  return input.toString("base64url");
}

function decodeBase64Url(input: string): Buffer {
  return Buffer.from(input, "base64url");
}

export type GeneratedTwoFactorSetup = {
  secret: string;
  manualEntryKey: string;
  otpAuthUri: string;
  qrCodeDataUrl: string;
};

export function generateTwoFactorSecret(): string {
  return generateSecret({ length: 20 });
}

export async function buildTwoFactorSetup(username: string, secret?: string): Promise<GeneratedTwoFactorSetup> {
  const manualEntryKey = secret ?? generateTwoFactorSecret();
  const otpAuthUri = generateURI({
    issuer: "MuGPlan",
    label: username,
    secret: manualEntryKey,
  });
  const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUri, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 256,
  });

  return {
    secret: manualEntryKey,
    manualEntryKey,
    otpAuthUri,
    qrCodeDataUrl,
  };
}

export async function verifyTwoFactorCode(secret: string, code: string): Promise<boolean> {
  const normalizedCode = code.trim();
  if (!/^\d{6}$/.test(normalizedCode)) {
    return false;
  }
  const result = await verify({
    secret,
    token: normalizedCode,
  });
  return result.valid;
}

export function encryptTwoFactorSecret(secret: string): string {
  const iv = crypto.randomBytes(IV_BYTES);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${encodeBase64Url(iv)}.${encodeBase64Url(tag)}.${encodeBase64Url(encrypted)}`;
}

export function decryptTwoFactorSecret(payload: string): string {
  const [ivRaw, tagRaw, encryptedRaw] = payload.split(".");
  if (!ivRaw || !tagRaw || !encryptedRaw) {
    throw new Error("Invalid two-factor secret payload");
  }
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, decodeBase64Url(ivRaw));
  decipher.setAuthTag(decodeBase64Url(tagRaw));
  const decrypted = Buffer.concat([decipher.update(decodeBase64Url(encryptedRaw)), decipher.final()]);
  return decrypted.toString("utf8");
}

export function isTwoFactorChallengeExpired(createdAt: number, now = Date.now()): boolean {
  return !Number.isFinite(createdAt) || createdAt <= 0 || now - createdAt > CHALLENGE_TTL_MS;
}
