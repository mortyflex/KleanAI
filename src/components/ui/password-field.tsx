import React, { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";

import { KleanText } from "./klean-text";
import { colors, radii } from "../../design/tokens";

interface PasswordFieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  error?: string;
  testID?: string;
  toggleTestID?: string;
}

/**
 * Password input with a visibility toggle so the user can verify what they
 * typed. Visibility state is local to the component — each field manages
 * its own show/hide so a register screen with two password inputs can
 * reveal them independently.
 *
 * The toggle uses a localized text label rather than an icon so the
 * component has no dependency on `@expo/vector-icons` (which doesn't load
 * cleanly in the Jest environment) and remains screen-reader friendly out
 * of the box.
 */
export function PasswordField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  testID,
  toggleTestID,
}: PasswordFieldProps) {
  const { t } = useTranslation("common");
  const [visible, setVisible] = useState(false);
  const toggleLabel = visible
    ? t("auth.fields.passwordHide")
    : t("auth.fields.passwordShow");

  return (
    <View style={{ gap: 6 }}>
      <KleanText variant="label" color={colors.ink}>
        {label}
      </KleanText>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.card,
          borderColor: error ? colors.energy : colors.border,
          borderWidth: 1,
          borderRadius: radii.chip,
        }}
      >
        <TextInput
          testID={testID}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            flex: 1,
            paddingHorizontal: 14,
            paddingVertical: 12,
            color: colors.ink,
            fontSize: 16,
          }}
        />
        <Pressable
          testID={toggleTestID}
          onPress={() => setVisible((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={toggleLabel}
          hitSlop={8}
          style={{ paddingHorizontal: 14, paddingVertical: 12 }}
        >
          <KleanText variant="label" color={colors.brand} weight="700">
            {toggleLabel}
          </KleanText>
        </Pressable>
      </View>
      {error ? (
        <KleanText variant="caption" color={colors.energy}>
          {error}
        </KleanText>
      ) : null}
    </View>
  );
}
