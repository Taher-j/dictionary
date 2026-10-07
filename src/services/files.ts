import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/** A file in the cache directory, written in pieces (a backup is never one giant string). */
export interface CacheFileWriter {
  uri: string;
  append(text: string): void;
}

/** Creates (or empties) `name` in the cache directory. */
export function createCacheFile(name: string): CacheFileWriter {
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  return {
    uri: file.uri,
    append(text) {
      file.write(text, { append: true });
    },
  };
}

/** Opens the system share sheet for a file (save to Files, Drive, mail, ...). */
export async function shareFile(uri: string, mimeType: string, dialogTitle: string): Promise<void> {
  await Sharing.shareAsync(uri, { mimeType, dialogTitle, UTI: 'public.json' });
}

/** Bytes read per piece: small enough for the app's memory limit, large enough to be quick. */
const READ_PIECE_BYTES = 512 * 1024;

/**
 * A file's text, piece by piece. A large backup read as one string runs Android out of memory
 * (80 MB of JSON needs a 268 MB allocation), so it is never read whole.
 */
export async function* readTextPieces(
  uri: string,
  onBytes?: (bytesRead: number) => void,
): AsyncGenerator<string> {
  const handle = new File(uri).open();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  try {
    for (;;) {
      const bytes = handle.readBytes(READ_PIECE_BYTES);
      if (bytes.length === 0) break;
      bytesRead += bytes.length;
      onBytes?.(bytesRead);
      yield decoder.decode(bytes, { stream: true });
    }
    const rest = decoder.decode();
    if (rest !== '') yield rest;
  } finally {
    handle.close();
  }
}

export interface PickedFile {
  name: string;
  uri: string;
  size: number | null;
}

/**
 * Lets the user pick one file. Any type is allowed: JSON files often arrive from cloud storage
 * as "application/octet-stream", and the backup parser rejects anything that is not a backup.
 */
export async function pickFile(): Promise<PickedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) return null;
  return { name: asset.name, uri: asset.uri, size: asset.size ?? null };
}
