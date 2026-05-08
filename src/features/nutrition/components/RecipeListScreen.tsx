import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Card } from '../../../components/ui/card';
import { KleanText } from '../../../components/ui/klean-text';
import { PillButton } from '../../../components/ui/pill-button';
import { colors } from '../../../design/tokens';
import { useOnboarding } from '../../onboarding/onboarding-context';
import { useConfirmedFridge } from '../../vision/hooks/useConfirmedFridge';
import { useChosenRecipes } from '../hooks/useChosenRecipes';
import {
  todayLogDate,
} from '../hooks/useDailyConsumption';
import {
  getHybridRecipesForMealType,
  type HybridRecipeResult,
} from '../services/recipe-suggestion.service';
import {
  isAIGeneratedRecipe,
  isInternalRecipe,
  MAX_RECIPES_PER_MEAL_TYPE,
} from '../utils/recipe-engine';
import type { MealType } from '../utils/meal-suggestions';
import { rememberRecipes } from '../utils/recent-recipes-cache';
import { RecipeCard } from './RecipeCard';

const MEAL_TITLE_KEYS: Record<MealType, string> = {
  breakfast: 'meals.breakfast',
  lunch: 'meals.lunch',
  dinner: 'meals.dinner',
  snack: 'meals.snacks',
};

const VALID_MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

function isMealType(value: unknown): value is MealType {
  return typeof value === 'string' && VALID_MEAL_TYPES.includes(value as MealType);
}

/**
 * Recipe recommendations for a single meal type. Always shows up to
 * `MAX_RECIPES_PER_MEAL_TYPE` (3) results, blending the internal catalog
 * with AI-generated complementary recipes.
 */
export function RecipeListScreen() {
  const { t, i18n } = useTranslation('common');
  const router = useRouter();
  const params = useLocalSearchParams<{ mealType?: string }>();
  const { profile } = useOnboarding();
  const { ingredientIds, unmappedLabels, loading: fridgeLoading } =
    useConfirmedFridge();
  const today = useMemo(() => todayLogDate(), []);
  const resolveLabel = useCallback((key: string) => t(key), [t]);
  const { choose } = useChosenRecipes(today, resolveLabel);

  const mealType: MealType = isMealType(params.mealType)
    ? params.mealType
    : 'lunch';

  const [result, setResult] = useState<HybridRecipeResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (fridgeLoading) return;
    let cancelled = false;
    setLoading(true);
    getHybridRecipesForMealType({
      mealType,
      ingredientIds: ingredientIds ?? [],
      unmappedLabels: unmappedLabels ?? [],
      goal: profile.goal ?? 'maintain',
      restrictions: profile.dietaryRestrictions ?? [],
      limit: MAX_RECIPES_PER_MEAL_TYPE,
      language: i18n.language,
    })
      .then((res) => {
        if (cancelled) return;
        rememberRecipes(mealType, res.matches.map((m) => m.recipe));
        setResult(res);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setResult({ matches: [], internalCount: 0, aiCount: 0 });
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    fridgeLoading,
    mealType,
    ingredientIds,
    unmappedLabels,
    profile.goal,
    profile.dietaryRestrictions,
    i18n.language,
  ]);

  const handleViewRecipe = useCallback(
    (recipeId: string) => {
      router.push({
        pathname: '/recipes/detail',
        params: { mealType, recipeId },
      });
    },
    [router, mealType],
  );

  const handleChooseRecipe = useCallback(
    async (recipeId: string) => {
      const match = result?.matches.find(
        (m) => buildSelectionId(m.recipe) === recipeId,
      );
      if (!match) return;
      await choose(mealType, match.recipe);
      router.replace('/(tabs)/nutrition');
    },
    [choose, mealType, result, router],
  );

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
          {t(MEAL_TITLE_KEYS[mealType])}
        </KleanText>
        <KleanText variant="h1" color={colors.ink}>
          {t('recipes.list.title')}
        </KleanText>
        <KleanText variant="body" color={colors.muted}>
          {t('recipes.list.subtitle')}
        </KleanText>
      </View>

      {loading && (
        <Card style={{ alignItems: 'center', gap: 10, paddingVertical: 32 }}>
          <ActivityIndicator color={colors.brand} />
          <KleanText variant="bodyMedium" color={colors.ink}>
            {t('recipes.list.loading')}
          </KleanText>
        </Card>
      )}

      {!loading && result && result.matches.length === 0 && (
        <Card style={{ gap: 10 }} testID="recipes-empty">
          <KleanText variant="h3" color={colors.ink}>
            {t('recipes.list.emptyTitle')}
          </KleanText>
          <KleanText variant="body" color={colors.muted}>
            {t('recipes.list.emptyBody')}
          </KleanText>
          <PillButton
            label={t('recipes.list.scanFridgeCta')}
            onPress={() => router.push('/vision/fridge')}
            testID="recipes-empty-scan"
          />
        </Card>
      )}

      {!loading && result && result.matches.length > 0 && (
        <View style={{ gap: 14 }}>
          {result.matches.map((match) => {
            const recipeId = buildSelectionId(match.recipe);
            return (
              <RecipeCard
                key={recipeId}
                match={match}
                onView={() => handleViewRecipe(recipeId)}
                onChoose={() => handleChooseRecipe(recipeId)}
                testID={`recipe-card-${recipeId}`}
              />
            );
          })}
        </View>
      )}

      <PillButton
        label={t('recipes.list.backCta')}
        variant="ghost"
        onPress={() => router.back()}
      />
    </ScrollView>
  );
}

/** Stable id used to match a card back to its recipe across screens. */
export function buildSelectionId(
  recipe: HybridRecipeResult['matches'][number]['recipe'],
): string {
  if (isInternalRecipe(recipe)) return `internal:${recipe.id}`;
  if (isAIGeneratedRecipe(recipe)) return recipe.id;
  return 'unknown';
}
