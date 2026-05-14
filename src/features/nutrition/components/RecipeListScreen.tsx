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
import { buildFridgeFingerprint } from '../utils/fridge-fingerprint';
import {
  buildRecipeCacheKey,
  getCachedRecipeResult,
  setCachedRecipeResult,
} from '../store/recipe-cache';
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
  const [regenerating, setRegenerating] = useState(false);

  // Fingerprint of the confirmed fridge — stored on the chosen recipe so the
  // Nutrition screen can later flag it as "may no longer match your fridge".
  const fridgeFingerprint = useMemo(
    () => buildFridgeFingerprint(ingredientIds ?? [], unmappedLabels ?? []),
    [ingredientIds, unmappedLabels],
  );

  /**
   * Resolves the recipe list for this meal type. Reads the persistent cache
   * first so opening the list (e.g. "Adapt with my fridge") costs **zero**
   * AI calls. `force: true` bypasses the cache for an explicit regenerate —
   * that is the only path that triggers a fresh Gemini call once a list has
   * been cached. Either way the result is written back to the cache.
   */
  const loadRecipes = useCallback(
    async (opts?: { force?: boolean }): Promise<HybridRecipeResult> => {
      const ids = ingredientIds ?? [];
      const unmapped = unmappedLabels ?? [];
      const goal = profile.goal ?? 'maintain';
      const restrictions = profile.dietaryRestrictions ?? [];
      const cacheKey = buildRecipeCacheKey({
        mealType,
        ingredientIds: ids,
        unmappedLabels: unmapped,
        goal,
        restrictions,
        language: i18n.language,
      });

      if (!opts?.force) {
        const cached = await getCachedRecipeResult(cacheKey);
        if (cached) return cached;
      }

      // Resolve localized display labels here so the AI generator (mock or
      // Gemini) writes the recipe in the user's language without ever
      // touching internal catalog ids like `greek_yogurt`.
      const labels = ids.map((id) =>
        t(`vision.ingredients.${id}`, { defaultValue: id }),
      );
      const fresh = await getHybridRecipesForMealType({
        mealType,
        ingredientIds: ids,
        ingredientLabels: labels,
        unmappedLabels: unmapped,
        goal,
        restrictions,
        limit: MAX_RECIPES_PER_MEAL_TYPE,
        language: i18n.language,
      });
      await setCachedRecipeResult(cacheKey, fresh).catch(() => {});
      return fresh;
    },
    [
      mealType,
      ingredientIds,
      unmappedLabels,
      profile.goal,
      profile.dietaryRestrictions,
      i18n.language,
      t,
    ],
  );

  useEffect(() => {
    if (fridgeLoading) return;
    let cancelled = false;
    setLoading(true);
    loadRecipes()
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
  }, [fridgeLoading, loadRecipes, mealType]);

  const handleRegenerate = useCallback(async () => {
    setRegenerating(true);
    try {
      const fresh = await loadRecipes({ force: true });
      rememberRecipes(mealType, fresh.matches.map((m) => m.recipe));
      setResult(fresh);
    } catch {
      // Keep the current list on failure — the cached suggestions stay valid.
    } finally {
      setRegenerating(false);
    }
  }, [loadRecipes, mealType]);

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
      await choose(mealType, match.recipe, fridgeFingerprint);
      router.replace('/(tabs)/nutrition');
    },
    [choose, mealType, result, router, fridgeFingerprint],
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
          {(unmappedLabels?.length ?? 0) > 0 && result.aiCount === 0 && (
            <Card style={{ gap: 4 }} testID="recipes-ai-unavailable">
              <KleanText variant="caption" color={colors.muted} weight="700">
                {t('recipes.list.aiUnavailableTitle')}
              </KleanText>
              <KleanText variant="caption" color={colors.muted}>
                {t('recipes.list.aiUnavailableBody')}
              </KleanText>
            </Card>
          )}
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

          {(result.aiCount > 0 || result.aiFailure) && (
            <View style={{ gap: 6 }}>
              <PillButton
                label={
                  regenerating
                    ? t('recipes.list.regeneratingAiCta')
                    : t('recipes.list.regenerateAiCta')
                }
                variant="outline"
                onPress={handleRegenerate}
                disabled={regenerating}
                testID="recipes-regenerate-ai"
              />
              <KleanText variant="caption" color={colors.muted}>
                {t('recipes.list.regenerateAiHint')}
              </KleanText>
            </View>
          )}
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
