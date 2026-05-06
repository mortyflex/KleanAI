import React from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";

import { useAuth } from "../src/features/auth";
import { colors } from "../src/design/tokens";

/**
 * Root entry point — picks the right group based on auth state.
 *
 * - loading        → show a brief loader
 * - authenticated  → /(tabs) (auth gate decides if profile is complete)
 * - unauthenticated → /(auth)/landing (existing users can sign in,
 *                                       new users can start onboarding)
 */
export default function Index() {
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.bg,
        }}
      >
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  if (status === "authenticated") {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/landing" />;
}
