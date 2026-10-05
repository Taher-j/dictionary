import * as Clipboard from 'expo-clipboard';

/** Text currently on the clipboard, or an empty string. */
export async function readClipboardText(): Promise<string> {
  try {
    return await Clipboard.getStringAsync();
  } catch {
    return '';
  }
}
