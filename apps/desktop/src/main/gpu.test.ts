import { describe, expect, it } from "vitest";
import { parseNvidiaSmiCsv } from "./gpu.js";

describe("parseNvidiaSmiCsv", () => {
  it("parses the index,uuid,name,memory.total CSV output", () => {
    const csv = [
      "index, uuid, name, memory.total [MiB]",
      "0, GPU-2eba79a0-a13b, NVIDIA GeForce RTX 5070 Ti, 16303 MiB",
      "1, GPU-5612e762-42fc, NVIDIA GeForce RTX 3060, 12288 MiB",
    ].join("\n");
    expect(parseNvidiaSmiCsv(csv)).toEqual([
      {
        index: 0,
        uuid: "GPU-2eba79a0-a13b",
        name: "NVIDIA GeForce RTX 5070 Ti",
        memoryTotalMiB: 16303,
      },
      {
        index: 1,
        uuid: "GPU-5612e762-42fc",
        name: "NVIDIA GeForce RTX 3060",
        memoryTotalMiB: 12288,
      },
    ]);
  });

  it("returns an empty list for empty or header-only output", () => {
    expect(parseNvidiaSmiCsv("")).toEqual([]);
    expect(parseNvidiaSmiCsv("index, uuid, name, memory.total [MiB]")).toEqual([]);
  });

  it("skips malformed rows rather than throwing", () => {
    const csv =
      "index, uuid, name, memory.total\n0, GPU-x, Card, notanumber\n1, GPU-y, Good, 8192 MiB";
    expect(parseNvidiaSmiCsv(csv)).toEqual([
      { index: 1, uuid: "GPU-y", name: "Good", memoryTotalMiB: 8192 },
    ]);
  });
});
