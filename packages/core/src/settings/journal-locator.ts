/**
 * Journal directory locator (SSOT §Step 0.7). Validates that a directory holds
 * the game's Player Journal (`Journal.*.log`), and probes the standard install
 * path. Returns a typed not-found rather than throwing, so the UI can prompt
 * for manual configuration.
 */

import { existsSync, readdirSync, statSync } from "node:fs";
import type { DomainError, Result } from "@lodestar/shared";
import { domainError, err, ok } from "@lodestar/shared";

const JOURNAL_FILE = /^Journal\..*\.log$/;

export function validateJournalDir(dir: string): Result<string, DomainError> {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) {
    return err(domainError("journal.not-found", `Not a directory: ${dir}`));
  }
  const hasJournal = readdirSync(dir).some((name) => JOURNAL_FILE.test(name));
  if (!hasJournal) {
    return err(domainError("journal.not-found", `No Journal.*.log files in ${dir}`));
  }
  return ok(dir);
}

/** Probes candidate directories in order; returns the first that validates. */
export function locateJournalDir(candidates: readonly string[]): Result<string, DomainError> {
  for (const candidate of candidates) {
    const result = validateJournalDir(candidate);
    if (result.ok) return result;
  }
  return err(domainError("journal.not-found", "No journal directory found among candidates"));
}
