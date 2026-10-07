import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/ui/Text';
import { minTouchTarget, radius, spacing } from '@/ui/tokens';
import { useTheme } from '@/ui/useTheme';

export interface SheetAction {
  key: string;
  label: string;
  onPress: () => void;
  destructive?: boolean;
  /** Marks the current choice (e.g. the word's dictionary in "Move to"). */
  selected?: boolean;
}

export interface ActionSheetProps {
  visible: boolean;
  title?: string;
  actions: readonly SheetAction[];
  onClose: () => void;
}

const ANIMATION_MS = 220;

/**
 * A bottom sheet with a list of actions and Cancel. Picking an action closes the sheet first.
 * The backdrop fades while the sheet slides; the Modal itself does not animate, or the dimming
 * would slide up with the sheet.
 */
export function ActionSheet({ visible, title, actions, onClose }: ActionSheetProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const duration = reduceMotion ? 0 : ANIMATION_MS;
  // Stays mounted while the closing animation runs.
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(0);
  const sheetHeight = useSharedValue(height);
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (visible) {
      progress.value = withTiming(1, { duration });
      return;
    }
    if (!mounted) return;
    progress.value = withTiming(0, { duration });
    const timer = setTimeout(() => setMounted(false), duration);
    return () => clearTimeout(timer);
  }, [visible, mounted, duration, progress]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * sheetHeight.value }],
  }));

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: colors.backdrop }, backdropStyle]}
      >
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
        />
      </Animated.View>
      <Animated.View
        accessibilityViewIsModal
        onLayout={(event) => {
          sheetHeight.value = event.nativeEvent.layout.height;
        }}
        style={[
          styles.sheet,
          { backgroundColor: colors.background, paddingBottom: insets.bottom + spacing.sm },
          sheetStyle,
        ]}
      >
        {title ? (
          <Text variant="heading" style={styles.title}>
            {title}
          </Text>
        ) : null}
        {/* Long lists (tags) scroll; Cancel stays visible below them. */}
        <ScrollView style={{ maxHeight: height * 0.6 }}>
          {actions.map((action) => (
            <Pressable
              key={action.key}
              accessibilityRole="button"
              accessibilityState={{ selected: action.selected }}
              onPress={() => {
                onClose();
                action.onPress();
              }}
              style={({ pressed }) => [
                styles.action,
                pressed && { backgroundColor: colors.surface },
              ]}
            >
              <Text
                variant="label"
                tone={action.destructive ? 'danger' : 'default'}
                style={action.selected && styles.selected}
              >
                {action.selected ? t('common.selectedItem', { label: action.label }) : action.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          style={({ pressed }) => [styles.action, pressed && { backgroundColor: colors.surface }]}
        >
          <Text variant="label" tone="muted">
            {t('common.cancel')}
          </Text>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  sheet: {
    marginTop: 'auto',
    borderTopStartRadius: radius.lg,
    borderTopEndRadius: radius.lg,
    paddingTop: spacing.sm,
  },
  title: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  action: {
    minHeight: minTouchTarget + spacing.xs,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  selected: {
    fontWeight: '700',
  },
});
