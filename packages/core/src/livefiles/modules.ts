/** ModulesInfo.json parser (SSOT §5.2 / Step 1.6): the ship's fitted modules. */

import type { DomainError, ModulesSnapshot, Result } from "@lodestar/shared";
import { opt, parseObject } from "../util/reader.js";

export function parseModules(raw: string): Result<ModulesSnapshot, DomainError> {
  return parseObject(raw, "modules", (r): ModulesSnapshot => ({
    timestamp: r.string("timestamp"),
    modules: r.has("Modules")
      ? r.objectArray("Modules", (c) => ({
          slot: c.string("Slot"),
          item: c.string("Item"),
          ...opt("power", c.optionalNumber("Power")),
          ...opt("priority", c.optionalNumber("Priority")),
        }))
      : [],
  }));
}
