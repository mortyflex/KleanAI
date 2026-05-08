import React, { useMemo, useCallback } from "react";
import { ScrollView, View, Text } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import { nutrition } from "../../src/data/mock";
import { Card } from "../../src/components/ui/card";
import { MacroBar } from "../../src/components/ui/macro-bar";
import { PillButton } from "../../src/components/ui/pill-button";
import { KleanText } from "../../src/components/ui/klean-text";
import { colors, radii } from "../../src/design/tokens";
import { useOnboarding } from "../../src/features/onboarding/onboarding-context";
import { useSmoothingContext } from "../../src/features/smoothing/hooks/useSmoothingContext";
import {
  NutritionEventReporter,
  computeDailyPlan,
  getDailyMealPlan,
  getDailyMealPlanWithFridge,
  planInputFromProfile,
} from "../../src/features/nutrition";
import {
  todayLogDate,
  useDailyConsumption,
} from "../../src/features/nutrition/hooks/useDailyConsumption";
import { useChosenRecipes } from "../../src/features/nutrition/hooks/useChosenRecipes";
import { MealSlotCard } from "../../src/features/nutrition/components/MealSlotCard";
import { useConfirmedFridge } from "../../src/features/vision/hooks/useConfirmedFridge";
import type { MealType } from "../../src/features/nutrition/utils/meal-suggestions";

const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

function WaterDrop({ filled }: { filled: boolean }) {
  return (
    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: filled ? colors.skyLight : colors.bg, borderWidth: 1.5, borderColor: filled ? colors.sky : colors.border, alignItems: "center", justifyContent: "center" }}>
      {filled
        ? <Text style={{ fontSize: 14 }}>💧</Text>
        : <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border }} />
      }
    </View>
  );
}

function FridgeSection({
  ingredientCount,
  unmappedCount,
  onPress,
}: {
  ingredientCount: number;
  unmappedCount: number;
  onPress: () => void;
}) {
  const { t } = useTranslation("common");
  const total = ingredientCount + unmappedCount;
  const hasFridge = total > 0;
  return (
    <Card style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: radii.icon + 2,
            backgroundColor: colors.brandLight,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 22 }}>🥗</Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <KleanText variant="bodyMedium" color={colors.ink} weight="700">
            {t("nutrition.fridgeScan.title")}
          </KleanText>
          <KleanText variant="caption" color={colors.muted}>
            {hasFridge
              ? t("nutrition.fridgeScan.confirmedBody", { count: total })
              : t("nutrition.fridgeScan.emptyBody")}
          </KleanText>
        </View>
      </View>
      <PillButton
        label={t(
          hasFridge
            ? "nutrition.fridgeScan.updateCta"
            : "nutrition.fridgeScan.scanCta",
        )}
        variant={hasFridge ? "outline" : "filled"}
        onPress={onPress}
        testID="nutrition-fridge-scan-cta"
      />
    </Card>
  );
}

