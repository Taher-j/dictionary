import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { KeyboardAvoidingView, KeyboardAwareScrollView } from 'react-native-keyboard-controller';
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
  /**
   * Move content out of the keyboard's way. Form sheets pass false: the native sheet already
   * moves itself above the keyboard, and avoiding it twice pushes the content off screen.
   */
  avoidKeyboard?: boolean;
}

/** Every screen is wrapped in Screen. It owns the safe areas; no screen assumes the bottom edge. */
export function Screen({
  title,
  children,
  footer,
  scroll = true,
  padded = true,
  edges = ALL_EDGES,
  avoidKeyboard = true,
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
      {/* keyboard-controller: React Native's own KeyboardAvoidingView misbehaves with
          Android edge-to-edge (docs/08-decisions.md). */}
      <KeyboardAvoidingView style={styles.root} behavior="padding" enabled={avoidKeyboard}>
        {scroll && !avoidKeyboard ? (
          <ScrollView contentContainerStyle={contentStyle} keyboardShouldPersistTaps="handled">
            {body}
          </ScrollView>
        ) : scroll ? (
          <KeyboardAwareScrollView
            contentContainerStyle={contentStyle}
            keyboardShouldPersistTaps="handled"
            bottomOffset={spacing.lg}
          >
            {body}
          </KeyboardAwareScrollView>
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
