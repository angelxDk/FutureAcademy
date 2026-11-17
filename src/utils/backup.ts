import { encodeSnapshot } from './persistence';
import { isObject, validateSnapshot } from './snapshotValidation';
import { MAX_SYNC_BYTES } from '../types/academic';
import type { AcademicSnapshot } from '../types/academic';

export function validateBackup(backup: unknown): AcademicSnapshot {
  if (!isObject(backup) || backup.format !== 'future-academy-backup' || backup.version !== 1) throw new Error('Arquivo de backup não reconhecido.');
  const data = validateSnapshot(backup.data, true);
  if (new TextEncoder().encode(JSON.stringify(data)).length > MAX_SYNC_BYTES) throw new Error('O backup deve ter até 20 MB.');
  encodeSnapshot(data);
  return data;
}
