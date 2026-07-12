/**
 * Secrets store (SSOT §4.6). Secrets (API keys, tokens, webhook URLs) are
 * encrypted at rest via the injected backend (Electron safeStorage in the app;
 * a test double in unit tests). When encryption is unavailable the store
 * REFUSES to save — there is no plaintext fallback, ever. The encrypted bytes
 * are persisted through an injected storage sink so this stays testable and
 * free of Electron/fs coupling.
 */

import type { DomainError, Result } from "@lodestar/shared";
import { domainError, err, ok } from "@lodestar/shared";

export type SecretKey = "inaraApiKey" | "capiTokens" | "discordWebhookUrl";

export interface EncryptionBackend {
  isEncryptionAvailable: () => boolean;
  encryptString: (plaintext: string) => Buffer;
  decryptString: (ciphertext: Buffer) => string;
}

export interface SecretStorage {
  write: (key: string, ciphertext: Buffer) => void;
  read: (key: string) => Buffer | undefined;
  remove: (key: string) => void;
}

export interface SecretsStore {
  get: (key: SecretKey) => Result<string | null, DomainError>;
  set: (key: SecretKey, value: string) => Result<void, DomainError>;
  delete: (key: SecretKey) => void;
}

export function createSecretsStore(
  backend: EncryptionBackend,
  storage: SecretStorage,
): SecretsStore {
  return {
    get(key: SecretKey): Result<string | null, DomainError> {
      const ciphertext = storage.read(key);
      if (ciphertext === undefined) return ok(null);
      try {
        return ok(backend.decryptString(ciphertext));
      } catch (cause) {
        return err(
          domainError(
            "secrets.decrypt-failed",
            `Could not decrypt secret "${key}"`,
            cause instanceof Error ? domainError("cause", cause.message) : undefined,
          ),
        );
      }
    },

    set(key: SecretKey, value: string): Result<void, DomainError> {
      if (!backend.isEncryptionAvailable()) {
        return err(
          domainError(
            "secrets.encryption-unavailable",
            "OS secret encryption is unavailable; refusing to store the secret in plaintext",
          ),
        );
      }
      storage.write(key, backend.encryptString(value));
      return ok(undefined);
    },

    delete(key: SecretKey): void {
      storage.remove(key);
    },
  };
}
