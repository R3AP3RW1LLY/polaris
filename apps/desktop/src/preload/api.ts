/**
 * The typed API surface exposed to the renderer via contextBridge. This is the
 * ONLY bridge between renderer and main — no raw ipcRenderer is ever exposed
 * (SSOT §5.6 / Step 0.4). Every method returns a plain value or throws a typed
 * error unwrapped from the §5.6 wire envelope.
 */

import type {
  AppHealth,
  Channel,
  SecretsPresence,
  SettingsSetRequest,
  SettingsSnapshot,
  WireResult,
} from "@lodestar/shared";

export interface IpcInvoker {
  invoke: (channel: Channel, ...args: unknown[]) => Promise<unknown>;
}

export interface LodestarApi {
  getHealth: () => Promise<AppHealth>;
  getSettings: () => Promise<SettingsSnapshot>;
  setSetting: (req: SettingsSetRequest) => Promise<SettingsSnapshot>;
  autodetectJournal: () => Promise<{ path: string | null }>;
  getSecretsPresence: () => Promise<SecretsPresence>;
}

export const EXPOSED_API_KEYS = [
  "getHealth",
  "getSettings",
  "setSetting",
  "autodetectJournal",
  "getSecretsPresence",
] as const satisfies readonly (keyof LodestarApi)[];

function unwrap<T>(wire: WireResult<T>): T {
  if (wire.ok) return wire.value;
  throw new Error(`${wire.error.code}: ${wire.error.message}`);
}

export function createLodestarApi(ipc: IpcInvoker): LodestarApi {
  const call = async <T>(channel: Channel, ...args: unknown[]): Promise<T> =>
    unwrap(await (ipc.invoke(channel, ...args) as Promise<WireResult<T>>));
  return {
    getHealth: () => call<AppHealth>("app.health"),
    getSettings: () => call<SettingsSnapshot>("settings.get"),
    setSetting: (req) => call<SettingsSnapshot>("settings.set", req),
    autodetectJournal: () => call<{ path: string | null }>("journal.autodetect"),
    getSecretsPresence: () => call<SecretsPresence>("secrets.presence"),
  };
}
