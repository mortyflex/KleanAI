import React, { useState } from "react";
import { View, TextInput, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../src/features/auth";
import { KleanText } from "../../src/components/ui/klean-text";
import { PillButton } from "../../src/components/ui/pill-button";
import { colors, radii } from "../../src/design/tokens";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

const BENEFIT_KEYS = ["save", "track", "sync", "adapt", "resume"] as const;

/**
 * Post-onboarding account creation. Reached after the user completes the
 * onboarding flow and presses "Follow this program" while unauthenticated.
 *
 * The screen leads with the *benefits* of creating an account (save plan,
 * track progress, future smart adjustments) and intentionally does NOT
 * surface a "sign in" CTA — existing users should arrive here only via the
 * landing screen, never by going through the onboarding again.
 */
export default function RegisterScreen() {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { intent } = useLocalSearchParams<{ intent?: string }>();
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );

  const isPostOnboarding = intent === "save-onboarding";

  const validate = (): boolean => {
    const next: { email?: string; password?: string } = {};
    if (!email.trim()) next.email = t("auth.errors.emailRequired");
    else if (!EMAIL_RE.test(email.trim())) next.email = t("auth.errors.emailInvalid");
    if (!password) next.password = t("auth.errors.passwordRequired");
    else if (password.length < MIN_PASSWORD)
      next.password = t("auth.errors.passwordTooShort");
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async () => {
    if (submitting) return;
    if (!validate()) return;
    setSubmitting(true);
    try {
      const { session } = await signUp(email.trim(), password);
      // No session = either email confirmation is required, or the email is
      // already registered (Supabase intentionally hides that case). Either
      // way we MUST stop here — navigating forward without a session would
      // bounce the user straight back through the auth gate, creating a
      // confusing register/summary loop.
      if (!session) {
        Alert.alert(
          t("auth.register.checkEmailTitle"),
          t("auth.register.checkEmailBody"),
        );
        return;
      }
      if (isPostOnboarding) {
        // Show the "step 10/10 — your plan is ready" recap. The user reviews
        // it and presses "Follow this program" to persist + enter the app.
        router.replace("/(onboarding)/summary");
      } else {
        router.replace("/(tabs)");
      }
    } catch (e) {
      Alert.alert(t("auth.register.errorTitle"), (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: 24, gap: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ gap: 8 }}>
          {isPostOnboarding && (
            <View
              style={{
                alignSelf: "flex-start",
                backgroundColor: colors.mintLight,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: radii.pill,
                marginBottom: 4,
              }}
            >
              <KleanText
                variant="caption"
                color={colors.mint}
                weight="700"
                style={{ letterSpacing: 1, textTransform: "uppercase" }}
              >
                {t("auth.register.almostThereTag")}
              </KleanText>
            </View>
          )}
          <KleanText variant="h1" color={colors.ink}>
            {isPostOnboarding
              ? t("auth.register.postOnboardingTitle")
              : t("auth.register.title")}
          </KleanText>
          <KleanText variant="body" color={colors.muted}>
            {isPostOnboarding
              ? t("auth.register.postOnboardingSubtitle")
              : t("auth.register.subtitle")}
          </KleanText>
        </View>

        {isPostOnboarding && (
          <View
            testID="register-benefits"
            style={{
              backgroundColor: colors.card,
              borderRadius: radii.card,
              padding: 16,
              gap: 12,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <KleanText
              variant="caption"
              color={colors.muted}
              weight="700"
              style={{ letterSpacing: 1, textTransform: "uppercase" }}
            >
              {t("auth.register.benefitsTitle")}
            </KleanText>
            {BENEFIT_KEYS.map((key) => (
              <View
                key={key}
                style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}
              >
                <View
                  style={{
                    marginTop: 4,
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: colors.brand,
                  }}
                />
                <KleanText
                  variant="body"
                  color={colors.ink}
                  style={{ flex: 1 }}
                >
                  {t(`auth.register.benefits.${key}`)}
                </KleanText>
              </View>
            ))}
          </View>
        )}

        <View style={{ gap: 16 }}>
          <Field
            testID="register-email-input"
            label={t("auth.fields.email")}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder={t("auth.fields.emailPlaceholder")}
            error={errors.email}
          />
          <Field
            testID="register-password-input"
            label={t("auth.fields.password")}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder={t("auth.fields.passwordPlaceholder")}
            error={errors.password}
          />
        </View>

        <PillButton
          testID="register-submit"
          label={
            submitting
              ? t("auth.register.submitting")
              : t("auth.register.submit")
          }
          onPress={onSubmit}
          disabled={submitting}
          size="lg"
        />

        {!isPostOnboarding && (
          <View style={{ alignItems: "center", gap: 8 }}>
            <KleanText variant="caption" color={colors.muted}>
              {t("auth.register.haveAccount")}
            </KleanText>
            <Link href="/(auth)/login" asChild>
              <KleanText variant="label" color={colors.brand}>
                {t("auth.register.toLogin")}
              </KleanText>
            </Link>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: "default" | "email-address";
  error?: string;
  testID?: string;
}

function Field({ label, error, testID, ...rest }: FieldProps) {
  return (
    <View style={{ gap: 6 }}>
      <KleanText variant="label" color={colors.ink}>
        {label}
      </KleanText>
      <TextInput
        testID={testID}
        {...rest}
        placeholderTextColor={colors.muted}
        style={{
          backgroundColor: colors.card,
          borderColor: error ? colors.energy : colors.border,
          borderWidth: 1,
          borderRadius: radii.chip,
          paddingHorizontal: 14,
          paddingVertical: 12,
          color: colors.ink,
          fontSize: 16,
        }}
      />
      {error ? (
        <KleanText variant="caption" color={colors.energy}>
          {error}
        </KleanText>
      ) : null}
    </View>
  );
}
