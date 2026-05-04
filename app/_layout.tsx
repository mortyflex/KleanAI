import "../src/lib/i18n";
import { Stack } from "expo-router";
import { OnboardingProvider } from "../src/features/onboarding/onboarding-context";

export default function RootLayout() {
  return (
    <OnboardingProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </OnboardingProvider>
  );
}
