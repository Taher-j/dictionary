import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
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

/** A bottom sheet with a list of actions and Cancel. Picking an action closes the sheet first. */
export function ActionSheet({ visible, title, actions, onClose }: ActionSheetProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={[styles.backdrop, { backgroundColor: colors.backdrop }]}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={t('common.close')}
      />
      <View
        accessibilityViewIsModal
        style={[
          styles.sheet,
          { backgroundColor: colors.background, paddingBottom: insets.bottom + spacing.sm },
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
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  sheet: {
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
