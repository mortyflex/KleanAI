import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';

import { Card } from '../../../components/ui/card';
import { KleanText } from '../../../components/ui/klean-text';
import { PillButton } from '../../../components/ui/pill-button';
import { colors, radii } from '../../../design/tokens';
import { useOnboarding } from '../../onboarding/onboarding-context';
import { useConfirmedFridge } from '../../vision/hooks/useConfirmedFridge';
import { useChosenRecipes } from '../hooks/useChosenRecipes';
import { todayLogDate } from '../hooks/useDailyConsumption';
import {
  computeDailyPlan,
  planInputFromProfile,
} from '../utils/nutrition-plan';
import { getFullDayRecipePlan } from '../utils/recipe-engine';
import type { FullDayRecipePlan } from '../utils/recipe-engine';
import type { MealType } from '../utils/meal-suggestions';
import { buildFridgeFingerprint } from '../utils/fridge-fingerprint';

const MEAL_LABEL_KEYS: Record<MealType, string> = {
  breakfast: 'meals.breakfast',
  lunch: 'meals.lunch',
  dinner: 'meals.dinner',
  snack: 'meals.snacks',
};

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

/**
 * Generates a coherent full-day plan (one recipe per slot) and lets the user
 * accept it as-is or swap any single meal.
 */
export function FullDayRecipesScreen() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { profile } = useOnboarding();
  const { ingredientIds, unmappedLabels, loading: fridgeLoading } =
    useConfirmedFridge();
  const today = useMemo(() => todayLogDate(), []);
  const resolveLabel = useCallback((key: string) => t(key), [t]);
  const { choose } = useChosenRecipes(today, resolveLabel);

  const fridgeFingerprint = useMemo(
    () => buildFridgeFingerprint(ingredientIds ?? [], unmappedLabels ?? []),
    [ingredientIds, unmappedLabels],
  );

  const [plan, setPlan] = useState<FullDayRecipePlan | null>(null);
  const [loading, setLoading] = useState(true);

  const dailyPlan = useMemo(() => {
    const input = planInputFromProfile(profile);
    return input ? computeDailyPlan(input) : null;
  }, [profile]);

  useEffect(() => {
    if (fridgeLoading) return;
    setLoading(true);
    const computed = getFullDayRecipePlan({
      ingredientIds: ingredientIds ?? [],
      restrictions: profile.dietaryRestrictions ?? [],
      goal: profile.goal ?? 'maintain',
      targetDailyKcal: dailyPlan?.calories,
    });
    setPlan(computed);
    setLoading(false);
  }, [
    fridgeLoading,
    ingredientIds,
    profile.dietaryRestrictions,
    profile.goal,
    dailyPlan?.calories,
  ]);

  const handleAcceptAll = useCallback(async () => {
    if (!plan) return;
    for (const slot of MEAL_ORDER) {
      const match = plan[slot];
      if (match) await choose(slot, match.recipe, fridgeFingerprint);
    }
    router.replace('/(tabs)/nutrition');
  }, [choose, plan, router, fridgeFingerprint]);

  const handleSwap = useCallback(
    (mealType: MealType) => {
      router.push({
        pathname: '/recipes/list',
        params: { mealType },
      });
    },
    [router],
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
        <KleanText variant="h1" color={colors.ink}>
          {t('recipes.fullDay.title')}
        </KleanText>
        <KleanText variant="body" color={colors.muted}>
          {t('recipes.fullDay.subtitle')}
        </KleanText>
      </View>

      {loading && (
        <Card style={{ alignItems: 'center', paddingVertical: 28, gap: 8 }}>
          <ActivityIndicator color={colors.brand} />
          <KleanText variant="bodyMedium" color={colors.ink}>
            {t('recipes.fullDay.loading')}
          </KleanText>
        </Card>
      )}

      {!loading && plan && (
        <View style={{ gap: 12 }}>
          {MEAL_ORDER.map((slot) => {
            const match = plan[slot];
            return (
              <View
                key={slot}
                testID={`full-day-${slot}`}
                style={{
                  backgroundColor: colors.card,
                  borderRadius: radii.card,
                  padding: 16,
                  gap: 8,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <KleanText
                  variant="caption"
                  color={colors.muted}
                  weight="700"
                  style={{ letterSpacing: 1, textTransform: 'uppercase' }}
                >
                  {t(MEAL_LABEL_KEYS[slot])}
                </KleanText>
                {match ? (
                  <>
                    <KleanText variant="bodyMedium" color={colors.ink} weight="700">
                      {match.recipe.source === 'internal'
                        ? t(match.recipe.titleKey)
                        : match.recipe.title}
                    </KleanText>
                    <KleanText variant="caption" color={colors.muted}>
                      {t('recipes.estimates.kcalApprox', {
                        kcal: match.recipe.estimatedCalories,
                      })}
                      {' · '}
                      {t('recipes.estimates.proteinApprox', {
                        grams: match.recipe.estimatedProteinG,
                      })}
                    </KleanText>
                  </>
                ) : (
                  <KleanText variant="caption" color={colors.muted}>
                    {t('recipes.fullDay.slotEmpty')}
                  </KleanText>
                )}
                <PillButton
                  label={t('recipes.fullDay.swapCta')}
                  variant="outline"
                  size="sm"
                  onPress={() => handleSwap(slot)}
                  testID={`full-day-swap-${slot}`}
                />
              </View>
            );
          })}

          <PillButton
            label={t('recipes.fullDay.acceptCta')}
            onPress={handleAcceptAll}
            testID="full-day-accept"
          />
          <PillButton
            label={t('recipes.fullDay.backCta')}
            variant="ghost"
            onPress={() => router.back()}
          />
        </View>
      )}
    </ScrollView>
  );
}
