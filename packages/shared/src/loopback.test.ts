import { describe, expect, it } from "vitest";
import { isLoopbackUrl } from "./loopback.js";

describe("isLoopbackUrl", () => {
  it("accepts literal loopback IPv4 and IPv6", () => {
    expect(isLoopbackUrl("http://127.0.0.1:11434")).toBe(true);
    expect(isLoopbackUrl("http://127.0.0.1")).toBe(true);
    expect(isLoopbackUrl("http://127.5.5.5:8080")).toBe(true); // all of 127.0.0.0/8
    expect(isLoopbackUrl("http://[::1]:11434")).toBe(true);
  });

  it("rejects the hostname 'localhost' (must be a literal loopback IP)", () => {
    expect(isLoopbackUrl("http://localhost:11434")).toBe(false);
  });

  it("rejects loopback-lookalike and injection tricks", () => {
    for (const bad of [
      "http://localhost.attacker.com",
      "http://127.0.0.1.evil.com",
      "http://127.0.0.1@evil.com",
      "http://2130706433", // decimal-encoded 127.0.0.1
      "http://0x7f000001",
      "http://127.1",
      "http://[::ffff:127.0.0.1].evil",
      "http://10.0.0.5",
      "http://192.168.1.1",
      "https://api.openai.com",
      "not a url",
    ]) {
      expect(isLoopbackUrl(bad)).toBe(false);
    }
  });

  it("rejects a URL carrying userinfo even if the host is loopback", () => {
    expect(isLoopbackUrl("http://user:pass@127.0.0.1:11434")).toBe(false);
  });

  it("rejects the backslash parser-differential trick (raw host loopback, real host attacker)", () => {
    // WHATWG treats `\` as `/`, so the real host is evil.com; a naive raw parse
    // would wrongly see 127.0.0.1. This connects to the attacker → must reject.
    expect(isLoopbackUrl("http://evil.com\\@127.0.0.1:11434")).toBe(false);
  });

  it("rejects non-http(s) schemes even on a loopback host", () => {
    expect(isLoopbackUrl("file://127.0.0.1/etc/passwd")).toBe(false);
    expect(isLoopbackUrl("ftp://127.0.0.1")).toBe(false);
    expect(isLoopbackUrl("ws://127.0.0.1:11434")).toBe(false);
  });

  it("accepts https on loopback and tolerates a path/query/fragment", () => {
    expect(isLoopbackUrl("https://127.0.0.1:11434")).toBe(true);
    expect(isLoopbackUrl("http://127.0.0.1:11434/api/chat?x=1#y")).toBe(true);
  });
});
