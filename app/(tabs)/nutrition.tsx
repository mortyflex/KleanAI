import React, { useState } from "react";
import { ScrollView, View, Text, Pressable } from "react-native";
import { nutrition, meals } from "../../src/data/mock";
import { Card } from "../../src/components/ui/card";
import { MacroBar } from "../../src/components/ui/macro-bar";
import { SectionHeader } from "../../src/components/ui/section-header";
import { PillButton } from "../../src/components/ui/pill-button";
import { colors, radii, shadows } from "../../src/design/tokens";

function MealCard({ meal }: { meal: (typeof meals)[0] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Pressable
      onPress={() => setExpanded((v) => !v)}
      style={{
        backgroundColor: colors.card,
        borderRadius: radii.card,
        overflow: "hidden",
        boxShadow: shadows.soft,
        borderCurve: "continuous",
      } as any}
    >
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12 }}>
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: radii.icon + 2,
            backgroundColor: meal.logged ? colors.mintLight : colors.bg,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 20 }}>{meal.emoji}</Text>
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: colors.ink }}>{meal.name}</Text>
          <Text style={{ fontSize: 12, color: colors.muted }}>{meal.logged ? meal.time : "Not logged yet"}</Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 2 }}>
          {meal.logged ? (
            <>
              <Text style={{ fontSize: 16, fontWeight: "700", color: colors.ink }}>{meal.calories}</Text>
              <Text style={{ fontSize: 11, color: colors.muted }}>kcal</Text>
            </>
          ) : (
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.brand }}>+ Add</Text>
          )}
        </View>
      </View>

      {expanded && meal.logged && meal.items.length > 0 && (
        <View
          style={{
            paddingHorizontal: 16,
            paddingBottom: 14,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            gap: 7,
          }}
        >
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
    <View
      style={{
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: filled ? colors.skyLight : colors.bg,
        borderWidth: 1.5,
        borderColor: filled ? colors.sky : colors.border,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {filled ? (
        <Text style={{ fontSize: 14 }}>💧</Text>
      ) : (
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border }} />
      )}
    </View>
  );
}

export default function NutritionScreen() {
  const cal = nutrition.calories;
  const calPct = Math.round((cal.current / cal.goal) * 100);
  const remaining = cal.goal - cal.current;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 64, paddingBottom: 48, gap: 20 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 15, color: colors.muted }}>Sunday, May 4</Text>
        <Text style={{ fontSize: 30, fontWeight: "800", color: colors.ink }}>Nutrition</Text>
      </View>

      {/* ── Calorie Overview ── */}
      <Card style={{ gap: 18 }}>
        <View>
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6 }}>
            <Text style={{ fontSize: 42, fontWeight: "800", color: colors.ink }}>{cal.current.toLocaleString()}</Text>
            <Text style={{ fontSize: 15, color: colors.muted, paddingBottom: 7 }}>/ {cal.goal.toLocaleString()} kcal</Text>
          </View>
        </View>
        <View style={{ gap: 6 }}>
          <View style={{ height: 10, borderRadius: 100, backgroundColor: colors.mintLight, overflow: "hidden" }}>
            <View style={{ width: `${calPct}%` as any, height: "100%", borderRadius: 100, backgroundColor: colors.mint }} />
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 12, color: colors.muted }}>{calPct}% of daily goal</Text>
            <Text style={{ fontSize: 12, fontWeight: "600", color: colors.mint }}>
              {remaining > 0 ? `${remaining} kcal left` : "Goal reached 🎉"}
            </Text>
          </View>
        </View>
        <View style={{ gap: 14 }}>
          <MacroBar label="Protein" current={nutrition.protein.current} goal={nutrition.protein.goal} unit="g" color={colors.brand} trackColor={colors.brandLight} />
          <MacroBar label="Carbs"   current={nutrition.carbs.current}   goal={nutrition.carbs.goal}   unit="g" color={colors.amber} trackColor={colors.amberLight} />
          <MacroBar label="Fat"     current={nutrition.fat.current}     goal={nutrition.fat.goal}     unit="g" color={colors.energy} trackColor={colors.energyLight} />
        </View>
      </Card>

      {/* ── Meals ── */}
      <View style={{ gap: 12 }}>
        <SectionHeader title="Meals" action="Log food" />
        {meals.map((meal) => (
          <MealCard key={meal.id} meal={meal} />
        ))}
      </View>

      {/* ── Hydration ── */}
      <Card style={{ gap: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ gap: 3 }}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: colors.muted, letterSpacing: 1, textTransform: "uppercase" }}>
              Hydration
            </Text>
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.ink }}>
              {nutrition.hydration.current} of {nutrition.hydration.goal} glasses
            </Text>
          </View>
          <Text style={{ fontSize: 28 }}>💧</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {Array.from({ length: nutrition.hydration.goal }).map((_, i) => (
            <WaterDrop key={i} filled={i < nutrition.hydration.current} />
          ))}
        </View>
        <View style={{ height: 7, borderRadius: 100, backgroundColor: colors.skyLight, overflow: "hidden" }}>
          <View style={{ width: `${(nutrition.hydration.current / nutrition.hydration.goal) * 100}%` as any, height: "100%", borderRadius: 100, backgroundColor: colors.sky }} />
        </View>
        <PillButton label="+ Add a glass" size="sm" variant="outline" />
      </Card>

      {/* ── Insight ── */}
      <View style={{ backgroundColor: colors.mintLight, borderRadius: radii.card, padding: 20, gap: 10, borderCurve: "continuous" } as any}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={{ fontSize: 16 }}>🌿</Text>
          <Text style={{ fontSize: 10, fontWeight: "700", color: colors.mint, letterSpacing: 1.2, textTransform: "uppercase" }}>
            Nutrition Insight
          </Text>
        </View>
        <Text style={{ fontSize: 14, fontWeight: "600", color: colors.ink, lineHeight: 22 }}>
          You're on track! Protein is at 57% — try a handful of almonds or a boiled egg to hit your goal.
        </Text>
      </View>
    </ScrollView>
  );
}
