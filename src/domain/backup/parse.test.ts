import { BACKUP_FORMAT, type Backup } from '@/domain/backup/format';
import { parseBackup } from '@/domain/backup/parse';

function validBackup(): Backup {
  return {
    format: BACKUP_FORMAT,
    formatVersion: 1,
    schemaVersion: 3,
    exportedAt: '2026-10-07T18:30:00.000Z',
    app: { version: '1.0.0', platform: 'android' },
    data: {
      dictionaries: [
        {
          id: 'd1',
          name: 'German',
          icon: null,
          color: null,
          termLang: 'de',
          meaningLang: 'en',
          bothDirections: false,
          inDailyReview: true,
          lookupUrl: null,
          position: 0,
          createdAt: 1,
          updatedAt: 1,
          deletedAt: null,
        },
      ],
      tags: [],
      words: [],
      wordTags: [],
      sessions: [],
      cards: [],
      reviewLogs: [],
      settings: [{ key: 'theme', value: '"dark"', updatedAt: 1 }],
    },
  };
}

describe('parseBackup', () => {
  it('accepts a valid backup', () => {
    const result = parseBackup(JSON.stringify(validBackup()));
    expect(result).toEqual({ ok: true, backup: validBackup() });
  });

  it.each([
    ['not JSON at all', 'hello', 'notJson'],
    ['truncated JSON', JSON.stringify(validBackup()).slice(0, 80), 'notJson'],
    ['another JSON file', '{"name":"package","version":"1.0.0"}', 'notBackup'],
    ['a JSON array', '[1, 2, 3]', 'notBackup'],
    ['JSON null', 'null', 'notBackup'],
    ['an empty file', '', 'notJson'],
  ])('rejects %s', (_, text, error) => {
    expect(parseBackup(text)).toEqual({ ok: false, error });
  });

  it('rejects a file from a newer app version', () => {
    const newer = { ...validBackup(), formatVersion: 99 };
    expect(parseBackup(JSON.stringify(newer))).toEqual({ ok: false, error: 'newerVersion' });
  });

  it.each<[string, (b: Record<string, unknown> & Backup) => void]>([
    ['a missing table', (b) => delete (b.data as Partial<Backup['data']>).cards],
    [
      'a row with a wrong type',
      (b) => Object.assign(b.data.dictionaries[0] ?? {}, { position: '0' }),
    ],
    [
      'a row with a missing column',
      (b) => delete (b.data.settings[0] as Partial<{ updatedAt: number }>).updatedAt,
    ],
    ['a row with an extra column', (b) => Object.assign(b.data.settings[0] ?? {}, { extra: 1 })],
    [
      'a null where a value is required',
      (b) => Object.assign(b.data.dictionaries[0] ?? {}, { name: null }),
    ],
    ['a missing header field', (b) => delete (b as Partial<Backup>).exportedAt],
  ])('rejects %s as invalid data', (_, damage) => {
    const backup = validBackup() as Record<string, unknown> & Backup;
    damage(backup);
    expect(parseBackup(JSON.stringify(backup))).toEqual({ ok: false, error: 'invalidData' });
  });
});
