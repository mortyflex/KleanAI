import React, { useCallback, useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Card } from '../../../components/ui/card';
import { KleanText } from '../../../components/ui/klean-text';
import { PillButton } from '../../../components/ui/pill-button';
import { colors, radii } from '../../../design/tokens';
import { useChosenRecipes } from '../hooks/useChosenRecipes';
import { todayLogDate } from '../hooks/useDailyConsumption';
import { RECIPE_BY_ID } from '../data/recipe-catalog';
import { getRecipeIngredientQuantity } from '../data/recipe-quantities';
import { formatQuantity } from '../utils/format-quantity';
import {
  isAIGeneratedRecipe,
  isInternalRecipe,
} from '../utils/recipe-engine';
import { getRememberedRecipe } from '../utils/recent-recipes-cache';
import type {
  AIGeneratedRecipe,
  ChosenRecipeSnapshot,
  Recipe,
} from '../../../types/recipe.types';
import type { MealType } from '../utils/meal-suggestions';

const VALID_MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_LABEL_KEYS: Record<MealType, string> = {
  breakfast: 'meals.breakfast',
  lunch: 'meals.lunch',
  dinner: 'meals.dinner',
  snack: 'meals.snacks',
};

function isMealType(value: unknown): value is MealType {
  return typeof value === 'string' && VALID_MEAL_TYPES.includes(value as MealType);
}

function snapshotToAIRecipe(snapshot: ChosenRecipeSnapshot): AIGeneratedRecipe {
  return {
    id: snapshot.recipeId,
    source: 'ai',
    mealType: snapshot.mealType,
    title: snapshot.title,
    description: snapshot.description,
    ingredientLabels: [],
    prepTimeMinutes: snapshot.prepTimeMinutes,
    difficulty: 'easy',
    estimatedCalories: snapshot.estimatedCalories,
    estimatedProteinG: snapshot.estimatedProteinG,
    estimatedCarbsG: snapshot.estimatedCarbsG,
    estimatedFatG: snapshot.estimatedFatG,
    steps: [],
    tags: snapshot.tags,
  };
}

function lookupRecipe(
  recipeId: string | undefined,
  mealType: MealType,
  chosenSnapshot: ChosenRecipeSnapshot | undefined,
): Recipe | null {
  if (!recipeId) return null;
  if (recipeId.startsWith('internal:')) {
    const internalId = recipeId.slice('internal:'.length);
    const fromCatalog = RECIPE_BY_ID.get(internalId);
    if (fromCatalog) return fromCatalog;
  }
  const remembered = getRememberedRecipe(mealType, recipeId);
  if (remembered) return remembered;
  // Fallback for AI recipes after a restart: rebuild a minimal recipe shape
  // from the persisted snapshot so the user still gets a usable detail view.
  if (chosenSnapshot && chosenSnapshot.recipeId === recipeId) {
    return snapshotToAIRecipe(chosenSnapshot);
  }
  return null;
}

