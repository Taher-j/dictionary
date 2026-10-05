import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { Text } from '@/ui/Text';
import { spacing } from '@/ui/tokens';
import { useTheme } from '@/ui/useTheme';

const ALL_EDGES: readonly Edge[] = ['top', 'bottom', 'left', 'right'];

export interface ScreenProps {
  /** Screen heading, announced as a header to screen readers. */
  title?: string;
  children: ReactNode;
  /** Pinned below the content, inside the bottom safe area; stays above the keyboard. */
  footer?: ReactNode;
  /** Content scrolls by default so large font sizes never truncate it. Lists pass false. */
  scroll?: boolean;
  /** Content padding; lists that draw edge to edge pass false. */
  padded?: boolean;
  /** Screens under a navigation header leave out 'top'. */
  edges?: readonly Edge[];
}

/** Every screen is wrapped in Screen. It owns the safe areas; no screen assumes the bottom edge. */
export function Screen({
  title,
  children,
  footer,
  scroll = true,
  padded = true,
  edges = ALL_EDGES,
}: ScreenProps) {
  const { colors } = useTheme();
  const contentStyle = [padded && styles.padded, styles.gap];
  const body = (
    <>
      {title ? (
        <View style={!padded && styles.titleOnly}>
          <Text variant="title">{title}</Text>
        </View>
      ) : null}
      {children}
    </>
  );

  return (
    <SafeAreaView edges={edges} style={[styles.root, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {scroll ? (
          <ScrollView contentContainerStyle={contentStyle} keyboardShouldPersistTaps="handled">
            {body}
          </ScrollView>
        ) : (
          <View style={[styles.root, ...contentStyle]}>{body}</View>
        )}
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  padded: {
    padding: spacing.md,
  },
  gap: {
    gap: spacing.md,
  },
  titleOnly: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
});
