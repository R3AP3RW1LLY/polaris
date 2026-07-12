import { describe, expect, it, vi } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDbService, createSecretsStore, createSettingsService } from "@lodestar/core";
import type { EncryptionBackend } from "@lodestar/core";
import { createSettingsBridge } from "./settings-bridge.js";

function memSettings() {
  // createDbService opens + migrates an in-memory DB.
  const svc = createDbService(":memory:");
  return createSettingsService(svc.db);
}

function memSecrets() {
  const store = new Map<string, Buffer>();
  const backend: EncryptionBackend = {
    isEncryptionAvailable: () => true,
    encryptString: (s) => Buffer.from(Buffer.from(s).toString("base64")),
    decryptString: (b) => Buffer.from(b.toString(), "base64").toString(),
  };
  return createSecretsStore(backend, {
    write: (k, v) => store.set(k, v),
    read: (k) => store.get(k),
    remove: (k) => store.delete(k),
  });
}

describe("settings bridge", () => {
  it("returns DEFAULT_SETTINGS (all consent OFF) when settings are unavailable — never null in non-nullable fields", () => {
    const bridge = createSettingsBridge({
      settings: undefined,
      secrets: undefined,
      journalCandidates: () => [],
    });
    const snap = bridge.getSettings();
    expect(snap.ollamaEndpoint).toBe("http://127.0.0.1:11434");
    expect(snap.consentWing).toBe(false);
    expect(snap.consentCommunity).toBe(false);
    expect(snap.consentDiscord).toBe(false);
    expect(bridge.probeJournal()).toBe("not-configured");
  });

  it("round-trips a valid setting and rejects an invalid one over the wire envelope", () => {
    const bridge = createSettingsBridge({
      settings: memSettings(),
      secrets: memSecrets(),
      journalCandidates: () => [],
    });
    expect(bridge.setSetting({ key: "ollamaEndpoint", value: "http://127.0.0.1:11434" }).ok).toBe(
      true,
    );
    const bad = bridge.setSetting({ key: "ollamaEndpoint", value: "http://api.openai.com" });
    expect(bad.ok).toBe(false);
    expect(bridge.setSetting({ key: "totally-unknown", value: "x" } as never).ok).toBe(false);
  });

  it("fires the consent audit hook only on consent changes", () => {
    const onConsentChange = vi.fn();
    const bridge = createSettingsBridge({
      settings: memSettings(),
      secrets: memSecrets(),
      journalCandidates: () => [],
      onConsentChange,
    });
    bridge.setSetting({ key: "consentWing", value: true });
    bridge.setSetting({ key: "ollamaEndpoint", value: "http://127.0.0.1:11434" });
    expect(onConsentChange).toHaveBeenCalledExactlyOnceWith("consentWing", true);
  });

  it("secretsPresence exposes booleans only, never the secret values", () => {
    const secrets = memSecrets();
    secrets.set("inaraApiKey", "sk-LIVE-do-not-leak");
    const bridge = createSettingsBridge({
      settings: memSettings(),
      secrets,
      journalCandidates: () => [],
    });
    const presence = bridge.secretsPresence();
    expect(presence).toEqual({ inaraApiKey: true, capiTokens: false, discordWebhookUrl: false });
    expect(JSON.stringify(presence)).not.toContain("sk-LIVE");
  });

  it("autodetectJournal finds and persists a real journal directory, and probeJournal then reports ok", () => {
    const root = mkdtempSync(join(tmpdir(), "lodestar-bridge-"));
    try {
      const ed = join(root, "Saved Games", "Frontier Developments", "Elite Dangerous");
      mkdirSync(ed, { recursive: true });
      writeFileSync(join(ed, "Journal.2026-07-12T120000.01.log"), "{}\n");
      const bridge = createSettingsBridge({
        settings: memSettings(),
        secrets: memSecrets(),
        journalCandidates: () => [ed],
      });
      expect(bridge.autodetectJournal()).toEqual({ path: ed });
      expect(bridge.probeJournal()).toBe("ok");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("autodetectJournal returns null when nothing is found", () => {
    const bridge = createSettingsBridge({
      settings: memSettings(),
      secrets: memSecrets(),
      journalCandidates: () => ["/does/not/exist"],
    });
    expect(bridge.autodetectJournal()).toEqual({ path: null });
    expect(bridge.probeJournal()).toBe("not-configured");
  });
});
