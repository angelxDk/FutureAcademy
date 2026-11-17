/** JSON is the boundary shared by local recovery, backups and PostgreSQL RPCs. */
export type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
export interface JsonObject { [key: string]: JsonValue }
export interface AcademicItem extends JsonObject { id: string }

export const collectionKeys = ['subjects', 'timetable', 'events', 'records', 'studySessions', 'communities'] as const;
export type CollectionKey = typeof collectionKeys[number];
export const settingKeys = ['settings', 'profile', 'focusPlayer', 'recordDraft', 'workspace', 'studyAssistant', 'pomodoro'] as const;
export type SettingKey = typeof settingKeys[number];

export type AcademicSnapshot = JsonObject & Partial<Record<CollectionKey, AcademicItem[]>> & {
  savedAt?: number;
  remoteRevision?: number;
  syncPending?: boolean;
  recordDrafts?: JsonObject;
};
export type SnapshotEntry =
  | { kind: CollectionKey; value: AcademicItem }
  | { kind: 'recordDrafts'; key: string; value: JsonObject }
  | { kind: 'setting'; key: SettingKey; value: JsonValue };
export type SnapshotEntries = Record<string, SnapshotEntry>;
export interface SnapshotMetadata { schemaVersion: 2; revision: number; savedAt: number }

export const MAX_ENTRY_BYTES = 800_000;
export const MAX_SYNC_CHANGES = 10_000;
export const MAX_SYNC_BYTES = 20 * 1024 * 1024;
