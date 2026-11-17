import { collectionKeys, settingKeys } from '../types/academic';
import type { AcademicSnapshot, JsonObject, JsonValue } from '../types/academic';

const unsafeKeys = new Set(['__proto__', 'constructor', 'prototype']);
export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function invalid(): never { throw new Error('Conteúdo acadêmico inválido. Sua cópia anterior foi preservada.'); }

/** Reject prototype injection, non-JSON values and excessive nesting before hydration. */
export function assertSafeJson(value: unknown, depth = 0, ancestors = new Set<object>()): asserts value is JsonValue {
  if (depth > 64) invalid();
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number' && Number.isFinite(value)) return;
  if (typeof value !== 'object' || !value || ancestors.has(value)) invalid();
  const proto = Object.getPrototypeOf(value);
  if (!Array.isArray(value) && proto !== Object.prototype && proto !== null) invalid();
  ancestors.add(value);
  for (const [key, item] of Object.entries(value)) {
    if (unsafeKeys.has(key)) invalid();
    assertSafeJson(item, depth + 1, ancestors);
  }
  ancestors.delete(value);
}

const stringFields = ['name', 'title', 'content', 'contentHtml', 'subjectId', 'date', 'time', 'start', 'end', 'dueDate', 'status', 'type', 'email', 'photo', 'course', 'question', 'html', 'editId'];
function validateStrings(value: JsonObject) {
  for (const key of stringFields) if (key in value && typeof value[key] !== 'string') invalid();
}
function validateDraft(value: JsonValue) {
  if (!isObject(value)) invalid();
  validateStrings(value as JsonObject);
  if ('form' in value) {
    if (!isObject(value.form)) invalid();
    validateStrings(value.form as JsonObject);
  }
}

/** Partial snapshots remain readable for accounts migrated from the legacy app. */
export function validateSnapshot(value: unknown, requireCollections = false): AcademicSnapshot {
  assertSafeJson(value);
  if (!isObject(value)) invalid();
  const data = value as JsonObject;
  for (const key of collectionKeys) {
    const list = data[key];
    if (list === undefined && !requireCollections) continue;
    if (!Array.isArray(list)) invalid();
    const ids = new Set<string>();
    for (const item of list) {
      if (!isObject(item) || typeof item.id !== 'string' || !item.id) invalid();
      if (ids.has(item.id)) throw new Error('O conteúdo contém identificadores duplicados.');
      ids.add(item.id);
      validateStrings(item as JsonObject);
      if (key === 'communities' && 'messages' in item && !Array.isArray(item.messages)) invalid();
    }
  }
  for (const key of ['savedAt', 'remoteRevision']) {
    if (key in data && (typeof data[key] !== 'number' || !Number.isSafeInteger(data[key]) || data[key] < 0)) invalid();
  }
  if ('syncPending' in data && typeof data.syncPending !== 'boolean') invalid();
  for (const key of settingKeys) {
    if (key in data && data[key] !== null && !isObject(data[key])) invalid();
  }
  for (const key of ['profile', 'settings', 'pomodoro']) {
    if (isObject(data[key])) validateStrings(data[key] as JsonObject);
  }
  if (isObject(data.settings) && 'integrations' in data.settings && !isObject(data.settings.integrations)) invalid();
  if (isObject(data.settings) && 'theme' in data.settings && !['dark', 'light'].includes(String(data.settings.theme))) invalid();
  if (isObject(data.workspace)) {
    for (const key of ['opened', 'visible']) {
      const tools = data.workspace[key];
      if (tools !== undefined && (!Array.isArray(tools) || tools.some(id => typeof id !== 'string'))) invalid();
    }
  }
  if ('recordDrafts' in data) {
    if (!isObject(data.recordDrafts)) invalid();
    for (const draft of Object.values(data.recordDrafts)) validateDraft(draft);
  } else if (requireCollections) invalid();
  if (data.recordDraft !== undefined && data.recordDraft !== null) validateDraft(data.recordDraft);
  if (isObject(data.studyAssistant)) {
    validateStrings(data.studyAssistant as JsonObject);
    if ('messages' in data.studyAssistant) {
      if (!Array.isArray(data.studyAssistant.messages)) invalid();
      for (const message of data.studyAssistant.messages) {
        if (!isObject(message) || typeof message.content !== 'string' || !['user', 'assistant', 'system'].includes(String(message.role))) invalid();
      }
    }
  }
  return data as AcademicSnapshot;
}
