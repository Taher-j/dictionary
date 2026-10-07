import { BACKUP_FORMAT, type Backup } from '@/domain/backup/format';
import { parseBackup, scanBackup } from '@/domain/backup/parse';

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
  it('accepts a valid backup', async () => {
    const result = await parseBackup(JSON.stringify(validBackup()));
    expect(result).toEqual({ ok: true, backup: validBackup() });
  });

  it.each([
    ['not JSON at all', 'hello', 'notJson'],
    ['a truncated backup', JSON.stringify(validBackup()).slice(0, 80), 'invalidData'],
    ['truncated JSON that is not ours', '{"name":"x","list":[1,2', 'notJson'],
    ['another JSON file', '{"name":"package","version":"1.0.0"}', 'notBackup'],
    ['a JSON array', '[1, 2, 3]', 'notBackup'],
    ['JSON null', 'null', 'notBackup'],
    ['an empty file', '', 'notJson'],
  ])('rejects %s', async (_, text, error) => {
    expect(await parseBackup(text)).toEqual({ ok: false, error });
  });

  it('rejects a file from a newer app version', async () => {
    const newer = { ...validBackup(), formatVersion: 99 };
    expect(await parseBackup(JSON.stringify(newer))).toEqual({ ok: false, error: 'newerVersion' });
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
  ])('rejects %s as invalid data', async (_, damage) => {
    const backup = validBackup() as Record<string, unknown> & Backup;
    damage(backup);
    expect(await parseBackup(JSON.stringify(backup))).toEqual({ ok: false, error: 'invalidData' });
  });
});

describe('scanBackup', () => {
  it('rejects an unrelated large file from its first piece, without reading the rest', async () => {
    let piecesRead = 0;
    function* photo() {
      for (let i = 0; i < 1000; i++) {
        piecesRead += 1;
        yield '\u00ff\u00d8\u00ff'.repeat(2000);
      }
    }
    expect(await scanBackup(photo())).toEqual({ ok: false, error: 'notJson' });
    expect(piecesRead).toBeLessThan(3);
  });

  it('counts rows and active dictionaries and words for the preview', async () => {
    const backup = validBackup();
    const [first] = backup.data.dictionaries;
    if (!first) throw new Error('expected a dictionary');
    backup.data.dictionaries.push({ ...first, id: 'd2', deletedAt: 5 });
    const result = await scanBackup([JSON.stringify(backup)]);
    expect(result).toMatchObject({
      ok: true,
      activeDictionaries: 1,
      counts: { dictionaries: 2, settings: 1 },
    });
  });
});
