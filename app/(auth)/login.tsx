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

export default function LoginScreen() {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { intent } = useLocalSearchParams<{ intent?: string }>();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );

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
      await signIn(email.trim(), password);
      if (intent === "save-onboarding") {
        router.replace("/(onboarding)/summary");
      } else {
        router.replace("/(tabs)");
      }
    } catch (e) {
      Alert.alert(t("auth.login.errorTitle"), (e as Error).message);
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
          <KleanText variant="h1" color={colors.ink}>
            {t("auth.login.title")}
          </KleanText>
          <KleanText variant="body" color={colors.muted}>
            {t("auth.login.subtitle")}
          </KleanText>
          {intent === "save-onboarding" && (
            <KleanText variant="caption" color={colors.brand}>
              {t("auth.login.saveOnboardingHint")}
            </KleanText>
          )}
        </View>

        <View style={{ gap: 16 }}>
          <Field
            testID="login-email-input"
            label={t("auth.fields.email")}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder={t("auth.fields.emailPlaceholder")}
            error={errors.email}
          />
          <Field
            testID="login-password-input"
            label={t("auth.fields.password")}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder={t("auth.fields.passwordPlaceholder")}
            error={errors.password}
          />
        </View>

        <PillButton
          testID="login-submit"
          label={
            submitting ? t("auth.login.submitting") : t("auth.login.submit")
          }
          onPress={onSubmit}
          disabled={submitting}
          size="lg"
        />

        <View style={{ alignItems: "center", gap: 8 }}>
          <KleanText variant="caption" color={colors.muted}>
            {t("auth.login.noAccount")}
          </KleanText>
          <Link href="/(onboarding)/goal" asChild>
            <KleanText variant="label" color={colors.brand}>
              {t("auth.login.toOnboarding")}
            </KleanText>
          </Link>
        </View>
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
