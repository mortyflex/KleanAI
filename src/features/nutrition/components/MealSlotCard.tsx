import React from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { KleanText } from '../../../components/ui/klean-text';
import { PillButton } from '../../../components/ui/pill-button';
import { colors, radii } from '../../../design/tokens';
import type { ChosenRecipeSnapshot } from '../../../types/recipe.types';
import type { MealSuggestion, MealType } from '../utils/meal-suggestions';

const MEAL_LABEL_KEYS: Record<MealType, string> = {
  breakfast: 'meals.breakfast',
  lunch: 'meals.lunch',
  dinner: 'meals.dinner',
  snack: 'meals.snacks',
};

const MEAL_PALETTE: Record<MealType, { bg: string; fg: string; emoji: string }> = {
  breakfast: { bg: colors.amberLight, fg: colors.amber, emoji: '🍳' },
  lunch: { bg: colors.mintLight, fg: colors.mint, emoji: '🥗' },
  dinner: { bg: colors.brandLight, fg: colors.brand, emoji: '🍽️' },
  snack: { bg: colors.skyLight, fg: colors.sky, emoji: '🥄' },
};

interface MealSlotCardProps {
  mealType: MealType;
  /** Recipe snapshot the user chose for this slot, or null if no choice yet. */
  chosen: ChosenRecipeSnapshot | null;
  /** Suggestion fallback when no chosen recipe — keeps the screen useful. */
  suggestion: MealSuggestion | null;
  eaten: boolean;
  /** "Voir la recette" — opens the detail view of the currently displayed recipe. */
  onViewRecipe: () => void;
  /** "Adapter avec mon frigo" — opens the recipe list biased by the user's fridge. */
  onAdaptWithFridge: () => void;
  onMarkEaten: () => void;
  onUnmarkEaten: () => void;
  testID?: string;
}

/**
 * Premium meal slot card — surfaces the user's chosen recipe (or the
 * fridge-aware suggestion) and exposes the three core actions: change,
 * adapt with fridge, mark as eaten.
 */
export function MealSlotCard({
  mealType,
  chosen,
  suggestion,
  eaten,
  onViewRecipe,
  onAdaptWithFridge,
  onMarkEaten,
  onUnmarkEaten,
  testID,
}: MealSlotCardProps) {
  const { t } = useTranslation('common');
  const palette = MEAL_PALETTE[mealType];

  const title = chosen
    ? chosen.title
    : suggestion
      ? t(suggestion.titleKey)
      : t('nutrition.today.slotEmptyTitle');
  const description = chosen
    ? chosen.description
    : suggestion
      ? t(suggestion.bodyKey)
      : t('nutrition.today.slotEmptyBody');
  const kcal = chosen ? chosen.estimatedCalories : suggestion?.approxKcal;
  const proteinG = chosen
    ? chosen.estimatedProteinG
    : suggestion?.approxProteinG;
  const tags = chosen ? chosen.tags : [];
  const isAIChosen = chosen?.source === 'ai';

  return (
    <View
      testID={testID}
      style={{
        backgroundColor: colors.card,
        borderRadius: radii.card,
        padding: 18,
        gap: 12,
        borderWidth: 1,
        borderColor: eaten ? colors.mint : colors.border,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: radii.icon + 4,
            backgroundColor: eaten ? colors.mint : palette.bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <KleanText variant="h3" color={eaten ? '#FFFFFF' : palette.fg}>
            {eaten ? '✓' : palette.emoji}
          </KleanText>
        </View>
        <View style={{ flex: 1 }}>
          <KleanText
            variant="caption"
            color={colors.muted}
            weight="700"
            style={{ letterSpacing: 1, textTransform: 'uppercase' }}
          >
            {t(MEAL_LABEL_KEYS[mealType])}
          </KleanText>
          <KleanText variant="bodyMedium" color={colors.ink} weight="700">
            {title}
          </KleanText>
        </View>
        {isAIChosen && (
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: radii.pill,
              backgroundColor: colors.brandLight,
            }}
          >
            <KleanText variant="caption" color={colors.brand} weight="700">
              {t('recipes.badges.aiSuggested')}
            </KleanText>
          </View>
        )}
      </View>

      <KleanText variant="caption" color={colors.muted}>
        {description}
      </KleanText>

      {(kcal || proteinG) && (
        <KleanText variant="caption" color={colors.muted}>
          {kcal
            ? t('recipes.estimates.kcalApprox', { kcal })
            : ''}
          {kcal && proteinG ? ' · ' : ''}
          {proteinG
            ? t('recipes.estimates.proteinApprox', { grams: proteinG })
            : ''}
        </KleanText>
      )}

      {tags.length > 0 && (
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          {tags.slice(0, 3).map((tag) => (
            <View
              key={tag}
              style={{
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: radii.pill,
                backgroundColor: palette.bg,
              }}
            >
              <KleanText variant="caption" color={palette.fg} weight="700">
                {t(`recipes.tags.${tag}`, { defaultValue: tag })}
              </KleanText>
            </View>
          ))}
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <Pressable
          onPress={onViewRecipe}
          accessibilityRole="button"
          testID={`${testID ?? 'meal-slot'}-view`}
          style={{
            flex: 1,
            minWidth: 130,
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: radii.pill,
            borderWidth: 1.5,
            borderColor: colors.border,
            alignItems: 'center',
            backgroundColor: colors.bg,
          }}
        >
          <KleanText variant="label" color={colors.ink}>
            {t('nutrition.today.viewRecipeCta')}
          </KleanText>
        </Pressable>
        <Pressable
          onPress={onAdaptWithFridge}
          accessibilityRole="button"
          testID={`${testID ?? 'meal-slot'}-adapt`}
          style={{
            flex: 1,
            minWidth: 130,
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: radii.pill,
            borderWidth: 1.5,
            borderColor: colors.brand,
            alignItems: 'center',
            backgroundColor: colors.brandLight,
          }}
        >
          <KleanText variant="label" color={colors.brand}>
            {t('nutrition.today.adaptCta')}
          </KleanText>
        </Pressable>
      </View>

      {(chosen || suggestion) && (
        <PillButton
          label={
            eaten
              ? t('nutrition.suggestions.unmarkCta')
              : t('nutrition.suggestions.markCta')
          }
          variant={eaten ? 'outline' : 'filled'}
          size="sm"
          onPress={eaten ? onUnmarkEaten : onMarkEaten}
          testID={`${testID ?? 'meal-slot'}-eat`}
        />
      )}
    </View>
  );
}
