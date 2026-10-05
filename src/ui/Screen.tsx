import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { Text } from '@/ui/Text';
import { spacing } from '@/ui/tokens';
import { useTheme } from '@/ui/useTheme';

const ALL_EDGES: readonly Edge[] = ['top', 'bottom', 'left', 'right'];

export interface ScreenProps {
  /** Screen heading, announced as a header to screen readers. */
  title?: string;
  children: ReactNode;
  /** Pinned below the content, inside the bottom safe area (actions, banners). */
  footer?: ReactNode;
  /** Content scrolls by default so large font sizes never truncate it. */
  scroll?: boolean;
  edges?: readonly Edge[];
}

/** Every screen is wrapped in Screen. It owns the safe areas; no screen assumes the bottom edge. */
export function Screen({ title, children, footer, scroll = true, edges = ALL_EDGES }: ScreenProps) {
  const { colors } = useTheme();
  const body = (
    <>
      {title ? <Text variant="title">{title}</Text> : null}
      {children}
    </>
  );

  return (
    <SafeAreaView edges={edges} style={[styles.root, { backgroundColor: colors.background }]}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {body}
        </ScrollView>
      ) : (
        <View style={[styles.root, styles.content]}>{body}</View>
      )}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
});
