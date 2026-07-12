import { describe, expect, it } from "vitest";
import { createSecretsStore } from "./secrets.js";
import type { EncryptionBackend } from "./secrets.js";

/**
 * In-memory reversible "encryption" standing in for Electron safeStorage. Uses
 * base64 so the stored bytes are opaque (do not contain the plaintext), like
 * real encrypted output.
 */
function fakeBackend(available = true): EncryptionBackend {
  return {
    isEncryptionAvailable: () => available,
    encryptString: (s) => Buffer.from(Buffer.from(s, "utf8").toString("base64"), "utf8"),
    decryptString: (b) => Buffer.from(b.toString("utf8"), "base64").toString("utf8"),
  };
}

describe("secrets store", () => {
  it("stores ciphertext (never plaintext) and round-trips on read", () => {
    const written = new Map<string, Buffer>();
    const store = createSecretsStore(fakeBackend(), {
      write: (k, v) => written.set(k, v),
      read: (k) => written.get(k),
      remove: (k) => written.delete(k),
    });
    const set = store.set("inaraApiKey", "sk-LIVE-123");
    expect(set.ok).toBe(true);
    // What lands in storage is ciphertext, not the raw secret.
    const stored = written.get("inaraApiKey");
    expect(stored?.toString("utf8")).not.toContain("sk-LIVE-123");
    const got = store.get("inaraApiKey");
    expect(got).toEqual({ ok: true, value: "sk-LIVE-123" });
  });

  it("refuses to store (no plaintext fallback) when encryption is unavailable", () => {
    const written = new Map<string, Buffer>();
    const store = createSecretsStore(fakeBackend(false), {
      write: (k, v) => written.set(k, v),
      read: (k) => written.get(k),
      remove: (k) => written.delete(k),
    });
    const set = store.set("inaraApiKey", "sk-LIVE-123");
    expect(set.ok).toBe(false);
    if (!set.ok) expect(set.error.code).toBe("secrets.encryption-unavailable");
    expect(written.size).toBe(0); // nothing written, not even encrypted
  });

  it("returns null for a missing secret and supports delete", () => {
    const written = new Map<string, Buffer>();
    const store = createSecretsStore(fakeBackend(), {
      write: (k, v) => written.set(k, v),
      read: (k) => written.get(k),
      remove: (k) => written.delete(k),
    });
    expect(store.get("discordWebhookUrl")).toEqual({ ok: true, value: null });
    store.set("discordWebhookUrl", "https://discord.com/api/webhooks/1/a");
    store.delete("discordWebhookUrl");
    expect(store.get("discordWebhookUrl")).toEqual({ ok: true, value: null });
  });
});
