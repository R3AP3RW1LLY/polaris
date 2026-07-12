import { beforeEach, describe, expect, it } from "vitest";
import { MIGRATIONS, applyMigrations, openDatabase } from "@lodestar/data";
import type { Db } from "@lodestar/data";
import { createSettingsService, DEFAULT_SETTINGS } from "./settings-service.js";

function freshDb(): Db {
  const db = openDatabase(":memory:");
  applyMigrations(db, MIGRATIONS);
  return db;
}

describe("settings service", () => {
  let db: Db;
  beforeEach(() => {
    db = freshDb();
  });

  it("returns defaults for unset keys — every consent flag is OFF", () => {
    const svc = createSettingsService(db);
    expect(svc.get("consentWing")).toEqual({ ok: true, value: false });
    expect(svc.get("consentCommunity")).toEqual({ ok: true, value: false });
    expect(svc.get("consentDiscord")).toEqual({ ok: true, value: false });
    expect(svc.get("ollamaEndpoint")).toEqual({ ok: true, value: DEFAULT_SETTINGS.ollamaEndpoint });
    expect(svc.get("journalPath")).toEqual({ ok: true, value: null });
  });

  it("round-trips a valid value", () => {
    const svc = createSettingsService(db);
    expect(svc.set("journalPath", "D:/games/journal").ok).toBe(true);
    expect(svc.get("journalPath")).toEqual({ ok: true, value: "D:/games/journal" });
  });

  it("rejects a UNC journalPath (SMB/NTLM-leak vector) but allows local absolute", () => {
    const svc = createSettingsService(db);
    expect(svc.set("journalPath", "\\\\attacker\\share").ok).toBe(false);
    expect(svc.set("journalPath", "//attacker/share").ok).toBe(false);
    expect(svc.set("journalPath", "relative/path").ok).toBe(false);
    expect(svc.set("journalPath", "C:\\Users\\me\\Saved Games").ok).toBe(true);
    expect(svc.set("journalPath", null).ok).toBe(true);
  });

  it("rejects a valid-JSON but wrong-shape stored value and falls back to default", () => {
    // A number is valid JSON but not a valid journalPath (string|null).
    db.prepare("INSERT INTO settings (key, value) VALUES ('journalPath', '42')").run();
    expect(createSettingsService(db).get("journalPath")).toEqual({ ok: true, value: null });
  });

  it("persists across a new service instance on the same db", () => {
    createSettingsService(db).set("consentWing", true);
    expect(createSettingsService(db).get("consentWing")).toEqual({ ok: true, value: true });
  });

  it("rejects a non-loopback Ollama endpoint (SSOT §5.3)", () => {
    const svc = createSettingsService(db);
    const bad = svc.set("ollamaEndpoint", "http://api.openai.com");
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error.code).toBe("settings.invalid-value");
    // The rejected value is not persisted.
    expect(svc.get("ollamaEndpoint")).toEqual({ ok: true, value: DEFAULT_SETTINGS.ollamaEndpoint });
  });

  it("accepts a loopback Ollama endpoint", () => {
    const svc = createSettingsService(db);
    expect(svc.set("ollamaEndpoint", "http://127.0.0.1:11434").ok).toBe(true);
  });

  it("rejects a wrong-typed value (boolean flag set to a string)", () => {
    const svc = createSettingsService(db);
    const bad = svc.set("consentWing", "yes" as unknown as boolean);
    expect(bad.ok).toBe(false);
  });

  it("rejects an unparseable/corrupt stored value and falls back to the default on get", () => {
    // Simulate corruption: write invalid JSON directly.
    db.prepare("INSERT INTO settings (key, value) VALUES ('consentWing', ?)").run("not json{");
    const svc = createSettingsService(db);
    // Corrupt data must not crash; it reads as the safe default (OFF).
    expect(svc.get("consentWing")).toEqual({ ok: true, value: false });
  });
});
