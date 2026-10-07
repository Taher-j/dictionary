import { createBackupSplitter } from '@/domain/backup/splitter';

const file = JSON.stringify({
  format: 'dictionary-backup',
  formatVersion: 1,
  app: { version: '1.0.0', platform: 'android' },
  data: {
    words: [
      { id: 'a', term: 'Haus {[', notes: 'quote " and \\ backslash ]}' },
      { id: 'b', term: '😀 مرحبا', notes: null },
    ],
    'odd "table" name': [{ id: 'c' }],
    empty: [],
  },
});

function split(pieces: string[]) {
  const rows: [string, unknown][] = [];
  const splitter = createBackupSplitter((table, json) => rows.push([table, JSON.parse(json)]));
  for (const piece of pieces) splitter.push(piece);
  return { rows, skeleton: splitter.finish() };
}

describe('createBackupSplitter', () => {
  it('cuts out every row and leaves a parseable skeleton, for any piece size', () => {
    const expected = split([file]);
    expect(expected.rows).toEqual([
      ['words', { id: 'a', term: 'Haus {[', notes: 'quote " and \\ backslash ]}' }],
      ['words', { id: 'b', term: '😀 مرحبا', notes: null }],
      ['odd \\"table\\" name', { id: 'c' }],
    ]);
    expect(JSON.parse(expected.skeleton ?? '')).toEqual({
      format: 'dictionary-backup',
      formatVersion: 1,
      app: { version: '1.0.0', platform: 'android' },
      data: { words: [], 'odd "table" name': [], empty: [] },
    });

    for (const size of [1, 2, 3, 7, 64]) {
      const pieces: string[] = [];
      for (let i = 0; i < file.length; i += size) pieces.push(file.slice(i, i + size));
      expect({ size, ...split(pieces) }).toEqual({ size, ...expected });
    }
  });

  it('handles UTF-8 split between pieces when decoded with a streaming TextDecoder', () => {
    const bytes = new TextEncoder().encode(file);
    const decoder = new TextDecoder();
    const pieces: string[] = [];
    for (let i = 0; i < bytes.length; i += 5) {
      pieces.push(decoder.decode(bytes.subarray(i, i + 5), { stream: true }));
    }
    pieces.push(decoder.decode());
    expect(split(pieces)).toEqual(split([file]));
  });

  it('reports text that ends inside a row, string or object', () => {
    for (const cut of [10, file.indexOf('Haus') + 2, file.length - 1]) {
      expect(split([file.slice(0, cut)]).skeleton).toBeNull();
    }
  });
});
