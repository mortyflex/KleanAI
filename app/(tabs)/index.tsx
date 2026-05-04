import React from "react";
import { ScrollView, View, Text, Pressable } from "react-native";
import { user, todaySummary, nutrition } from "../../src/data/mock";
import { Card } from "../../src/components/ui/card";
import { SectionHeader } from "../../src/components/ui/section-header";
import { PillButton } from "../../src/components/ui/pill-button";
import { colors, radii, shadows } from "../../src/design/tokens";

const PALETTES = {
  brand: { bg: colors.brandLight, fg: colors.brand },
  energy: { bg: colors.energyLight, fg: colors.energy },
  mint: { bg: colors.mintLight, fg: colors.mint },
  sky: { bg: colors.skyLight, fg: colors.sky },
  amber: { bg: colors.amberLight, fg: colors.amber },
};

type PaletteKey = keyof typeof PALETTES;

function StatMini({ label, value, unit, palette }: { label: string; value: string; unit: string; palette: PaletteKey }) {
  const { bg, fg } = PALETTES[palette];
  return (
    <View style={{ flex: 1, backgroundColor: bg, borderRadius: 16, padding: 12, gap: 2 }}>
      <Text style={{ fontSize: 22, fontWeight: "700", color: fg }}>{value}</Text>
      <Text style={{ fontSize: 11, color: colors.muted }}>{unit}</Text>
      <Text style={{ fontSize: 12, fontWeight: "500", color: colors.ink }}>{label}</Text>
    </View>
  );
}

function QuickAction({ emoji, title, subtitle, palette }: { emoji: string; title: string; subtitle: string; palette: PaletteKey }) {
  const { bg, fg } = PALETTES[palette];
  return (
    <Pressable
      style={{
        flex: 1,
        backgroundColor: bg,
        borderRadius: radii.card,
        padding: 16,
        gap: 12,
        boxShadow: shadows.soft,
        borderCurve: "continuous",
      } as any}
    >
      <Text style={{ fontSize: 26 }}>{emoji}</Text>
      <View style={{ gap: 3 }}>
        <Text style={{ fontSize: 13, fontWeight: "700", color: fg }}>{title}</Text>
        <Text style={{ fontSize: 12, color: colors.muted }}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const burnedPct = Math.round((todaySummary.caloriesBurned / todaySummary.caloriesGoal) * 100);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 64, paddingBottom: 48, gap: 20 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Greeting ── */}
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ gap: 3 }}>
            <Text style={{ fontSize: 15, color: colors.muted }}>Good morning,</Text>
            <Text style={{ fontSize: 30, fontWeight: "800", color: colors.ink }}>{user.name} 👋</Text>
          </View>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: colors.brand,
              alignItems: "center",
              justifyContent: "center",
              boxShadow: shadows.brand,
            } as any}
          >
            <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 16 }}>{user.avatarInitials}</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
          <View style={{ backgroundColor: colors.energyLight, borderRadius: radii.pill, paddingHorizontal: 12, paddingVertical: 5 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: colors.energy }}>🔥 {user.streak} day streak</Text>
          </View>
          <View style={{ backgroundColor: colors.mintLight, borderRadius: radii.pill, paddingHorizontal: 12, paddingVertical: 5 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: colors.mint }}>{user.level}</Text>
          </View>
        </View>
      </View>

      {/* ── Today's Overview ── */}
      <Card>
        <Text style={{ fontSize: 11, fontWeight: "700", color: colors.muted, letterSpacing: 1, textTransform: "uppercase" }}>
          Today's Overview
        </Text>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
          <StatMini label="Burned" value={`${todaySummary.caloriesBurned}`} unit="kcal" palette="energy" />
          <StatMini label="Steps" value={`${(todaySummary.stepsWalked / 1000).toFixed(1)}k`} unit="steps" palette="sky" />
          <StatMini label="Active" value={`${todaySummary.activeMinutes}`} unit="min" palette="mint" />
        </View>
        <View style={{ gap: 6, marginTop: 18 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 12, color: colors.muted }}>Daily calorie goal</Text>
            <Text style={{ fontSize: 12, fontWeight: "700", color: colors.ink }}>{burnedPct}%</Text>
          </View>
          <View style={{ height: 8, borderRadius: 100, backgroundColor: colors.brandLight, overflow: "hidden" }}>
            <View style={{ width: `${burnedPct}%` as any, height: "100%", borderRadius: 100, backgroundColor: colors.brand }} />
          </View>
          <Text style={{ fontSize: 11, color: colors.muted }}>
            {todaySummary.caloriesBurned} of {todaySummary.caloriesGoal} kcal
          </Text>
        </View>
      </Card>

      {/* ── Quick Actions ── */}
      <View style={{ gap: 12 }}>
        <SectionHeader title="Quick Actions" action="See all" />
        <View style={{ flexDirection: "row", gap: 12 }}>
          <QuickAction emoji="💪" title="Workout" subtitle="Upper Body Power" palette="brand" />
          <QuickAction emoji="🥗" title="Nutrition" subtitle={`${nutrition.calories.current} kcal`} palette="mint" />
        </View>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <QuickAction emoji="📈" title="Progress" subtitle="Week 8 of 12" palette="sky" />
          <QuickAction emoji="⭐" title="AI Coach" subtitle="Ask anything" palette="amber" />
        </View>
      </View>

      {/* ── Coach Tip ── */}
      <View
        style={{
          backgroundColor: colors.brand,
          borderRadius: radii.card,
          padding: 20,
          gap: 10,
          borderCurve: "continuous",
        } as any}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={{ fontSize: 15 }}>💡</Text>
          <Text style={{ fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.6)", letterSpacing: 1.2, textTransform: "uppercase" }}>
            Coach's Tip
          </Text>
        </View>
        <Text style={{ fontSize: 15, fontWeight: "600", color: "#FFFFFF", lineHeight: 24 }}>
          Hit a protein shake right after your session. 30g within 30 minutes maximises muscle recovery.
        </Text>
      </View>

      {/* ── CTA ── */}
      <PillButton label="Start Today's Workout 💪" size="lg" />
    </ScrollView>
  );
}
