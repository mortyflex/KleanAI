import React from "react";
import { ScrollView, View, Text, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { user, todaySummary, nutrition } from "../../src/data/mock";
import { Card } from "../../src/components/ui/card";
import { SectionHeader } from "../../src/components/ui/section-header";
import { PillButton } from "../../src/components/ui/pill-button";
import { KleanText } from "../../src/components/ui/klean-text";
import { colors, radii, shadows } from "../../src/design/tokens";

const PALETTES = {
  brand: { bg: colors.brandLight, fg: colors.brand },
  energy: { bg: colors.energyLight, fg: colors.energy },
  mint: { bg: colors.mintLight, fg: colors.mint },
  sky: { bg: colors.skyLight, fg: colors.sky },
  amber: { bg: colors.amberLight, fg: colors.amber },
};

type PaletteKey = keyof typeof PALETTES;

function StatMini({
  label,
  value,
  unit,
  palette,
}: {
  label: string;
  value: string;
  unit: string;
  palette: PaletteKey;
}) {
  const { bg, fg } = PALETTES[palette];
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: bg,
        borderRadius: 16,
        padding: 12,
        gap: 2,
      }}
    >
      <KleanText variant="h3" color={fg}>
        {value}
      </KleanText>
      <KleanText variant="caption" color={colors.muted}>
        {unit}
      </KleanText>
      <KleanText variant="label" color={colors.ink}>
        {label}
      </KleanText>
    </View>
  );
}

function QuickAction({
  emoji,
  title,
  subtitle,
  palette,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  palette: PaletteKey;
}) {
  const { bg, fg } = PALETTES[palette];
  return (
    <Pressable
      style={
        {
          flex: 1,
          backgroundColor: bg,
          borderRadius: radii.card,
          padding: 16,
          gap: 12,
          boxShadow: shadows.soft,
          borderCurve: "continuous",
        } as any
      }
    >
      <Text style={{ fontSize: 26 }}>{emoji}</Text>
      <View style={{ gap: 3 }}>
        <KleanText variant="bodyMedium" color={fg} weight="700">
          {title}
        </KleanText>
        <KleanText variant="caption" color={colors.muted}>
          {subtitle}
        </KleanText>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const { t } = useTranslation("common");
  const burnedPct = Math.round(
    (todaySummary.caloriesBurned / todaySummary.caloriesGoal) * 100,
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: 64,
        paddingBottom: 48,
        gap: 20,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Greeting ── */}
      <View style={{ gap: 8 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ gap: 3 }}>
            <KleanText variant="secondary" color={colors.muted}>
              {t("home.goodMorning")}
            </KleanText>
            <KleanText variant="h1" color={colors.ink}>
              {user.name} 👋
            </KleanText>
          </View>
          <View
            style={
              {
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: colors.brand,
                alignItems: "center",
                justifyContent: "center",
                boxShadow: shadows.brand,
              } as any
            }
          >
            <KleanText variant="bodyMedium" color="#FFFFFF" weight="700">
              {user.avatarInitials}
            </KleanText>
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
          <View
            style={{
              backgroundColor: colors.energyLight,
              borderRadius: radii.pill,
              paddingHorizontal: 12,
              paddingVertical: 6,
            }}
          >
            <KleanText variant="caption" color={colors.energy}>
              🔥 {user.streak} day streak
            </KleanText>
          </View>
          <View
            style={{
              backgroundColor: colors.mintLight,
              borderRadius: radii.pill,
              paddingHorizontal: 12,
              paddingVertical: 6,
            }}
          >
            <KleanText variant="caption" color={colors.mint}>
              {user.level}
            </KleanText>
          </View>
        </View>
      </View>

      {/* ── Today's Overview ── */}
      <Card>
        <KleanText
          variant="caption"
          color={colors.muted}
          weight="700"
          style={{ letterSpacing: 1, textTransform: "uppercase" }}
        >
          {t("home.overview.title")}
        </KleanText>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
          <StatMini
            label={t("home.overview.burned")}
            value={`${todaySummary.caloriesBurned}`}
            unit={t("home.overview.kcalUnit")}
            palette="energy"
          />
          <StatMini
            label={t("home.overview.steps")}
            value={`${(todaySummary.stepsWalked / 1000).toFixed(1)}k`}
            unit={t("home.overview.stepsUnit")}
            palette="sky"
          />
          <StatMini
            label={t("home.overview.active")}
            value={`${todaySummary.activeMinutes}`}
            unit={t("home.overview.minUnit")}
            palette="mint"
          />
        </View>
        <View style={{ gap: 6, marginTop: 18 }}>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <KleanText variant="caption" color={colors.muted}>
              {t("home.overview.goalLabel")}
            </KleanText>
            <KleanText variant="caption" color={colors.ink} weight="700">
              {burnedPct}%
            </KleanText>
          </View>
          <View
            style={{
              height: 8,
              borderRadius: 100,
              backgroundColor: colors.brandLight,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                width: `${burnedPct}%` as any,
                height: "100%",
                borderRadius: 100,
                backgroundColor: colors.brand,
              }}
            />
          </View>
          <KleanText variant="caption" color={colors.muted}>
            {t("home.overview.goalProgress", {
              current: todaySummary.caloriesBurned,
              goal: todaySummary.caloriesGoal,
            })}
          </KleanText>
        </View>
      </Card>

      {/* ── Quick Actions ── */}
      <View style={{ gap: 12 }}>
        <SectionHeader
          title={t("home.actions.title")}
          action={t("home.actions.seeAll")}
        />
        <View style={{ flexDirection: "row", gap: 12 }}>
          <QuickAction
            emoji="💪"
            title={t("home.actions.workout")}
            subtitle={t("home.actions.workoutSub")}
            palette="brand"
          />
          <QuickAction
            emoji="🥗"
            title={t("home.actions.nutrition")}
            subtitle={`${nutrition.calories.current} ${t("home.overview.kcalUnit")}`}
            palette="mint"
          />
        </View>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <QuickAction
            emoji="📈"
            title={t("home.actions.progress")}
            subtitle={t("home.actions.progressSub")}
            palette="sky"
          />
          <QuickAction
            emoji="⭐"
            title={t("home.actions.coach")}
            subtitle={t("home.actions.coachSub")}
            palette="amber"
          />
        </View>
      </View>

      {/* ── Coach Tip ── */}
      <View
        style={
          {
            backgroundColor: colors.brand,
            borderRadius: radii.card,
            padding: 20,
            gap: 10,
            borderCurve: "continuous",
          } as any
        }
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={{ fontSize: 15 }}>💡</Text>
          <KleanText
            variant="caption"
            color="rgba(255,255,255,0.75)"
            weight="700"
            style={{ letterSpacing: 1.2, textTransform: "uppercase" }}
          >
            {t("home.tip.label")}
          </KleanText>
        </View>
        <KleanText variant="bodyMedium" color="#FFFFFF">
          {t("home.tip.body")}
        </KleanText>
      </View>

      {/* ── CTA ── */}
      <PillButton label={t("home.cta")} size="lg" />
    </ScrollView>
  );
}
