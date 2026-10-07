import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** Written into backup files, so a restore can tell which app made them. */
export const appInfo = {
  version: Constants.expoConfig?.version ?? 'unknown',
  platform: Platform.OS,
};
