import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../src/features/auth";
import {
  onboardingPersistenceService,
  type SavedOnboardingSnapshot,
} from "../../src/features/onboarding/onboarding-persistence.service";
import {
  APP_VERSION,
  preferencesStorage,
  type UnitSystem,
} from "../../src/features/profile/preferences-storage";
import { Card } from "../../src/components/ui/card";
import { KleanText } from "../../src/components/ui/klean-text";
import { PillButton } from "../../src/components/ui/pill-button";
import { colors, radii } from "../../src/design/tokens";

export default function ProfileScreen() {
  const { t, i18n } = useTranslation("common");
  const router = useRouter();
  const { user, signOut } = useAuth();

  const [snapshot, setSnapshot] = useState<SavedOnboardingSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unit, setUnit] = useState<UnitSystem>("metric");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const reload = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const result = await onboardingPersistenceService.loadSnapshot(user.id);
      setSnapshot(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    void preferencesStorage.getUnitSystem().then(setUnit);
  }, []);

  const handleUnitChange = async (next: UnitSystem) => {
    setUnit(next);
    await preferencesStorage.setUnitSystem(next);
  };

  const handleLanguageChange = async (lng: "en" | "fr") => {
    await i18n.changeLanguage(lng);
  };

  const handleSignOutPress = () => setConfirmOpen(true);
  const handleCancelSignOut = () => setConfirmOpen(false);

  const handleConfirmSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      setConfirmOpen(false);
      router.replace("/(auth)/landing");
    } catch (e) {
      Alert.alert(t("auth.signOutErrorTitle"), (e as Error).message);
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: 32, gap: 18 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: 6 }}>
          <KleanText variant="h1" color={colors.ink}>
            {t("profile.title")}
          </KleanText>
          <KleanText variant="body" color={colors.muted}>
            {t("profile.subtitle")}
          </KleanText>
        </View>

        {/* Account */}
        <Card>
          <SectionLabel>{t("profile.account.title")}</SectionLabel>
          <KleanText variant="bodyMedium" color={colors.ink}>
            {user?.email ?? t("profile.account.unknownEmail")}
          </KleanText>
          <KleanText
            variant="caption"
            color={colors.mint}
            style={{ marginTop: 4 }}
          >
            {t("profile.account.connected")}
          </KleanText>
        </Card>

        {/* Profile facts */}
        <Card>
          <SectionLabel>{t("profile.profile.title")}</SectionLabel>
          {loading ? (
            <ActivityIndicator color={colors.brand} />
          ) : (
            <View style={{ gap: 4 }}>
              <ProfileRow
                label={t("profile.profile.age")}
                value={
                  snapshot?.profile?.age != null
                    ? String(snapshot.profile.age)
                    : t("profile.profile.missing")
                }
              />
              <ProfileRow
                label={t("profile.profile.height")}
                value={formatHeight(snapshot?.profile?.height_cm ?? null, unit, t)}
              />
              <ProfileRow
                label={t("profile.profile.weight")}
                value={formatWeight(snapshot?.profile?.weight_kg ?? null, unit, t)}
              />
              <ProfileRow
                label={t("profile.profile.fitnessLevel")}
                value={
                  snapshot?.profile?.fitness_level
                    ? t(
                        `onboarding.summary.levels.${snapshot.profile.fitness_level}`,
                      )
                    : t("profile.profile.missing")
                }
              />
              <ProfileRow
                label={t("profile.profile.location")}
                value={
                  snapshot?.profile?.training_location
                    ? t(
                        `onboarding.summary.locations.${snapshot.profile.training_location}`,
                      )
                    : t("profile.profile.missing")
                }
              />
            </View>
          )}
        </Card>

        {/* Goal */}
        <Card>
          <SectionLabel>{t("profile.goal.title")}</SectionLabel>
          {loading ? (
            <ActivityIndicator color={colors.brand} />
          ) : snapshot?.goal ? (
            <View style={{ gap: 4 }}>
              <ProfileRow
                label={t("profile.goal.type")}
                value={t(
                  `onboarding.summary.goals.${snapshot.goal.goal_type}`,
                )}
              />
              {snapshot.goal.target_weight_kg != null && (
                <ProfileRow
                  label={t("profile.goal.targetWeight")}
                  value={formatWeight(snapshot.goal.target_weight_kg, unit, t)}
                />
              )}
              {snapshot.goal.target_weeks != null && (
                <ProfileRow
                  label={t("profile.goal.timeframe")}
                  value={t("onboarding.summary.weeksUnit", {
                    weeks: snapshot.goal.target_weeks,
                  })}
                />
              )}
              <ProfileRow
                testID="profile-classification"
                label={t("profile.goal.classification")}
                value={
                  snapshot.goal.classification
                    ? t(
                        `profile.goal.classifications.${snapshot.goal.classification}`,
                      )
                    : t("profile.profile.missing")
                }
              />
            </View>
          ) : (
            <KleanText variant="body" color={colors.muted}>
              {t("profile.goal.empty")}
            </KleanText>
          )}
        </Card>

        {/* Preferences */}
        <Card>
          <SectionLabel>{t("profile.preferences.title")}</SectionLabel>
          <View style={{ gap: 14 }}>
            <View style={{ gap: 8 }}>
              <KleanText variant="caption" color={colors.muted}>
                {t("profile.preferences.language")}
              </KleanText>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <SegmentButton
                  testID="profile-lang-en"
                  active={i18n.language?.startsWith("en") ?? false}
                  label={t("profile.preferences.languageEn")}
                  onPress={() => handleLanguageChange("en")}
                />
                <SegmentButton
                  testID="profile-lang-fr"
                  active={i18n.language?.startsWith("fr") ?? false}
                  label={t("profile.preferences.languageFr")}
                  onPress={() => handleLanguageChange("fr")}
                />
              </View>
            </View>
            <View style={{ gap: 8 }}>
              <KleanText variant="caption" color={colors.muted}>
                {t("profile.preferences.units")}
              </KleanText>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <SegmentButton
                  testID="profile-unit-metric"
                  active={unit === "metric"}
                  label={t("profile.preferences.unitsMetric")}
                  onPress={() => handleUnitChange("metric")}
                />
                <SegmentButton
                  testID="profile-unit-imperial"
                  active={unit === "imperial"}
                  label={t("profile.preferences.unitsImperial")}
                  onPress={() => handleUnitChange("imperial")}
                />
              </View>
              <KleanText variant="caption" color={colors.muted}>
                {t("profile.preferences.unitsHint")}
              </KleanText>
            </View>
          </View>
        </Card>

        {/* About */}
        <Card>
          <SectionLabel>{t("profile.about.title")}</SectionLabel>
          <KleanText variant="bodyMedium" color={colors.ink} weight="700">
            {t("profile.about.appName")}
          </KleanText>
          <KleanText variant="caption" color={colors.muted}>
            {t("profile.about.version", { version: APP_VERSION })}
          </KleanText>
          <KleanText
            variant="body"
            color={colors.muted}
            style={{ marginTop: 8 }}
          >
            {t("profile.about.tagline")}
          </KleanText>
        </Card>

        {error ? (
          <View
            style={{
              padding: 12,
              borderRadius: radii.chip,
              backgroundColor: colors.energyLight,
            }}
          >
            <KleanText variant="caption" color={colors.energy}>
              {error}
            </KleanText>
          </View>
        ) : null}

        <PillButton
          testID="profile-sign-out"
          label={t("profile.signOut")}
          variant="outline"
          size="lg"
          onPress={handleSignOutPress}
        />
      </ScrollView>

      {/* Sign-out confirmation modal */}
      <Modal
        visible={confirmOpen}
        transparent
        animationType="fade"
        onRequestClose={handleCancelSignOut}
      >
        <View
          testID="sign-out-confirm"
          style={{
            flex: 1,
            backgroundColor: "rgba(26,24,38,0.55)",
            justifyContent: "center",
            paddingHorizontal: 24,
          }}
        >
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: radii.card,
              padding: 22,
              gap: 12,
            }}
          >
            <KleanText variant="h3" color={colors.ink}>
              {t("profile.signOutConfirm.title")}
            </KleanText>
            <KleanText variant="body" color={colors.muted}>
              {t("profile.signOutConfirm.body")}
            </KleanText>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
              <PillButton
                testID="sign-out-cancel"
                label={t("profile.signOutConfirm.cancel")}
                variant="outline"
                size="md"
                onPress={handleCancelSignOut}
                disabled={signingOut}
                style={{ flex: 1 }}
              />
              <PillButton
                testID="sign-out-confirm-button"
                label={
                  signingOut
                    ? t("profile.signOutConfirm.confirming")
                    : t("profile.signOutConfirm.confirm")
                }
                size="md"
                onPress={handleConfirmSignOut}
                disabled={signingOut}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <KleanText
      variant="caption"
      color={colors.muted}
      weight="700"
      style={{ letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}
    >
      {children}
    </KleanText>
  );
}

