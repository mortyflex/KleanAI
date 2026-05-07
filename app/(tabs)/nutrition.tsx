import React, { useMemo, useState } from "react";
import { ScrollView, View, Text, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { nutrition, meals } from "../../src/data/mock";
import { Card } from "../../src/components/ui/card";
import { MacroBar } from "../../src/components/ui/macro-bar";
import { SectionHeader } from "../../src/components/ui/section-header";
import { PillButton } from "../../src/components/ui/pill-button";
import { colors, radii, shadows } from "../../src/design/tokens";
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
import { useConfirmedFridge } from "../../src/features/vision/hooks/useConfirmedFridge";

const MEAL_KEYS: Record<string, string> = {
  Breakfast: "meals.breakfast",
  Lunch:     "meals.lunch",
  Dinner:    "meals.dinner",
  Snacks:    "meals.snacks",
};

function MealCard({ meal }: { meal: (typeof meals)[0] }) {
  const { t } = useTranslation("common");
  const [expanded, setExpanded] = useState(false);
  const mealName = t(MEAL_KEYS[meal.name] ?? meal.name);

  return (
    <Pressable
      onPress={() => setExpanded((v) => !v)}
      style={{
        backgroundColor: colors.card, borderRadius: radii.card, overflow: "hidden",
        boxShadow: shadows.soft, borderCurve: "continuous",
      } as any}
    >
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12 }}>
        <View style={{ width: 42, height: 42, borderRadius: radii.icon + 2, backgroundColor: meal.logged ? colors.mintLight : colors.bg, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 20 }}>{meal.emoji}</Text>
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: colors.ink }}>{mealName}</Text>
          <Text style={{ fontSize: 12, color: colors.muted }}>
            {meal.logged ? meal.time : t("nutrition.meals.notLogged")}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 2 }}>
          {meal.logged ? (
            <>
              <Text style={{ fontSize: 16, fontWeight: "700", color: colors.ink }}>{meal.calories}</Text>
              <Text style={{ fontSize: 11, color: colors.muted }}>{t("nutrition.meals.kcalUnit")}</Text>
            </>
          ) : (
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.brand }}>{t("nutrition.meals.logFood")}</Text>
          )}
        </View>
      </View>
      {expanded && meal.logged && meal.items.length > 0 && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border, gap: 7 }}>
          {meal.items.map((item, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.muted }} />
              <Text style={{ fontSize: 13, color: colors.muted }}>{item}</Text>
            </View>
          ))}
        </View>
      )}
    </Pressable>
  );
}

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

export default function NutritionScreen() {
  const { t } = useTranslation("common");
  const { profile } = useOnboarding();
  const smoothingContext = useSmoothingContext();
  const { ingredientIds: fridgeIds } = useConfirmedFridge();

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

  // Use the computed plan when available, else fall back to mock for visual
  // continuity. The current/eaten counter still comes from mock data — we
  // intentionally don't wire a tracker here (Klean AI is not a food tracker).
  const calGoal = plan?.calories ?? nutrition.calories.goal;
  const calCurrent = nutrition.calories.current;
  const calPct = Math.min(100, Math.round((calCurrent / calGoal) * 100));
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
          <MacroBar label={t("nutrition.macros.protein")} current={nutrition.protein.current} goal={proteinGoal} unit="g" color={colors.brand}  trackColor={colors.brandLight}  />
          <MacroBar label={t("nutrition.macros.carbs")}   current={nutrition.carbs.current}   goal={carbsGoal}   unit="g" color={colors.amber}  trackColor={colors.amberLight}  />
          <MacroBar label={t("nutrition.macros.fat")}     current={nutrition.fat.current}     goal={fatGoal}     unit="g" color={colors.energy} trackColor={colors.energyLight} />
        </View>
      </Card>

      {/* ── Event reporter (zero-guilt, connects to smoothing) ── */}
      <NutritionEventReporter context={smoothingContext} />

      {/* ── Simple meal suggestions ── */}
      <MealSuggestionsList suggestions={suggestions} />

      {/* ── Meals (legacy mock log) ── */}
      <View style={{ gap: 12 }}>
        <SectionHeader title={t("nutrition.meals.title")} action={t("nutrition.meals.logFood")} />
        {meals.map((meal) => (
          <MealCard key={meal.id} meal={meal} />
        ))}
      </View>

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
