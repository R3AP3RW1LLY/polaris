/**
 * Compliance scanners (SSOT §2, §5.4, Step 0.11). Pure content scanners plus a
 * repo file walker. These are the NON-lint enforcement layer: they run in CI
 * over the real source and cannot be silenced by an inline eslint-disable. Each
 * scanner is exercised by a self-test (a violating fixture must be caught) and
 * run over the real tree (which must be clean).
 *
 * Source scanners tokenize first (comment-aware) so documentation examples of
 * REJECTED patterns don't self-trip, and host extraction reuses the WHATWG URL
 * parser so userinfo/parser-differential tricks are handled exactly as the
 * runtime gateway handles them.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

export interface Finding {
  readonly file: string;
  readonly line: number;
  readonly match: string;
}

// ── Tokenizer ────────────────────────────────────────────────────────────────
// Splits source into (code with comments blanked to spaces) + (string literal
// contents with their line numbers). Handles // and /* */ comments and ' " `
// string delimiters with backslash escapes.
interface Tokenized {
  /** Comments removed, string CONTENTS blanked (for detecting code constructs). */
  readonly code: string;
  /** Comments removed, string literals KEPT (for detecting import specifiers). */
  readonly codeKept: string;
  readonly strings: { readonly value: string; readonly line: number }[];
}

// Before these characters, a `/` begins a regex literal (not division).
const REGEX_PRECEDERS = new Set("(,=:[!&|?{};+-*%<>~^".split(""));

export function tokenize(content: string): Tokenized {
  let code = "";
  let codeKept = "";
  const strings: { value: string; line: number }[] = [];
  let i = 0;
  let line = 1;
  let prevSig = ""; // last non-whitespace emitted char (for regex/division context)
  const n = content.length;
  const emit = (s: string): void => {
    code += s;
    codeKept += s;
  };
  while (i < n) {
    const c = content[i];
    const next = content[i + 1];
    if (c === "\n") {
      emit("\n");
      line++;
      prevSig = "\n";
      i++;
    } else if (c === "/" && next === "/") {
      while (i < n && content[i] !== "\n") i++;
    } else if (c === "/" && next === "*") {
      i += 2;
      while (i < n && !(content[i] === "*" && content[i + 1] === "/")) {
        if (content[i] === "\n") {
          emit("\n");
          line++;
        }
        i++;
      }
      i += 2;
    } else if (c === "/" && (prevSig === "" || prevSig === "\n" || REGEX_PRECEDERS.has(prevSig))) {
      // Regex literal — consume it (respecting escapes and char classes) and
      // blank it, so its pattern source cannot self-trip the scanners.
      i++;
      let inClass = false;
      while (i < n) {
        const rc = content[i];
        if (rc === "\\") {
          i += 2;
          continue;
        }
        if (rc === "[") inClass = true;
        else if (rc === "]") inClass = false;
        else if (rc === "/" && !inClass) {
          i++;
          break;
        } else if (rc === "\n") line++;
        i++;
      }
      while (i < n && /[a-z]/i.test(content[i] ?? "")) i++; // flags
      emit(" ");
      prevSig = "x";
    } else if (c === '"' || c === "'" || c === "`") {
      const quote = c;
      const startLine = line;
      i++;
      let value = "";
      while (i < n && content[i] !== quote) {
        if (content[i] === "\\") {
          value += (content[i] ?? "") + (content[i + 1] ?? "");
          i += 2;
          continue;
        }
        if (content[i] === "\n") line++;
        value += content[i] ?? "";
        i++;
      }
      i++; // closing quote
      strings.push({ value, line: startLine });
      code += " ";
      codeKept += quote + value + quote;
      prevSig = "x";
    } else {
      emit(c ?? "");
      if (c !== undefined && c.trim() !== "") prevSig = c;
      i++;
    }
  }
  return { code, codeKept, strings };
}

// ── AI/ML vendor SDKs — must never appear in any lockfile or manifest ────────
const AI_EXACT = new Set([
  "openai",
  "ai", // Vercel AI SDK
  "cohere-ai",
  "replicate",
  "groq-sdk",
  "together-ai",
  "langchain",
  "llamaindex",
  "@google/generative-ai",
  "@azure/openai",
]);
const AI_SCOPE_PREFIXES = [
  "@anthropic-ai/",
  "@ai-sdk/",
  "@langchain/",
  "@mistralai/",
  "@aws-sdk/client-bedrock",
  "@google-cloud/aiplatform",
  "@huggingface/inference",
];
// Substring vendor tokens — flags renamed/wrapped SDKs (@ai-sdk/anthropic,
// openai-node, foo-cohere-client). We should have ZERO of any of these.
const AI_KEYWORDS =
  /(openai|anthropic|cohere|mistral|bedrock|groq|generative-ai|llamaindex|langchain)/i;
// pnpm-lock v9 lists every resolved package (direct + transitive) as a line
// starting `  name@version:` (optionally quoted, optionally scoped).
const LOCK_PKG_NAME = /^\s+'?((?:@[a-z0-9-]+\/)?[a-z0-9][a-z0-9._-]*)@[\d^~*<>=]/gm;

export function findAiVendorDeps(lockContent: string): string[] {
  const hits = new Set<string>();
  for (const m of lockContent.matchAll(LOCK_PKG_NAME)) {
    const name = m[1];
    if (name === undefined) continue;
    if (
      AI_EXACT.has(name) ||
      AI_SCOPE_PREFIXES.some((p) => name.startsWith(p)) ||
      AI_KEYWORDS.test(name)
    ) {
      hits.add(name);
    }
  }
  return [...hits];
}

// ── Disallowed hostname literals in product source ───────────────────────────
const URL_IN_STRING = /https?:\/\/[^\s"'`]+/gi;

function isLoopbackHost(host: string): boolean {
  return host === "::1" || host === "[::1]" || /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host);
}