function ProfileRow({
  label,
  value,
  testID,
}: {
  label: string;
  value: string;
  testID?: string;
}) {
  return (
    <View
      testID={testID}
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 6,
      }}
    >
      <KleanText variant="caption" color={colors.muted}>
        {label}
      </KleanText>
      <KleanText
        variant="caption"
        color={colors.ink}
        weight="700"
        style={{ flexShrink: 1, textAlign: "right" }}
      >
        {value}
      </KleanText>
    </View>
  );
}

function SegmentButton({
  active,
  label,
  onPress,
  testID,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={{
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: radii.pill,
        alignItems: "center",
        backgroundColor: active ? colors.ink : colors.card,
        borderWidth: 1,
        borderColor: active ? colors.ink : colors.border,
      }}
    >
      <KleanText
        variant="label"
        color={active ? "#FFFFFF" : colors.ink}
        weight="700"
      >
        {label}
      </KleanText>
    </Pressable>
  );
}

function formatWeight(
  kg: number | null,
  unit: UnitSystem,
  t: (k: string, opts?: Record<string, unknown>) => string,
): string {
  if (kg == null) return t("profile.profile.missing");
  if (unit === "imperial") {
    const lb = Math.round(kg * 2.20462);
    return t("profile.units.lb", { lb });
  }
  return t("profile.units.kg", { kg });
}

function formatHeight(
  cm: number | null,
  unit: UnitSystem,
  t: (k: string, opts?: Record<string, unknown>) => string,
): string {
  if (cm == null) return t("profile.profile.missing");
  if (unit === "imperial") {
    const totalInches = cm / 2.54;
    const ft = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches - ft * 12);
    return t("profile.units.ftIn", { ft, in: inches });
  }
  return t("profile.units.cm", { cm });
}
