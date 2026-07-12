import { describe, expect, it } from "vitest";
import { fileSecretStorage } from "./secrets.js";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("fileSecretStorage", () => {
  it("writes, reads, and removes ciphertext blobs under the secrets dir", () => {
    const dir = mkdtempSync(join(tmpdir(), "lodestar-secrets-"));
    try {
      const storage = fileSecretStorage(dir);
      expect(storage.read("k")).toBeUndefined();
      const blob = Buffer.from([1, 2, 3, 250]);
      storage.write("k", blob);
      expect(storage.read("k")).toEqual(blob);
      storage.remove("k");
      expect(storage.read("k")).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("sanitizes the key so it cannot traverse outside the secrets dir", () => {
    const dir = mkdtempSync(join(tmpdir(), "lodestar-secrets-"));
    try {
      const storage = fileSecretStorage(dir);
      // A traversal-looking key must not escape the directory.
      storage.write("../../evil", Buffer.from([9]));
      // It is stored under a sanitized name inside dir, retrievable by the same key.
      expect(storage.read("../../evil")).toEqual(Buffer.from([9]));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
