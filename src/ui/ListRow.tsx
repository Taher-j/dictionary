import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/ui/Text';
import { minTouchTarget, spacing } from '@/ui/tokens';
import { useTheme } from '@/ui/useTheme';

export interface ListRowProps {
  title: string;
  subtitle?: string | null;
  /** Rendered at the end edge (counts, buttons, a status badge). */
  trailing?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

/** A tappable row, at least 48 dp high; the subtitle is one line. */
export function ListRow({
  title,
  subtitle,
  trailing,
  onPress,
  accessibilityLabel,
  accessibilityHint,
}: ListRowProps) {
  const { colors } = useTheme();
  const content = (
    <>
      <View style={styles.text}>
        <Text variant="label" numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text tone="muted" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
    </>
  );
  const rowStyle = [styles.row, { borderBottomColor: colors.border }];

  if (!onPress) return <View style={rowStyle}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [...rowStyle, pressed && { backgroundColor: colors.surface }]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: minTouchTarget + spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  text: {
    flex: 1,
    gap: 2,
  },
});