export function RecipeDetailScreen() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const params = useLocalSearchParams<{
    mealType?: string;
    recipeId?: string;
  }>();

  const mealType: MealType = isMealType(params.mealType)
    ? params.mealType
    : 'lunch';

  const today = useMemo(() => todayLogDate(), []);
  const resolveLabel = useCallback((key: string) => t(key), [t]);
  const { chosen, choose } = useChosenRecipes(today, resolveLabel);

  const recipe = useMemo(
    () => lookupRecipe(params.recipeId, mealType, chosen[mealType]),
    [params.recipeId, mealType, chosen],
  );

  const handleChoose = useCallback(async () => {
    if (!recipe) return;
    await choose(mealType, recipe);
    router.replace('/(tabs)/nutrition');
  }, [choose, mealType, recipe, router]);

  if (!recipe) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 64,
          paddingBottom: 48,
          gap: 18,
        }}
      >
        <Card style={{ gap: 10 }}>
          <KleanText variant="h3" color={colors.ink}>
            {t('recipes.detail.unavailableTitle')}
          </KleanText>
          <KleanText variant="body" color={colors.muted}>
            {t('recipes.detail.unavailableBody')}
          </KleanText>
          <PillButton
            label={t('recipes.detail.backCta')}
            variant="outline"
            onPress={() => router.back()}
          />
        </Card>
      </ScrollView>
    );
  }

  const isAI = isAIGeneratedRecipe(recipe);
  const isInternal = isInternalRecipe(recipe);
  const title = isInternal ? t(recipe.titleKey) : recipe.title;
  const description = isInternal
    ? t(recipe.descriptionKey)
    : recipe.description;
  const ingredientLabels = isInternal
    ? recipe.ingredientIds.map((id) => {
        const name = t(`vision.ingredients.${id}`, { defaultValue: id });
        const quantity = getRecipeIngredientQuantity(recipe.id, id);
        return quantity ? `${formatQuantity(quantity, t)} · ${name}` : name;
      })
    : recipe.ingredientLabels;
  const optionalLabels =
    isInternal && recipe.optionalIngredientIds
      ? recipe.optionalIngredientIds.map((id) => {
          const name = t(`vision.ingredients.${id}`, { defaultValue: id });
          const quantity = getRecipeIngredientQuantity(recipe.id, id);
          return quantity ? `${formatQuantity(quantity, t)} · ${name}` : name;
        })
      : [];
  const steps = isInternal ? recipe.stepKeys.map((k) => t(k)) : recipe.steps;
  const tags = recipe.tags ?? [];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: 64,
        paddingBottom: 48,
        gap: 18,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ gap: 6 }}>
        <KleanText variant="caption" color={colors.muted} weight="700"
          style={{ letterSpacing: 1.2, textTransform: 'uppercase' }}
        >
          {t(MEAL_LABEL_KEYS[mealType])}
        </KleanText>
        <KleanText variant="h1" color={colors.ink}>
          {title}
        </KleanText>
        <KleanText variant="body" color={colors.muted}>
          {description}
        </KleanText>
        {isAI && (
          <View
            style={{
              alignSelf: 'flex-start',
              marginTop: 8,
              paddingHorizontal: 10,
              paddingVertical: 4,
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

      <Card style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
          <DetailStat
            labelKey="recipes.detail.timeLabel"
            value={t('recipes.detail.minutesValue', {
              minutes: recipe.prepTimeMinutes,
            })}
          />
          <DetailStat
            labelKey="recipes.detail.difficultyLabel"
            value={t(`recipes.difficulty.${recipe.difficulty}`)}
          />
          <DetailStat
            labelKey="recipes.detail.kcalLabel"
            value={t('recipes.estimates.kcalApprox', {
              kcal: recipe.estimatedCalories,
            })}
          />
          <DetailStat
            labelKey="recipes.detail.proteinLabel"
            value={t('recipes.estimates.proteinApprox', {
              grams: recipe.estimatedProteinG,
            })}
          />
        </View>
        <KleanText variant="caption" color={colors.muted}>
          {t('recipes.estimates.disclaimer')}
        </KleanText>
      </Card>

      <Card style={{ gap: 8 }}>
        <KleanText variant="caption" color={colors.muted} weight="700"
          style={{ letterSpacing: 1, textTransform: 'uppercase' }}
        >
          {t('recipes.detail.ingredientsLabel')}
        </KleanText>
        {ingredientLabels.map((label, i) => (
          <KleanText
            key={`req-${i}`}
            variant="body"
            color={colors.ink}
            testID={`recipe-detail-ingredient-${i}`}
          >
            • {label}
          </KleanText>
        ))}
        {optionalLabels.length > 0 && (
          <View style={{ gap: 4, marginTop: 8 }}>
            <KleanText variant="caption" color={colors.muted} weight="700"
              style={{ letterSpacing: 1, textTransform: 'uppercase' }}
            >
              {t('recipes.detail.optionalLabel')}
            </KleanText>
            {optionalLabels.map((label, i) => (
              <KleanText key={`opt-${i}`} variant="body" color={colors.muted}>
                • {label}
              </KleanText>
            ))}
          </View>
        )}
      </Card>

      <Card style={{ gap: 8 }}>
        <KleanText variant="caption" color={colors.muted} weight="700"
          style={{ letterSpacing: 1, textTransform: 'uppercase' }}
        >
          {t('recipes.detail.stepsLabel')}
        </KleanText>
        {steps.map((step, i) => (
          <KleanText
            key={`step-${i}`}
            variant="body"
            color={colors.ink}
            testID={`recipe-detail-step-${i}`}
          >
            {i + 1}. {step}
          </KleanText>
        ))}
      </Card>

      {tags.length > 0 && (
        <Card style={{ gap: 6 }}>
          <KleanText variant="caption" color={colors.muted} weight="700"
            style={{ letterSpacing: 1, textTransform: 'uppercase' }}
          >
            {t('recipes.detail.whyItFitsLabel')}
          </KleanText>
          <KleanText variant="body" color={colors.ink}>
            {tags
              .map((tag) =>
                t(`recipes.tags.${tag}`, { defaultValue: tag }),
              )
              .join(' · ')}
          </KleanText>
        </Card>
      )}

      <PillButton
        label={t('recipes.detail.chooseCta')}
        onPress={handleChoose}
        testID="recipe-detail-choose"
      />
      <PillButton
        label={t('recipes.detail.backCta')}
        variant="ghost"
        onPress={() => router.back()}
      />
    </ScrollView>
  );
}

function DetailStat({
  labelKey,
  value,
}: {
  labelKey: string;
  value: string;
}) {
  const { t } = useTranslation('common');
  return (
    <View style={{ gap: 2 }}>
      <KleanText variant="caption" color={colors.muted} weight="700">
        {t(labelKey)}
      </KleanText>
      <KleanText variant="bodyMedium" color={colors.ink}>
        {value}
      </KleanText>
    </View>
  );
}
