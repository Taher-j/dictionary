import { useEffect } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/ui/Text';
import { useToastStore } from '@/ui/toastStore';
import { minTouchTarget, radius, spacing } from '@/ui/tokens';
import { useTheme } from '@/ui/useTheme';

const VISIBLE_MS = 4000;
/** Clears the tab bar so the toast never covers navigation. */
const TAB_BAR_CLEARANCE = 64;

/** Renders the current toast. Mounted once in the root layout. */
export function ToastHost() {
  const toast = useToastStore((s) => s.current);
  const hide = useToastStore((s) => s.hide);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!toast) return;
    AccessibilityInfo.announceForAccessibility(toast.message);
    // A toast with an action stays a little longer so it can be reached.
    const timer = setTimeout(() => hide(toast.id), toast.action ? VISIBLE_MS * 1.5 : VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [toast, hide]);

  if (!toast) return null;
  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: insets.bottom + TAB_BAR_CLEARANCE }]}
    >
      <View
        accessibilityLiveRegion="polite"
        style={[styles.toast, { backgroundColor: colors.text }]}
      >
        <Text style={[styles.message, { color: colors.background }]}>{toast.message}</Text>
        {toast.action ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              hide(toast.id);
              toast.action?.onPress();
            }}
            style={styles.action}
          >
            <Text variant="label" style={{ color: colors.background }}>
              {toast.action.label}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    start: spacing.md,
    end: spacing.md,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    paddingStart: spacing.md,
    paddingEnd: spacing.xs,
    minHeight: minTouchTarget + spacing.xs,
  },
  message: {
    flex: 1,
    paddingVertical: spacing.sm,
  },
  action: {
    minHeight: minTouchTarget,
    minWidth: minTouchTarget,
    paddingHorizontal: spacing.sm,
    justifyContent: 'center',
  },
});
