/**
 * Electron-side secret persistence (SSOT §4.6). Provides the EncryptionBackend
 * (Electron safeStorage — DPAPI on Windows, user-account-scoped: protects
 * against other users and disk theft, NOT same-user malware) and a file-based
 * SecretStorage sink under the profile's secrets dir. Encrypted blobs only —
 * the plaintext never touches disk; if safeStorage is unavailable the core
 * SecretsStore refuses to write (no plaintext fallback).
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { safeStorage } from "electron";
import type { EncryptionBackend, SecretStorage } from "@lodestar/core";

export function safeStorageBackend(): EncryptionBackend {
  return {
    isEncryptionAvailable: () => safeStorage.isEncryptionAvailable(),
    encryptString: (plaintext) => safeStorage.encryptString(plaintext),
    decryptString: (ciphertext) => safeStorage.decryptString(ciphertext),
  };
}

/** Keys are hashed to a fixed-length filename so nothing can traverse the dir. */
function fileFor(dir: string, key: string): string {
  const safe = createHash("sha256").update(key, "utf8").digest("hex");
  return join(dir, `${safe}.bin`);
}

export function fileSecretStorage(dir: string): SecretStorage {
  mkdirSync(dir, { recursive: true });
  return {
    write: (key, ciphertext) => {
      writeFileSync(fileFor(dir, key), ciphertext);
    },
    read: (key) => {
      const path = fileFor(dir, key);
      return existsSync(path) ? readFileSync(path) : undefined;
    },
    remove: (key) => {
      rmSync(fileFor(dir, key), { force: true });
    },
  };
}
