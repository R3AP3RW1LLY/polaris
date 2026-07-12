/**
 * IPC handler registration. Every invoke channel returns the §5.6 serialized
 * wire result so DomainError never crosses as a class instance. The renderer
 * only ever sees channels registered here. Secrets cross as presence booleans
 * only — never their values (SSOT §4.6).
 */

import type {
  AppHealth,
  Channel,
  GpuInfo,
  SecretsPresence,
  SecretsSetRequest,
  SettingsSetRequest,
  SettingsSnapshot,
  WireResult,
} from "@lodestar/shared";
import { domainError, err, ok, toWireResult } from "@lodestar/shared";

export interface IpcMainLike {
  handle: (channel: Channel, listener: (...args: unknown[]) => unknown) => void;
}

export interface IpcDeps {
  readonly getHealth: () => AppHealth;
  readonly getSettings: () => SettingsSnapshot;
  readonly setSetting: (req: SettingsSetRequest) => WireResult<SettingsSnapshot>;
  readonly autodetectJournal: () => { path: string | null };
  readonly getSecretsPresence: () => SecretsPresence;
  readonly setSecret: (req: SecretsSetRequest) => WireResult<SecretsPresence>;
  readonly listGpus: () => Promise<readonly GpuInfo[]>;
}

export function registerIpcHandlers(ipcMain: IpcMainLike, deps: IpcDeps): void {
  ipcMain.handle("app.health", (): WireResult<AppHealth> => toWireResult(ok(deps.getHealth())));

  ipcMain.handle("settings.get", (): WireResult<SettingsSnapshot> =>
    toWireResult(ok(deps.getSettings())),
  );

  ipcMain.handle("settings.set", (raw: unknown): WireResult<SettingsSnapshot> => {
    if (
      typeof raw !== "object" ||
      raw === null ||
      typeof (raw as { key?: unknown }).key !== "string"
    ) {
      return toWireResult(err(domainError("ipc.bad-args", "settings.set requires { key, value }")));
    }
    return deps.setSetting(raw as SettingsSetRequest);
  });

  ipcMain.handle("journal.autodetect", (): WireResult<{ path: string | null }> =>
    toWireResult(ok(deps.autodetectJournal())),
  );

  ipcMain.handle("secrets.presence", (): WireResult<SecretsPresence> =>
    toWireResult(ok(deps.getSecretsPresence())),
  );

  ipcMain.handle("secrets.set", (raw: unknown): WireResult<SecretsPresence> => {
    if (
      typeof raw !== "object" ||
      raw === null ||
      typeof (raw as { key?: unknown }).key !== "string"
    ) {
      return toWireResult(err(domainError("ipc.bad-args", "secrets.set requires { key, value }")));
    }
    return deps.setSecret(raw as SecretsSetRequest);
  });

  ipcMain.handle("system.gpus", async (): Promise<WireResult<readonly GpuInfo[]>> =>
    toWireResult(ok(await deps.listGpus())),
  );
}
