/** Market.json parser (SSOT §5.2 / Step 1.6): commodity prices at the open market. */

import type { DomainError, MarketSnapshot, Result } from "@lodestar/shared";
import { parseObject } from "../util/reader.js";

export function parseMarket(raw: string): Result<MarketSnapshot, DomainError> {
  return parseObject(raw, "market", (r): MarketSnapshot => ({
    timestamp: r.string("timestamp"),
    marketId: r.number("MarketID"),
    stationName: r.string("StationName"),
    starSystem: r.string("StarSystem"),
    items: r.has("Items")
      ? r.objectArray("Items", (c) => ({
          id: c.number("id"),
          name: c.string("Name"),
          category: c.string("Category"),
          sellPrice: c.number("SellPrice"),
          buyPrice: c.number("BuyPrice"),
          meanPrice: c.number("MeanPrice"),
          demand: c.number("Demand"),
          stock: c.number("Stock"),
        }))
      : [],
  }));
}
