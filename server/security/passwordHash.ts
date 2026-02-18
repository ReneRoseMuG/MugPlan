import crypto from "node:crypto";

const SCRYPT_KEYLEN = 64;
const SCRYPT_SALT_BYTES = 16;

function scryptAsync(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, SCRYPT_KEYLEN, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(Buffer.from(derivedKey));
    });
  });
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = crypto.randomBytes(SCRYPT_SALT_BYTES);
  const hash = await scryptAsync(plain, salt);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPassword(plain: string, encoded: string): Promise<boolean> {
  const [algorithm, saltB64, hashB64] = encoded.split("$");
  if (algorithm !== "scrypt" || !saltB64 || !hashB64) {
    return false;
  }

  const salt = Buffer.from(saltB64, "base64");
  const storedHash = Buffer.from(hashB64, "base64");
  if (storedHash.length !== SCRYPT_KEYLEN) {
    return false;
  }

  const computedHash = await scryptAsync(plain, salt);
  return crypto.timingSafeEqual(storedHash, computedHash);
}