export default function NutritionScreen() {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { profile } = useOnboarding();
  const smoothingContext = useSmoothingContext();
  const {
    ingredientIds: fridgeIds,
    unmappedLabels: fridgeUnmappedLabels,
    reload: reloadFridge,
  } = useConfirmedFridge();
  const today = useMemo(() => todayLogDate(), []);
  const consumption = useDailyConsumption(today);
  const resolveLabel = useCallback((key: string) => t(key), [t]);
  const { chosen, reload: reloadChosen } = useChosenRecipes(today, resolveLabel);

  // Re-read AsyncStorage on every focus so confirmations made on the Fridge
  // Vision and Recipe screens propagate back without a restart. The tab
  // stays mounted between navigations.
  useFocusEffect(
    useCallback(() => {
      reloadFridge().catch(() => {});
      reloadChosen().catch(() => {});
    }, [reloadFridge, reloadChosen]),
  );

  const plan = useMemo(() => {
    const input = planInputFromProfile(profile);
    return input ? computeDailyPlan(input) : null;
  }, [profile]);

  const suggestions = useMemo(() => {
    const restrictions = profile.dietaryRestrictions ?? [];
    if (fridgeIds && fridgeIds.length > 0) {
      return getDailyMealPlanWithFridge(fridgeIds, restrictions);
    }
    return getDailyMealPlan(restrictions);
  }, [profile.dietaryRestrictions, fridgeIds]);

  const consumedIds = useMemo(
    () => new Set(Object.keys(consumption.consumed)),
    [consumption.consumed],
  );

  const goToMealList = useCallback(
    (mealType: MealType) => {
      router.push({
        pathname: "/recipes/list",
        params: { mealType },
      });
    },
    [router],
  );

  const handleScanFridge = useCallback(() => {
    router.push("/vision/fridge");
  }, [router]);

  const handleMarkEaten = useCallback(
    (mealType: MealType) => {
      const chosenRecipe = chosen[mealType];
      if (chosenRecipe) {
        consumption.consumeRecipe(chosenRecipe);
        return;
      }
      const suggestion = suggestions[mealType];
      if (suggestion) {
        consumption.consume(suggestion);
      }
    },
    [chosen, consumption, suggestions],
  );

  const handleUnmarkEaten = useCallback(
    (mealType: MealType) => {
      const chosenRecipe = chosen[mealType];
      if (chosenRecipe) {
        consumption.unconsume(chosenRecipe.recipeId);
        return;
      }
      const suggestion = suggestions[mealType];
      if (suggestion) {
        consumption.unconsume(suggestion.id);
      }
    },
    [chosen, consumption, suggestions],
  );

  // Goal values come from the computed plan when the profile is complete;
  // they only fall back to the mock when the profile hasn't filled in yet
  // (visual placeholder, no tracking value). Current values come from
  // today's per-meal consumption — see useDailyConsumption.
  const calGoal = plan?.calories ?? nutrition.calories.goal;
  const calCurrent = consumption.totals.kcal;
  const calPct = calGoal > 0
    ? Math.min(100, Math.round((calCurrent / calGoal) * 100))
    : 0;
  const remaining = Math.max(0, calGoal - calCurrent);
  const proteinGoal = plan?.proteinG ?? nutrition.protein.goal;
  const carbsGoal = plan?.carbsG ?? nutrition.carbs.goal;
  const fatGoal = plan?.fatG ?? nutrition.fat.goal;

  const fridgeReady = (fridgeIds?.length ?? 0) > 0
    || (fridgeUnmappedLabels?.length ?? 0) > 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 64, paddingBottom: 48, gap: 18 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header + Hero ─────────────────────────────────────────── */}
      <View style={{ gap: 4 }}>
        <KleanText variant="caption" color={colors.muted} weight="700"
          style={{ letterSpacing: 1.2, textTransform: "uppercase" }}
        >
          {t("nutrition.today.kicker")}
        </KleanText>
        <KleanText variant="h1" color={colors.ink}>
          {t("nutrition.title")}
        </KleanText>
      </View>

      <Card style={{ gap: 14 }}>
        <View style={{ gap: 4 }}>
          <KleanText variant="caption" color={colors.muted}
            style={{ letterSpacing: 1.2, textTransform: "uppercase" }} weight="700"
          >
            {t("nutrition.plan.title")}
          </KleanText>
          <KleanText variant="body" color={colors.muted}>
            {t("nutrition.today.zeroGuilt")}
          </KleanText>
        </View>
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6 }}>
          <KleanText variant="display" color={colors.ink}>
            {calCurrent.toLocaleString()}
          </KleanText>
          <KleanText variant="body" color={colors.muted}
            style={{ paddingBottom: 6 }}
          >
            {t("nutrition.goalSuffix", { goal: calGoal.toLocaleString() })}
          </KleanText>
        </View>
        <View style={{ gap: 6 }}>
          <View style={{ height: 10, borderRadius: 100, backgroundColor: colors.mintLight, overflow: "hidden" }}>
            <View style={{ width: `${calPct}%` as any, height: "100%", borderRadius: 100, backgroundColor: colors.mint }} />
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <KleanText variant="caption" color={colors.muted}>
              {t("nutrition.pctGoal", { pct: calPct })}
            </KleanText>
            <KleanText variant="caption" color={colors.mint} weight="700">
              {remaining > 0 ? t("nutrition.kcalLeft", { remaining }) : t("nutrition.goalReached")}
            </KleanText>
          </View>
        </View>
        <View style={{ gap: 14 }}>
          <MacroBar label={t("nutrition.macros.protein")} current={consumption.totals.proteinG} goal={proteinGoal} unit="g" color={colors.brand}  trackColor={colors.brandLight}  />
          <MacroBar label={t("nutrition.macros.carbs")}   current={consumption.totals.carbsG}   goal={carbsGoal}   unit="g" color={colors.amber}  trackColor={colors.amberLight}  />
          <MacroBar label={t("nutrition.macros.fat")}     current={consumption.totals.fatG}     goal={fatGoal}     unit="g" color={colors.energy} trackColor={colors.energyLight} />
        </View>
        <KleanText variant="caption" color={colors.muted}>
          {t("recipes.estimates.disclaimer")}
        </KleanText>
      </Card>

      {/* ── Meal slots ────────────────────────────────────────────── */}
      <View style={{ gap: 6, paddingHorizontal: 4 }}>
        <KleanText variant="h3" color={colors.ink}>
          {t("nutrition.today.mealsTitle")}
        </KleanText>
        <KleanText variant="body" color={colors.muted}>
          {fridgeReady
            ? t("nutrition.today.mealsSubtitleWithFridge")
            : t("nutrition.today.mealsSubtitleNoFridge")}
        </KleanText>
      </View>

      <View style={{ gap: 12 }}>
        {MEAL_ORDER.map((mealType) => {
          const chosenRecipe = chosen[mealType] ?? null;
          const suggestion = suggestions[mealType] ?? null;
          const eatenId = chosenRecipe?.recipeId ?? suggestion?.id;
          const eaten = eatenId ? consumedIds.has(eatenId) : false;
          return (
            <MealSlotCard
              key={mealType}
              mealType={mealType}
              chosen={chosenRecipe}
              suggestion={suggestion}
              eaten={eaten}
              onChange={() => goToMealList(mealType)}
              onAdaptWithFridge={() =>
                fridgeReady ? goToMealList(mealType) : handleScanFridge()
              }
              onMarkEaten={() => handleMarkEaten(mealType)}
              onUnmarkEaten={() => handleUnmarkEaten(mealType)}
              testID={`nutrition-meal-${mealType}`}
            />
          );
        })}
      </View>

      {/* ── Fridge entry point ────────────────────────────────────── */}
      <FridgeSection
        ingredientCount={fridgeIds?.length ?? 0}
        unmappedCount={fridgeUnmappedLabels?.length ?? 0}
        onPress={handleScanFridge}
      />

      {/* ── Event reporter (zero-guilt, connects to smoothing) ───── */}
      <NutritionEventReporter context={smoothingContext} />

      {/* ── Hydration (kept) ──────────────────────────────────────── */}
      <Card style={{ gap: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ gap: 3 }}>
            <KleanText variant="caption" color={colors.muted} weight="700"
              style={{ letterSpacing: 1, textTransform: "uppercase" }}
            >
              {t("nutrition.hydration.title")}
            </KleanText>
            <KleanText variant="bodyMedium" color={colors.ink} weight="700">
              {t("nutrition.hydration.glassCount", { current: nutrition.hydration.current, goal: plan?.hydrationGlasses ?? nutrition.hydration.goal })}
            </KleanText>
          </View>
          <Text style={{ fontSize: 28 }}>💧</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {Array.from({ length: plan?.hydrationGlasses ?? nutrition.hydration.goal }).map((_, i) => (
            <WaterDrop key={i} filled={i < nutrition.hydration.current} />
          ))}
        </View>
        <View style={{ height: 7, borderRadius: 100, backgroundColor: colors.skyLight, overflow: "hidden" }}>
          <View style={{ width: `${(nutrition.hydration.current / (plan?.hydrationGlasses ?? nutrition.hydration.goal)) * 100}%` as any, height: "100%", borderRadius: 100, backgroundColor: colors.sky }} />
        </View>
        <PillButton label={t("nutrition.hydration.addGlass")} size="sm" variant="outline" />
      </Card>
    </ScrollView>
  );
}
