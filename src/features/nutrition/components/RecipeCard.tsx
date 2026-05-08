import React from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { KleanText } from '../../../components/ui/klean-text';
import { PillButton } from '../../../components/ui/pill-button';
import { colors, radii } from '../../../design/tokens';
import type { RecipeMatch } from '../../../types/recipe.types';
import { isAIGeneratedRecipe } from '../utils/recipe-engine';

interface RecipeCardProps {
  match: RecipeMatch;
  /** Tapping the card body navigates to the detail screen. */
  onView: () => void;
  /** Tapping the primary CTA stores the choice and exits the flow. */
  onChoose: () => void;
  testID?: string;
}

const TAG_COLOR_MAP: Record<string, { bg: string; fg: string }> = {
  high_protein: { bg: colors.brandLight, fg: colors.brand },
  quick: { bg: colors.amberLight, fg: colors.amber },
  low_calorie: { bg: colors.mintLight, fg: colors.mint },
  mass_gain: { bg: colors.skyLight, fg: colors.sky },
  recomposition: { bg: colors.brandMid, fg: colors.brand },
  vegetarian: { bg: colors.mintLight, fg: colors.mint },
  budget: { bg: colors.amberLight, fg: colors.amber },
  no_cook: { bg: colors.skyLight, fg: colors.sky },
};

function Chip({
  label,
  bg,
  fg,
  testID,
}: {
  label: string;
  bg: string;
  fg: string;
  testID?: string;
}) {
  return (
    <View
      testID={testID}
      style={{
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: radii.pill,
        backgroundColor: bg,
      }}
    >
      <KleanText variant="caption" color={fg} weight="700">
        {label}
      </KleanText>
    </View>
  );
}

/**
 * Recipe summary card. Intentionally light — keeps the user's attention on
 * the title, the rough macros, and the key badges. Detailed steps live on
 * the detail screen.
 */
export function RecipeCard({ match, onView, onChoose, testID }: RecipeCardProps) {
  const { t } = useTranslation('common');
  const { recipe } = match;
  const isAI = isAIGeneratedRecipe(recipe);

  const title = isAI ? recipe.title : t(recipe.titleKey);
  const description = isAI ? recipe.description : t(recipe.descriptionKey);

  const matchedNames: string[] = isAI
    ? []
    : match.matchedIngredientIds.map((id) =>
        t(`vision.ingredients.${id}`, { defaultValue: id }),
      );
  const missingNames: string[] = isAI
    ? []
    : match.missingIngredientIds.map((id) =>
        t(`vision.ingredients.${id}`, { defaultValue: id }),
      );

  return (
    <View
      testID={testID}
      style={{
        backgroundColor: colors.card,
        borderRadius: radii.card,
        padding: 18,
        gap: 12,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <KleanText variant="bodyMedium" color={colors.ink} weight="800">
            {title}
          </KleanText>
          <KleanText variant="caption" color={colors.muted} numberOfLines={2}>
            {description}
          </KleanText>
        </View>
        {isAI ? (
          <Chip
            label={t('recipes.badges.aiSuggested')}
            bg={colors.brandLight}
            fg={colors.brand}
            testID={`${testID ?? 'recipe-card'}-ai-badge`}
          />
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
        <View style={{ gap: 1 }}>
          <KleanText variant="caption" color={colors.muted} weight="700">
            {t('recipes.detail.timeLabel')}
          </KleanText>
          <KleanText variant="bodyMedium" color={colors.ink}>
            {t('recipes.detail.minutesValue', { minutes: recipe.prepTimeMinutes })}
          </KleanText>
        </View>
        <View style={{ gap: 1 }}>
          <KleanText variant="caption" color={colors.muted} weight="700">
            {t('recipes.detail.kcalLabel')}
          </KleanText>
          <KleanText variant="bodyMedium" color={colors.ink}>
            {t('recipes.estimates.kcalApprox', { kcal: recipe.estimatedCalories })}
          </KleanText>
        </View>
        <View style={{ gap: 1 }}>
          <KleanText variant="caption" color={colors.muted} weight="700">
            {t('recipes.detail.proteinLabel')}
          </KleanText>
          <KleanText variant="bodyMedium" color={colors.ink}>
            {t('recipes.estimates.proteinApprox', {
              grams: recipe.estimatedProteinG,
            })}
          </KleanText>
        </View>
      </View>

      {(match.goodFridgeMatch || recipe.tags.length > 0) && (
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          {match.goodFridgeMatch && (
            <Chip
              label={t('recipes.badges.goodFridgeMatch')}
              bg={colors.mintLight}
              fg={colors.mint}
              testID={`${testID ?? 'recipe-card'}-fridge-badge`}
            />
          )}
          {recipe.tags.slice(0, 3).map((tag) => {
            const palette = TAG_COLOR_MAP[tag] ?? {
              bg: colors.brandLight,
              fg: colors.brand,
            };
            return (
              <Chip
                key={tag}
                label={t(`recipes.tags.${tag}`, { defaultValue: tag })}
                bg={palette.bg}
                fg={palette.fg}
              />
            );
          })}
        </View>
      )}

      {!isAI && matchedNames.length + missingNames.length > 0 && (
        <View style={{ gap: 4 }}>
          {matchedNames.length > 0 && (
            <KleanText variant="caption" color={colors.mint}>
              {t('recipes.card.haveAlready', {
                items: matchedNames.join(', '),
              })}
            </KleanText>
          )}
          {missingNames.length > 0 && (
            <KleanText variant="caption" color={colors.muted}>
              {t('recipes.card.stillMissing', {
                items: missingNames.join(', '),
              })}
            </KleanText>
          )}
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable
          onPress={onView}
          accessibilityRole="button"
          testID={`${testID ?? 'recipe-card'}-view`}
          style={{
            flex: 1,
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: radii.pill,
            borderWidth: 1.5,
            borderColor: colors.border,
            alignItems: 'center',
            backgroundColor: colors.bg,
          }}
        >
          <KleanText variant="label" color={colors.ink}>
            {t('recipes.card.viewCta')}
          </KleanText>
        </Pressable>
        <PillButton
          label={t('recipes.card.chooseCta')}
          onPress={onChoose}
          testID={`${testID ?? 'recipe-card'}-choose`}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}
