import { describe, expect, it } from "vitest";
import {
  findAiVendorDeps,
  findDisallowedHostLiterals,
  findRawSocketUsage,
  findSecretLiterals,
  findSkippedTests,
  tokenize,
} from "./scanners.js";

describe("findAiVendorDeps (self-test)", () => {
  it("flags classic AND @ai-sdk / bare-ai / langchain vendor packages (direct or transitive)", () => {
    const fixture = [
      "  openai@4.20.0:",
      "  '@anthropic-ai/sdk@0.30.0':",
      "  '@ai-sdk/anthropic@1.0.0':", // the exact case the old pattern missed
      "  '@ai-sdk/google@1.0.0':",
      "  ai@4.3.19:", // bare Vercel AI SDK
      "  '@google/generative-ai@0.21.0':",
      "  cohere-ai@7.0.0:",
      "  '@aws-sdk/client-bedrock-runtime@3.0.0':",
      "  '@langchain/openai@0.3.0':",
    ].join("\n");
    const hits = findAiVendorDeps(fixture);
    expect(hits).toContain("openai");
    expect(hits).toContain("ai");
    expect(hits).toContain("@ai-sdk/anthropic");
    expect(hits).toContain("@ai-sdk/google");
    expect(hits).toContain("cohere-ai");
    expect(hits.some((h) => h.startsWith("@aws-sdk/client-bedrock"))).toBe(true);
  });

  it("does not flag ordinary packages", () => {
    const fixture = "  react@19.2.0:\n  vitest@4.0.0:\n  better-sqlite3@12.11.1:\n  pino@9.13.1:";
    expect(findAiVendorDeps(fixture)).toEqual([]);
  });
});

describe("findDisallowedHostLiterals (self-test)", () => {
  const allow = new Set(["www.edsm.net", "discord.com"]);

  it("flags a non-allowlisted host in a URL literal", () => {
    const findings = findDisallowedHostLiterals(
      'const u = "https://api.openai.com/v1/chat";',
      allow,
    );
    expect(findings.length).toBe(1);
    expect(findings[0]?.match).toBe("api.openai.com");
  });

  it("extracts the REAL host from a userinfo-obfuscated literal (not the allowlisted decoy)", () => {
    const findings = findDisallowedHostLiterals(
      'const u = "https://www.edsm.net@evil-exfil.com/path";',
      allow,
    );
    expect(findings.map((f) => f.match)).toEqual(["evil-exfil.com"]);
  });

  it("ignores URLs that appear only in comments (documentation of rejected patterns)", () => {
    const content = "// see http://api.openai.com for the banned example\nconst x = 1;";
    expect(findDisallowedHostLiterals(content, allow)).toEqual([]);
  });

  it("does not flag allowlisted or loopback hosts", () => {
    const content = [
      'const a = "https://www.edsm.net/api";',
      'const b = "http://127.0.0.1:11434";',
    ].join("\n");
    expect(findDisallowedHostLiterals(content, allow)).toEqual([]);
  });
});

describe("findRawSocketUsage (self-test)", () => {
  it("flags raw socket imports, WebSocket, bare fetch, globalThis.fetch, and eval", () => {
    const content = [
      'import net from "node:net";',
      'const tls = require("node:tls");',
      'const ax = await import("axios");',
      "const ws = new WebSocket('wss://x');",
      'const r = fetch("https://evil");',
      "const g = globalThis.fetch;",
      "eval('fetch(1)');",
    ].join("\n");
    const matches = findRawSocketUsage(content).map((f) => f.match);
    expect(matches).toContain("node:net");
    expect(matches).toContain("axios");
    expect(matches.some((m) => m.includes("WebSocket"))).toBe(true);
    expect(matches.some((m) => m.includes("fetch"))).toBe(true);
    expect(matches.some((m) => m.includes("eval"))).toBe(true);
  });

  it("does not flag fetch mentioned only in a comment or string", () => {
    expect(findRawSocketUsage("// do not call fetch(here)\nconst x = 1;")).toEqual([]);
    expect(findRawSocketUsage('const doc = "call fetch() via the gateway";')).toEqual([]);
  });
});

describe("findSecretLiterals (self-test)", () => {
  it("flags API keys, GitHub/AWS tokens, private keys, and live webhook URLs", () => {
    const content = [
      "const k = 'sk-" + "A".repeat(32) + "';",
      "const g = 'ghp_" + "b".repeat(36) + "';",
      "const a = 'AKIA" + "0123456789ABCDEF" + "';",
      "const w = 'https://discord.com/api/webhooks/123/" + "T".repeat(30) + "';",
      "-----BEGIN RSA PRIVATE KEY-----\nMIIF-FIXTURE-BODY\n-----END RSA PRIVATE KEY-----",
    ].join("\n");
    expect(findSecretLiterals(content).length).toBeGreaterThanOrEqual(5);
  });

  it("does not flag ordinary strings", () => {
    expect(findSecretLiterals("const s = 'just a normal string sk-';")).toEqual([]);
  });
});

describe("findSkippedTests (self-test)", () => {
  it("flags skipped/focused tests", () => {
    const content = [
      "it.skip('x', () => {});",
      "describe.only('y', () => {});",
      "xit('z', () => {});",
    ].join("\n");
    expect(findSkippedTests(content).length).toBe(3);
  });

  it("does not flag ordinary tests", () => {
    expect(findSkippedTests("it('runs', () => {});\ndescribe('g', () => {});")).toEqual([]);
  });
});

describe("tokenize", () => {
  it("separates string literals from code and blanks comments", () => {
    const { code, strings } = tokenize('const u = "https://x"; // fetch(comment)\n/* block */');
    expect(strings.map((s) => s.value)).toEqual(["https://x"]);
    expect(code).not.toContain("fetch");
    expect(code).not.toContain("block");
  });
});
