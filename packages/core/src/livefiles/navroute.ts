/** NavRoute.json parser (SSOT §5.2 / Step 1.6): the plotted route — read-only, never written. */

import type { DomainError, NavRouteSnapshot, Result } from "@lodestar/shared";
import { parseObject } from "../util/reader.js";

export function parseNavRoute(raw: string): Result<NavRouteSnapshot, DomainError> {
  return parseObject(raw, "navroute", (r): NavRouteSnapshot => ({
    timestamp: r.string("timestamp"),
    route: r.has("Route")
      ? r.objectArray("Route", (c) => {
          const [x, y, z] = c.numberTuple("StarPos", 3);
          return {
            starSystem: c.string("StarSystem"),
            systemAddress: c.number("SystemAddress"),
            starPos: [x ?? 0, y ?? 0, z ?? 0] as [number, number, number],
            starClass: c.string("StarClass"),
          };
        })
      : [],
  }));
}
