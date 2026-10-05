import { Redirect } from 'expo-router';

// Backs the [+] tab button, whose press is intercepted in (tabs)/_layout.tsx.
// If the route is ever reached directly, it forwards to the quick-add modal.
export default function QuickAddTabRoute() {
  return <Redirect href="/add" />;
}
