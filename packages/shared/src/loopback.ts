/**
 * Loopback URL validation (SSOT §5.3/§5.4). An endpoint is loopback-valid only
 * when it is http(s), carries no userinfo, and its host is a CANONICAL literal
 * loopback address — 127.x.x.x dotted-quad or [::1] — under BOTH the raw
 * authority and the WHATWG-parsed host. Requiring both parses to agree defeats:
 *  - IP-encoding tricks (decimal 2130706433, hex 0x7f000001, short 127.1) — the
 *    raw host is non-canonical even though URL normalizes them to 127.0.0.1;
 *  - parser-differential tricks (`http://evil.com\@127.0.0.1`) — the raw host is
 *    loopback but url.hostname is the attacker host, so they disagree.
 * Used by the Ollama endpoint setting (Step 0.7); centralized by the egress
 * gateway (Step 0.10).
 */

const CANONICAL_IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

/** Authority stops at the first path/query/fragment char — including `\`,
 *  which WHATWG treats as a path separator for http(s). */
function rawAuthority(raw: string): string | undefined {
  const match = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/([^/?#\\]*)/.exec(raw);
  return match?.[1];
}

function isCanonicalLoopbackHost(host: string): boolean {
  const bare = host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
  if (bare === "::1") return true;
  const m = CANONICAL_IPV4.exec(bare);
  if (m === null) return false;
  const octets = m.slice(1, 5).map(Number);
  if (octets.some((n) => n < 0 || n > 255)) return false;
  return octets[0] === 127;
}

export function isLoopbackUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  if (url.username !== "" || url.password !== "") return false;

  // Parsed host must be loopback (url.hostname strips IPv6 brackets → "::1").
  if (!isCanonicalLoopbackHost(url.hostname)) return false;

  // Raw host must ALSO be canonical loopback and agree with the parsed host.
  const authority = rawAuthority(raw);
  if (authority === undefined || authority.includes("@")) return false;
  const rawHost = authority.startsWith("[")
    ? authority.slice(0, authority.indexOf("]") + 1)
    : (authority.split(":")[0] ?? "");
  return isCanonicalLoopbackHost(rawHost);
}
