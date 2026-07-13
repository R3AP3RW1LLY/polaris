/**
 * Shared field-validation combinator (extracted from Step 1.5, reused by 1.6).
 * A `Reader` throws an internal `ParseError` on a missing/wrong-type field;
 * `parseObject` runs a build function against a parsed JSON object and maps any
 * `ParseError` (or an unexpected throw) to `Result.err` — so parsers built on it
 * NEVER throw to the caller. Extra fields are always tolerated.
 */

import { domainError, err, ok } from "@lodestar/shared";
import type { DomainError, Result } from "@lodestar/shared";

export class ParseError extends Error {
  constructor(
    readonly field: string,
    readonly reason: string,
  ) {
    super(`${field}: ${reason}`);
    this.name = "ParseError";
  }
}

export class Reader {
  constructor(
    private readonly obj: Readonly<Record<string, unknown>>,
    private readonly prefix = "",
  ) {}

  has(key: string): boolean {
    return this.obj[key] !== undefined;
  }

  string(key: string): string {
    const v = this.obj[key];
    if (typeof v !== "string") throw new ParseError(this.prefix + key, "expected string");
    return v;
  }

  number(key: string): number {
    const v = this.obj[key];
    if (typeof v !== "number" || !Number.isFinite(v))
      throw new ParseError(this.prefix + key, "expected number");
    return v;
  }

  boolean(key: string): boolean {
    const v = this.obj[key];
    if (typeof v !== "boolean") throw new ParseError(this.prefix + key, "expected boolean");
    return v;
  }

  optionalString(key: string): string | undefined {
    const v = this.obj[key];
    if (v === undefined) return undefined;
    if (typeof v !== "string") throw new ParseError(this.prefix + key, "expected string or absent");
    return v;
  }

  optionalNumber(key: string): number | undefined {
    const v = this.obj[key];
    if (v === undefined) return undefined;
    if (typeof v !== "number" || !Number.isFinite(v))
      throw new ParseError(this.prefix + key, "expected number or absent");
    return v;
  }

  /** A fixed-length tuple of finite numbers (StarPos, Pips). */
  numberTuple<N extends number>(key: string, length: N): number[] & { length: N } {
    const v = this.obj[key];
    if (
      !Array.isArray(v) ||
      v.length !== length ||
      v.some((n) => typeof n !== "number" || !Number.isFinite(n))
    ) {
      throw new ParseError(this.prefix + key, `expected ${String(length)} finite numbers`);
    }
    return v as number[] & { length: N };
  }

  child(key: string): Reader {
    const v = this.obj[key];
    if (typeof v !== "object" || v === null || Array.isArray(v))
      throw new ParseError(this.prefix + key, "expected object");
    return new Reader(v as Record<string, unknown>, `${this.prefix}${key}.`);
  }

  objectArray<T>(key: string, map: (child: Reader) => T): T[] {
    const v = this.obj[key];
    if (!Array.isArray(v)) throw new ParseError(this.prefix + key, "expected array");
    return v.map((item, i) => {
      if (typeof item !== "object" || item === null || Array.isArray(item))
        throw new ParseError(`${this.prefix}${key}[${String(i)}]`, "expected object");
      return map(
        new Reader(item as Record<string, unknown>, `${this.prefix}${key}[${String(i)}].`),
      );
    });
  }
}

/** Include `[key]: value` only when value is defined (respects exactOptionalPropertyTypes). */
export function opt<K extends string, V>(
  key: K,
  value: V | undefined,
): Record<K, V> | Record<never, never> {
  return value === undefined ? {} : { [key]: value };
}

/**
 * Parse a raw JSON object with `build`, returning `Result.err` (never throwing)
 * on invalid JSON, a non-object, a `ParseError`, or any unexpected throw. `kind`
 * prefixes the error code (e.g. "status", "cargo").
 */
export function parseObject<T>(
  raw: string,
  kind: string,
  build: (r: Reader) => T,
): Result<T, DomainError> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return err(domainError(`${kind}.json`, `${kind}: not valid JSON (partial write?)`));
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return err(domainError(`${kind}.shape`, `${kind}: not a JSON object`));
  }
  try {
    return ok(build(new Reader(parsed as Record<string, unknown>)));
  } catch (e) {
    if (e instanceof ParseError) {
      return err(domainError(`${kind}.field`, `${kind}.${e.field}: ${e.reason}`));
    }
    return err(domainError(`${kind}.internal`, `${kind}: internal parse error`));
  }
}
