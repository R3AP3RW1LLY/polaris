// @lodestar/shared is environment-agnostic (runs in Node and the browser) and
// compiles with types:[] + no DOM lib. `URL` is a universal WHATWG global in
// both runtimes; declare the minimal surface used here so shared type-checks
// standalone without pulling in DOM or Node ambient types.
declare class URL {
  constructor(input: string, base?: string);
  readonly hostname: string;
  readonly username: string;
  readonly password: string;
  readonly protocol: string;
  readonly origin: string;
}
