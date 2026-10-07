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

export interface PickedFile {
  name: string;
  size: number | null;
  read(): Promise<string>;
}

/**
 * Lets the user pick one file. Any type is allowed: JSON files often arrive from cloud storage
 * as "application/octet-stream", and the backup parser rejects anything that is not a backup.
 */
export async function pickFile(): Promise<PickedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) return null;
  return {
    name: asset.name,
    size: asset.size ?? null,
    read: () => new File(asset.uri).text(),
  };
}
