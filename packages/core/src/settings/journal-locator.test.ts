import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { locateJournalDir, validateJournalDir } from "./journal-locator.js";

describe("journal locator", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "lodestar-journal-"));
  });
  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("validates a directory that contains a Journal.*.log file", () => {
    writeFileSync(join(root, "Journal.2026-07-12T120000.01.log"), "{}\n");
    expect(validateJournalDir(root)).toEqual({ ok: true, value: root });
  });

  it("rejects a directory with no journal files", () => {
    const r = validateJournalDir(root);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("journal.not-found");
  });

  it("rejects a non-existent directory", () => {
    const r = validateJournalDir(join(root, "nope"));
    expect(r.ok).toBe(false);
  });

  it("does not accept unrelated .log files as a journal dir", () => {
    writeFileSync(join(root, "debug.log"), "x\n");
    expect(validateJournalDir(root).ok).toBe(false);
  });

  it("locateJournalDir probes candidate paths and returns the first valid one", () => {
    const ed = join(root, "Saved Games", "Frontier Developments", "Elite Dangerous");
    mkdirSync(ed, { recursive: true });
    writeFileSync(join(ed, "Journal.2026-07-12T120000.01.log"), "{}\n");
    const found = locateJournalDir([join(root, "nowhere"), ed]);
    expect(found).toEqual({ ok: true, value: ed });
  });

  it("locateJournalDir returns not-found when no candidate is valid", () => {
    const r = locateJournalDir([join(root, "a"), join(root, "b")]);
    expect(r.ok).toBe(false);
  });
});
