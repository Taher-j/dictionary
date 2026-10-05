import { useContext } from 'react';

import { ThemeContext } from '@/ui/ThemeProvider';
import type { AppTheme } from '@/ui/theme';

export function useTheme(): AppTheme {
  return useContext(ThemeContext);
}
