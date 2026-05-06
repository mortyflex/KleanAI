import React from "react";
import { View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { KleanText } from "../../src/components/ui/klean-text";
import { PillButton } from "../../src/components/ui/pill-button";
import { colors, radii } from "../../src/design/tokens";

/**
 * First screen for unauthenticated users. Two clear paths:
 *  - "Commencer"          → onboarding flow (new user)
 *  - "J'ai déjà un compte" → login (returning user, skip onboarding)
 *
 * No automatic redirect to onboarding from `/` — existing users must be
 * able to reach login without filling the onboarding first.
 */
export default function AuthLandingScreen() {
  const { t } = useTranslation("common");
  const router = useRouter();

  const handleStart = () => router.push("/(onboarding)/goal");
  const handleSignIn = () => router.push("/(auth)/login");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          padding: 24,
          paddingTop: 48,
          paddingBottom: 36,
          gap: 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: 12 }}>
          <View
            style={{
              alignSelf: "flex-start",
              backgroundColor: colors.brandLight,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: radii.pill,
            }}
          >
            <KleanText
              variant="caption"
              color={colors.brand}
              weight="700"
              style={{ letterSpacing: 1, textTransform: "uppercase" }}
            >
              {t("authLanding.brandTag")}
            </KleanText>
          </View>
          <KleanText variant="h1" color={colors.ink}>
            {t("authLanding.title")}
          </KleanText>
          <KleanText variant="body" color={colors.muted}>
            {t("authLanding.subtitle")}
          </KleanText>
        </View>

        <View style={{ gap: 14 }}>
          <Highlight
            emoji="💪"
            title={t("authLanding.highlights.adapt.title")}
            body={t("authLanding.highlights.adapt.body")}
          />
          <Highlight
            emoji="🛡️"
            title={t("authLanding.highlights.safe.title")}
            body={t("authLanding.highlights.safe.body")}
          />
          <Highlight
            emoji="✨"
            title={t("authLanding.highlights.zeroGuilt.title")}
            body={t("authLanding.highlights.zeroGuilt.body")}
          />
        </View>

        <View style={{ marginTop: "auto", gap: 12 }}>
          <PillButton
            testID="auth-landing-start"
            label={t("authLanding.startCta")}
            size="lg"
            onPress={handleStart}
          />
          <PillButton
            testID="auth-landing-sign-in"
            label={t("authLanding.signInCta")}
            size="lg"
            variant="outline"
            onPress={handleSignIn}
          />
          <KleanText
            variant="caption"
            color={colors.muted}
            align="center"
            style={{ marginTop: 4 }}
          >
            {t("authLanding.signInHint")}
          </KleanText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface HighlightProps {
  emoji: string;
  title: string;
  body: string;
}

function Highlight({ emoji, title, body }: HighlightProps) {
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 14,
        padding: 16,
        borderRadius: radii.card,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: radii.icon,
          backgroundColor: colors.brandLight,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <KleanText variant="bodyMedium" color={colors.brand}>
          {emoji}
        </KleanText>
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <KleanText variant="bodyMedium" color={colors.ink} weight="700">
          {title}
        </KleanText>
        <KleanText variant="caption" color={colors.muted}>
          {body}
        </KleanText>
      </View>
    </View>
  );
}
