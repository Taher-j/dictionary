import { Redirect } from 'expo-router';

import { DevToolsScreen } from '@/features/dev/DevToolsScreen';

export default function DevRoute() {
  if (!__DEV__) return <Redirect href="/" />;
  return <DevToolsScreen />;
}
