import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Rating } from '@/domain/models';
import type { RatingPreview } from '@/domain/scheduler';
import { RATINGS } from '@/domain/scheduler';
import { useIntervalLabel } from '@/features/review/hooks/useIntervalLabel';
import { Text } from '@/ui/Text';
import { minTouchTarget, radius, spacing } from '@/ui/tokens';
import { useTheme } from '@/ui/useTheme';

const RATING_KEYS = { 1: 'again', 2: 'hard', 3: 'good', 4: 'easy' } as const satisfies Record<
  Rating,
  string
>;

export interface RatingButtonsProps {
  /** Intervals per rating; left out in free practice, which schedules nothing. */
  preview?: Record<Rating, RatingPreview>;
  disabled: boolean;
  onRate: (rating: Rating) => void;
}

/** Again / Hard / Good / Easy, each with the interval it would give ("Good · 3 d"). */
export function RatingButtons({ preview, disabled, onRate }: RatingButtonsProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const intervalLabel = useIntervalLabel();

  return (
    <View style={styles.row}>
      {RATINGS.map((rating) => {
        const name = t(`review.rating.${RATING_KEYS[rating]}`);
        const interval = preview ? intervalLabel(preview[rating].intervalMs) : null;
        return (
          <Pressable
            key={rating}
            accessibilityRole="button"
            accessibilityLabel={
              interval ? t('review.ratingLabel', { rating: name, interval: interval.long }) : name
            }
            accessibilityState={{ disabled }}
            disabled={disabled}
            onPress={() => onRate(rating)}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.surface, borderColor: colors.border },
              (pressed || disabled) && styles.dimmed,
            ]}
          >
            <Text variant="label" style={styles.center} tone={rating === 1 ? 'danger' : 'default'}>
              {name}
            </Text>
            {interval ? (
              <Text variant="caption" tone="muted" style={styles.center}>
                {interval.short}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  button: {
    flexGrow: 1,
    flexBasis: 70,
    minHeight: minTouchTarget + spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  dimmed: {
    opacity: 0.6,
  },
  center: {
    textAlign: 'center',
  },
});
