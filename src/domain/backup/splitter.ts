/**
 * Splits backup JSON, fed in pieces, into rows: every object directly inside a table array under
 * "data" is handed out as its own JSON text, so a backup of any size is parsed one row at a time.
 * What remains (the header and empty table arrays) is the skeleton, returned by `finish`.
 *
 * Only the nesting is tracked (objects, arrays, strings and their escapes); the rows and the
 * skeleton are parsed with JSON.parse afterwards.
 */
export interface BackupSplitter {
  push(text: string): void;
  /** The skeleton, or null when the text ended inside an object, array or string. */
  finish(): string | null;
}

export function createBackupSplitter(onRow: (table: string, json: string) => void): BackupSplitter {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;
  let inRow = false;
  let table = '';
  // Text of a row or a skeleton segment that started in an earlier piece.
  const rowParts: string[] = [];
  const skeleton: string[] = [];
  // A string inside "data" (a table name), possibly started in an earlier piece.
  let keyParts: string[] | null = null;
  let lastKey = '';

  return {
    push(text) {
      let segmentStart = 0; // skeleton text not yet copied
      let rowStart = 0;
      let keyStart = -1;
      for (let i = 0; i < text.length; i++) {
        const c = text.charCodeAt(i);
        if (inString) {
          if (escaped) escaped = false;
          else if (c === 0x5c /* \ */) escaped = true;
          else if (c === 0x22 /* " */) {
            inString = false;
            if (keyParts) {
              keyParts.push(text.slice(Math.max(keyStart, 0), i));
              lastKey = keyParts.join('');
              keyParts = null;
            }
          }
          continue;
        }
        switch (c) {
          case 0x22: // "
            inString = true;
            // Strings directly inside the data object are table names.
            if (!inRow && stack.length === 2) {
              keyParts = [];
              keyStart = i + 1;
            }
            break;
          case 0x7b: // {
            if (!inRow && stack.length === 3 && stack[2] === '[') {
              inRow = true;
              rowStart = i;
              skeleton.push(text.slice(segmentStart, i));
            }
            stack.push('{');
            break;
          case 0x5b: // [
            if (!inRow && stack.length === 2) table = lastKey;
            stack.push('[');
            break;
          case 0x7d: // }
          case 0x5d: // ]
            stack.pop();
            if (inRow && stack.length === 3) {
              rowParts.push(text.slice(rowStart, i + 1));
              onRow(table, rowParts.join(''));
              rowParts.length = 0;
              inRow = false;
              segmentStart = i + 1;
            }
            break;
          default:
            break;
        }
      }
      if (inRow) rowParts.push(text.slice(rowStart));
      else skeleton.push(text.slice(segmentStart));
      if (keyParts) keyParts.push(text.slice(Math.max(keyStart, 0)));
    },

    finish() {
      if (inString || inRow || stack.length > 0) return null;
      // Rows were cut out; the commas between them are left in otherwise empty arrays.
      return skeleton.join('').replace(/\[[\s,]*\]/g, '[]');
    },
  };
}