export function findDisallowedHostLiterals(
  content: string,
  allowedHosts: ReadonlySet<string>,
): Finding[] {
  const findings: Finding[] = [];
  for (const str of tokenize(content).strings) {
    for (const m of str.value.matchAll(URL_IN_STRING)) {
      let host: string;
      try {
        host = new URL(m[0]).hostname.toLowerCase();
      } catch {
        continue;
      }
      if (host === "" || isLoopbackHost(host) || allowedHosts.has(host)) continue;
      findings.push({ file: "", line: str.line, match: host });
    }
  }
  return findings;
}

// Import/require specifiers need the string kept; code constructs need strings
// blanked (so `fetch` in a doc string isn't a hit).
const IMPORT_NET_PATTERN =
  /(?:from\s+["'](node:(?:net|tls|dgram|http|https))["']|require\(\s*["'](node:(?:net|tls|dgram|http|https)|axios|undici|node-fetch)["']\s*\)|import\(\s*["'](axios|undici|node-fetch)["']\s*\))/g;
const CODE_NET_PATTERN =
  /(\bnew\s+WebSocket\b|(?<![.\w])fetch\s*\(|\b(?:globalThis|window)\.fetch\b|\beval\s*\(|\bnew\s+Function\b)/g;

export function findRawSocketUsage(content: string): Finding[] {
  const findings: Finding[] = [];
  const { code, codeKept } = tokenize(content);
  codeKept.split(/\r?\n/).forEach((line, i) => {
    for (const m of line.matchAll(IMPORT_NET_PATTERN)) {
      findings.push({ file: "", line: i + 1, match: (m[1] ?? m[2] ?? m[3] ?? m[0]).trim() });
    }
  });
  code.split(/\r?\n/).forEach((line, i) => {
    for (const m of line.matchAll(CODE_NET_PATTERN)) {
      findings.push({ file: "", line: i + 1, match: m[0].trim() });
    }
  });
  return findings;
}

// ── Secret-shaped literals (scan raw — a secret in a comment still leaks) ─────
const SINGLE_LINE_SECRETS: readonly RegExp[] = [
  /\bsk-[A-Za-z0-9_-]{20,}\b/g, // OpenAI/Inara-style API keys
  /\bghp_[A-Za-z0-9]{36}\b/g, // GitHub personal access tokens
  /\bAKIA[0-9A-Z]{16}\b/g, // AWS access key IDs
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g, // Slack tokens
  // Live webhook URLs — a REAL token is long; short test fixtures don't match.
  /https:\/\/discord(?:app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]{20,}/g,
];
// Private keys span lines — match the whole BEGIN…END block over full content.
const PRIVATE_KEY_BLOCK =
  /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----[\s\S]{1,8000}?-----END (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/g;

export function findSecretLiterals(content: string): Finding[] {
  const findings: Finding[] = [];
  content.split(/\r?\n/).forEach((line, i) => {
    for (const pattern of SINGLE_LINE_SECRETS) {
      for (const m of line.matchAll(pattern)) {
        findings.push({ file: "", line: i + 1, match: m[0] });
      }
    }
  });
  for (const m of content.matchAll(PRIVATE_KEY_BLOCK)) {
    const line = content.slice(0, m.index).split("\n").length;
    findings.push({ file: "", line, match: m[0] });
  }
  return findings;
}

// ── Skipped/focused tests (a weakening of the suite itself) ───────────────────
const SKIPPED_TEST_PATTERN =
  /\b(?:it|test|describe)\.(?:skip|only)\s*\(|\b(?:xit|xdescribe|fit|fdescribe)\s*\(/g;

export function findSkippedTests(content: string): Finding[] {
  const findings: Finding[] = [];
  // Blanked-string code: `it.skip(` in a fixture STRING must not self-trip.
  const lines = tokenize(content).code.split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const m of line.matchAll(SKIPPED_TEST_PATTERN)) {
      findings.push({ file: "", line: i + 1, match: m[0].trim() });
    }
  });
  return findings;
}

// ── Repo walking ─────────────────────────────────────────────────────────────
const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  "out",
  "build",
  "coverage",
  ".git",
  ".turbo",
  ".venv",
  "__pycache__",
  ".lodestar-data",
  ".electron-cache",
]);

export interface WalkOptions {
  readonly extensions: ReadonlySet<string>;
  readonly includeTests?: boolean;
  /** Repo-relative posix path prefixes to skip (segment-anchored, not substring). */
  readonly skipPaths?: readonly string[];
}

function extOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot);
}

function isTestFile(path: string): boolean {
  return /\.(test|spec)\.(ts|tsx|js|mjs|cjs)$/.test(path);
}

function isSkipped(rel: string, skip: readonly string[]): boolean {
  // Segment-anchored: "a/b" skips "a/b" and "a/b/..." but NOT "xa/b" or "za/b".
  return skip.some((s) => rel === s || rel.startsWith(`${s}/`));
}

/** Walks the tree, applying `scan` to each eligible file's content. */
export function scanTree(
  root: string,
  options: WalkOptions,
  scan: (content: string) => Finding[],
): Finding[] {
  const results: Finding[] = [];
  const skip = options.skipPaths ?? [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        if (!SKIP_DIRS.has(entry)) walk(full);
        continue;
      }
      if (!options.extensions.has(extOf(entry))) continue;
      if (options.includeTests !== true && isTestFile(full)) continue;
      const rel = relative(root, full).split(sep).join("/");
      if (isSkipped(rel, skip)) continue;
      for (const finding of scan(readFileSync(full, "utf8"))) {
        results.push({ ...finding, file: rel });
      }
    }
  };
  walk(root);
  return results;
}
