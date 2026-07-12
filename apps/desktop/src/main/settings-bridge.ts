/**
 * Settings/secrets/journal bridge: the glue between the core services and the
 * IPC handlers, extracted from the app entry so it is unit-testable. Secret
 * VALUES never appear here (presence booleans only). Consent changes go through
 * an audit hook so there is a forensic trail (server-side "Privacy-panel-only"
 * enforcement lands in Step 10.5; until then the UI enforces read-only).
 */

import { DEFAULT_SETTINGS, locateJournalDir, validateJournalDir } from "@lodestar/core";
import type { SecretsStore, SettingsService, SettingsKey, SecretKey } from "@lodestar/core";
import type {
  SecretsPresence,
  SettingsSetRequest,
  SettingsSnapshot,
  WireResult,
} from "@lodestar/shared";
import { domainError, err, ok, toWireResult } from "@lodestar/shared";

const SETTINGS_KEYS: readonly SettingsKey[] = [
  "journalPath",
  "ollamaEndpoint",
  "aiGpuUuid",
  "consentWing",
  "consentCommunity",
  "consentDiscord",
];

const CONSENT_KEYS = new Set<SettingsKey>(["consentWing", "consentCommunity", "consentDiscord"]);

export interface SettingsBridgeDeps {
  readonly settings: SettingsService | undefined;
  readonly secrets: SecretsStore | undefined;
  readonly journalCandidates: () => readonly string[];
  /** Called after a consent flag changes; used for the audit log. */
  readonly onConsentChange?: (key: SettingsKey, value: boolean) => void;
}

export interface SettingsBridge {
  getSettings: () => SettingsSnapshot;
  setSetting: (req: SettingsSetRequest) => WireResult<SettingsSnapshot>;
  autodetectJournal: () => { path: string | null };
  secretsPresence: () => SecretsPresence;
  probeJournal: () => "not-configured" | "ok" | "error";
}

export function createSettingsBridge(deps: SettingsBridgeDeps): SettingsBridge {
  function snapshot(): SettingsSnapshot {
    const svc = deps.settings;
    if (svc === undefined) return { ...DEFAULT_SETTINGS };
    const read = <K extends SettingsKey>(key: K): SettingsSnapshot[K] => {
      const r = svc.get(key);
      return r.ok ? r.value : DEFAULT_SETTINGS[key];
    };
    return {
      journalPath: read("journalPath"),
      ollamaEndpoint: read("ollamaEndpoint"),
      aiGpuUuid: read("aiGpuUuid"),
      consentWing: read("consentWing"),
      consentCommunity: read("consentCommunity"),
      consentDiscord: read("consentDiscord"),
    };
  }

  return {
    getSettings: snapshot,

    setSetting(req: SettingsSetRequest): WireResult<SettingsSnapshot> {
      const svc = deps.settings;
      if (svc === undefined) {
        return toWireResult(err(domainError("settings.unavailable", "settings not initialized")));
      }
      if (!SETTINGS_KEYS.includes(req.key)) {
        return toWireResult(err(domainError("settings.invalid-value", `unknown key "${req.key}"`)));
      }
      const result = svc.set(req.key, req.value);
      if (!result.ok) return toWireResult(err(result.error));
      if (CONSENT_KEYS.has(req.key) && typeof req.value === "boolean") {
        deps.onConsentChange?.(req.key, req.value);
      }
      return toWireResult(ok(snapshot()));
    },

    autodetectJournal(): { path: string | null } {
      const found = locateJournalDir(deps.journalCandidates());
      if (found.ok) {
        deps.settings?.set("journalPath", found.value);
        return { path: found.value };
      }
      return { path: null };
    },

    secretsPresence(): SecretsPresence {
      const present = (key: SecretKey): boolean => {
        const r = deps.secrets?.get(key);
        return r?.ok === true && r.value !== null;
      };
      return {
        inaraApiKey: present("inaraApiKey"),
        capiTokens: present("capiTokens"),
        discordWebhookUrl: present("discordWebhookUrl"),
      };
    },

    probeJournal(): "not-configured" | "ok" | "error" {
      const svc = deps.settings;
      if (svc === undefined) return "not-configured";
      const pathResult = svc.get("journalPath");
      if (!pathResult.ok || pathResult.value === null) return "not-configured";
      return validateJournalDir(pathResult.value).ok ? "ok" : "error";
    },
  };
}
