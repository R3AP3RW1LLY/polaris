import { describe, expect, it } from "vitest";
import { registerIpcHandlers } from "./ipc.js";
import type { IpcMainLike } from "./ipc.js";
import type { AppHealth, WireResult } from "@lodestar/shared";

interface FakeIpcMain extends IpcMainLike {
  readonly handlers: Map<string, (...args: unknown[]) => unknown>;
}

function fakeIpcMain(): FakeIpcMain {
  const handlers = new Map<string, (...args: unknown[]) => unknown>();
  return {
    handle: (channel, listener) => {
      handlers.set(channel, listener);
    },
    handlers,
  };
}

const SNAPSHOT = {
  journalPath: null,
  ollamaEndpoint: "http://127.0.0.1:11434",
  aiGpuUuid: null,
  consentWing: false,
  consentCommunity: false,
  consentDiscord: false,
} as const;

const PRESENCE = { inaraApiKey: false, capiTokens: false, discordWebhookUrl: false } as const;

function deps(over: Partial<Parameters<typeof registerIpcHandlers>[1]> = {}) {
  return {
    getHealth: () => ({ version: "0.1.0", dbStatus: "ok", journalStatus: "ok" }) as AppHealth,
    getSettings: () => SNAPSHOT,
    setSetting: () => ({ ok: true as const, value: SNAPSHOT }),
    autodetectJournal: () => ({ path: null }),
    getSecretsPresence: () => PRESENCE,
    setSecret: () => ({ ok: true as const, value: PRESENCE }),
    listGpus: () => Promise.resolve([]),
    ...over,
  };
}

describe("registerIpcHandlers", () => {
  it("registers exactly the Phase-0.7 channels", () => {
    const ipc = fakeIpcMain();
    registerIpcHandlers(ipc, deps());
    expect([...ipc.handlers.keys()].sort()).toEqual([
      "app.health",
      "journal.autodetect",
      "secrets.presence",
      "secrets.set",
      "settings.get",
      "settings.set",
      "system.gpus",
    ]);
  });

  it("app.health returns a success wire envelope with the health payload", async () => {
    const ipc = fakeIpcMain();
    const health: AppHealth = { version: "0.1.0", dbStatus: "ok", journalStatus: "not-configured" };
    registerIpcHandlers(ipc, deps({ getHealth: () => health }));
    const result = (await ipc.handlers.get("app.health")?.({})) as WireResult<AppHealth>;
    expect(result).toEqual({ ok: true, value: health });
  });

  it("settings.set rejects malformed args with a recoverable error envelope", async () => {
    const ipc = fakeIpcMain();
    registerIpcHandlers(ipc, deps());
    const result = (await ipc.handlers.get("settings.set")?.(null)) as WireResult<unknown>;
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("ipc.bad-args");
  });

  it("secrets.presence returns only booleans (never secret values)", async () => {
    const ipc = fakeIpcMain();
    registerIpcHandlers(ipc, deps());
    const result = (await ipc.handlers.get("secrets.presence")?.({})) as WireResult<
      Record<string, unknown>
    >;
    expect(result.ok).toBe(true);
    if (result.ok) {
      for (const v of Object.values(result.value)) expect(typeof v).toBe("boolean");
    }
  });
});
