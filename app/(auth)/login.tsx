import React, { useState } from "react";
import { View, TextInput, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { authService } from "../../src/features/auth";
import { KleanText } from "../../src/components/ui/klean-text";
import { PillButton } from "../../src/components/ui/pill-button";
import { colors, radii } from "../../src/design/tokens";

/**
 * Email/password sign-in placeholder. Wired to Supabase but intentionally
 * minimal — no validation polish, no auth-context yet. Phase 1 foundation.
 */
export default function LoginScreen() {
  const { t } = useTranslation("common");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!email || !password) return;
    setSubmitting(true);
    try {
      await authService.signInWithPassword({ email, password });
      router.replace("/(tabs)");
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
        </View>

        <View style={{ gap: 16 }}>
          <Field
            label={t("auth.fields.email")}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder={t("auth.fields.emailPlaceholder")}
          />
          <Field
            label={t("auth.fields.password")}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder={t("auth.fields.passwordPlaceholder")}
          />
        </View>

        <PillButton
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
          <Link href="/(auth)/register" asChild>
            <KleanText variant="label" color={colors.brand}>
              {t("auth.login.toRegister")}
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
}

function Field({ label, ...rest }: FieldProps) {
  return (
    <View style={{ gap: 6 }}>
      <KleanText variant="label" color={colors.ink}>
        {label}
      </KleanText>
      <TextInput
        {...rest}
        placeholderTextColor={colors.muted}
        style={{
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radii.chip,
          paddingHorizontal: 14,
          paddingVertical: 12,
          color: colors.ink,
          fontSize: 16,
        }}
      />
    </View>
  );
}
