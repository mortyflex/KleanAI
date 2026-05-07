import React from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card } from '../../../components/ui/card';
import { KleanText } from '../../../components/ui/klean-text';
import { colors, radii } from '../../../design/tokens';
import type { MealSuggestion, MealType } from '../utils/meal-suggestions';

interface MealSuggestionsListProps {
  suggestions: Record<MealType, MealSuggestion | null>;
  /** Set of meal ids the user has marked as eaten today. */
  consumedIds?: ReadonlySet<string>;
  /** Called when the user taps the "I ate this" / "Undo" button on a card. */
  onToggleConsume?: (meal: MealSuggestion) => void;
  testID?: string;
}

const MEAL_LABEL_KEYS: Record<MealType, string> = {
  breakfast: 'meals.breakfast',
  lunch: 'meals.lunch',
  dinner: 'meals.dinner',
  snack: 'meals.snacks',
};

export function MealSuggestionsList({
  suggestions,
  consumedIds,
  onToggleConsume,
  testID,
}: MealSuggestionsListProps) {
  const { t } = useTranslation('common');
  const types: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
  const hasAny = types.some((typeKey) => suggestions[typeKey] !== null);

  if (!hasAny) {
    return (
      <Card
        style={{ gap: 8 }}
        testID={testID ?? 'nutrition-suggestions-empty'}
      >
        <KleanText variant="h3" color={colors.ink}>
          {t('nutrition.suggestions.noResultsTitle')}
        </KleanText>
        <KleanText variant="body" color={colors.muted}>
          {t('nutrition.suggestions.noResultsBody')}
        </KleanText>
      </Card>
    );
  }

  return (
    <View
      style={{ gap: 12 }}
      testID={testID ?? 'nutrition-suggestions-list'}
    >
      <View style={{ gap: 4, paddingHorizontal: 4 }}>
        <KleanText variant="h3" color={colors.ink}>
          {t('nutrition.suggestions.title')}
        </KleanText>
        <KleanText variant="body" color={colors.muted}>
          {t('nutrition.suggestions.subtitle')}
        </KleanText>
      </View>
      {types.map((typeKey) => {
        const meal = suggestions[typeKey];
        if (!meal) return null;
        const eaten = consumedIds?.has(meal.id) ?? false;
        return (
          <View
            key={typeKey}
            testID={`suggestion-${typeKey}`}
            style={{
              backgroundColor: eaten ? colors.mintLight : colors.card,
              borderRadius: radii.card,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              borderWidth: 1,
              borderColor: eaten ? colors.mint : colors.border,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: radii.icon + 2,
                backgroundColor: eaten ? colors.mint : colors.bg,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <KleanText variant="h3">{eaten ? '✓' : meal.emoji}</KleanText>
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <KleanText
                variant="caption"
                color={colors.muted}
                style={{ letterSpacing: 1, textTransform: 'uppercase' }}
              >
                {t(MEAL_LABEL_KEYS[typeKey])}
              </KleanText>
              <KleanText variant="body" color={colors.ink} weight="700">
                {t(meal.titleKey)}
              </KleanText>
              <KleanText variant="caption" color={colors.muted}>
                {t('nutrition.suggestions.kcalLine', {
                  kcal: meal.approxKcal,
                  protein: meal.approxProteinG,
                })}
              </KleanText>
            </View>
            {onToggleConsume ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t(
                  eaten
                    ? 'nutrition.suggestions.unmarkLabel'
                    : 'nutrition.suggestions.markLabel',
                )}
                onPress={() => onToggleConsume(meal)}
                testID={`suggestion-${typeKey}-toggle`}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: radii.pill,
                  borderWidth: 1,
                  borderColor: eaten ? colors.mint : colors.brand,
                  backgroundColor: eaten ? colors.card : colors.brand,
                }}
              >
                <KleanText
                  variant="caption"
                  weight="700"
                  color={eaten ? colors.mint : '#FFFFFF'}
                >
                  {t(
                    eaten
                      ? 'nutrition.suggestions.unmarkCta'
                      : 'nutrition.suggestions.markCta',
                  )}
                </KleanText>
              </Pressable>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
