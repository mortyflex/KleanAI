import React, { useMemo, useCallback } from "react";
import { ScrollView, View, Text } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import { nutrition } from "../../src/data/mock";
import { Card } from "../../src/components/ui/card";
import { MacroBar } from "../../src/components/ui/macro-bar";
import { PillButton } from "../../src/components/ui/pill-button";
import { colors, radii } from "../../src/design/tokens";
import { useOnboarding } from "../../src/features/onboarding/onboarding-context";
import { useSmoothingContext } from "../../src/features/smoothing/hooks/useSmoothingContext";
import {
  DailyPlanCard,
  MealSuggestionsList,
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
import { useConfirmedFridge } from "../../src/features/vision/hooks/useConfirmedFridge";

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

function FridgeScanCard({
  ingredientCount,
  onPress,
}: {
  ingredientCount: number;
  onPress: () => void;
}) {
  const { t } = useTranslation("common");
  const hasFridge = ingredientCount > 0;
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
          <Text style={{ fontSize: 16, fontWeight: "700", color: colors.ink }}>
            {t("nutrition.fridgeScan.title")}
          </Text>
          <Text style={{ fontSize: 13, color: colors.muted }}>
            {hasFridge
              ? t("nutrition.fridgeScan.confirmedBody", { count: ingredientCount })
              : t("nutrition.fridgeScan.emptyBody")}
          </Text>
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
  const { ingredientIds: fridgeIds, reload: reloadFridge } = useConfirmedFridge();
  const today = useMemo(() => todayLogDate(), []);
  const consumption = useDailyConsumption(today);
  const handleScanFridge = useCallback(() => {
    router.push("/vision/fridge");
  }, [router]);

  // Re-read AsyncStorage on every focus so confirmations made on the Fridge
  // Vision screen propagate back to the meal suggestions without requiring a
  // full app restart. The tab stays mounted between navigations, so the
  // hook's mount-only effect would otherwise serve stale data.
  useFocusEffect(
    useCallback(() => {
      reloadFridge().catch(() => {});
    }, [reloadFridge]),
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

  const handleToggleConsume = useCallback(
    (meal: Parameters<typeof consumption.consume>[0]) => {
      if (consumedIds.has(meal.id)) {
        consumption.unconsume(meal.id);
      } else {
        consumption.consume(meal);
      }
    },
    [consumption, consumedIds],
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

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 64, paddingBottom: 48, gap: 20 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 30, fontWeight: "800", color: colors.ink }}>{t("nutrition.title")}</Text>
      </View>

      {/* ── Daily plan from goal ── */}
      <DailyPlanCard plan={plan} />

      {/* ── Today's totals (mock / coming from logger later) ── */}
      <Card style={{ gap: 18 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6 }}>
          <Text style={{ fontSize: 42, fontWeight: "800", color: colors.ink }}>{calCurrent.toLocaleString()}</Text>
          <Text style={{ fontSize: 15, color: colors.muted, paddingBottom: 7 }}>
            {t("nutrition.goalSuffix", { goal: calGoal.toLocaleString() })}
          </Text>
        </View>
        <View style={{ gap: 6 }}>
          <View style={{ height: 10, borderRadius: 100, backgroundColor: colors.mintLight, overflow: "hidden" }}>
            <View style={{ width: `${calPct}%` as any, height: "100%", borderRadius: 100, backgroundColor: colors.mint }} />
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 12, color: colors.muted }}>{t("nutrition.pctGoal", { pct: calPct })}</Text>
            <Text style={{ fontSize: 12, fontWeight: "600", color: colors.mint }}>
              {remaining > 0 ? t("nutrition.kcalLeft", { remaining }) : t("nutrition.goalReached")}
            </Text>
          </View>
        </View>
        <View style={{ gap: 14 }}>
          <MacroBar label={t("nutrition.macros.protein")} current={consumption.totals.proteinG} goal={proteinGoal} unit="g" color={colors.brand}  trackColor={colors.brandLight}  />
          <MacroBar label={t("nutrition.macros.carbs")}   current={consumption.totals.carbsG}   goal={carbsGoal}   unit="g" color={colors.amber}  trackColor={colors.amberLight}  />
          <MacroBar label={t("nutrition.macros.fat")}     current={consumption.totals.fatG}     goal={fatGoal}     unit="g" color={colors.energy} trackColor={colors.energyLight} />
        </View>
      </Card>

      {/* ── Fridge scan entry point ── */}
      <FridgeScanCard
        ingredientCount={fridgeIds?.length ?? 0}
        onPress={handleScanFridge}
      />

      {/* ── Event reporter (zero-guilt, connects to smoothing) ── */}
      <NutritionEventReporter context={smoothingContext} />

      {/* ── Simple meal suggestions ── */}
      <MealSuggestionsList
        suggestions={suggestions}
        consumedIds={consumedIds}
        onToggleConsume={handleToggleConsume}
      />

      {/* ── Hydration ── */}
      <Card style={{ gap: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ gap: 3 }}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: colors.muted, letterSpacing: 1, textTransform: "uppercase" }}>
              {t("nutrition.hydration.title")}
            </Text>
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.ink }}>
              {t("nutrition.hydration.glassCount", { current: nutrition.hydration.current, goal: plan?.hydrationGlasses ?? nutrition.hydration.goal })}
            </Text>
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
