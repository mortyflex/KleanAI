import "../src/lib/i18n";
import { Stack } from "expo-router";
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { OnboardingProvider } from "../src/features/onboarding/onboarding-context";
import { AuthProvider } from "../src/features/auth";
import { useSyncBootstrap } from "../src/features/sync";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  // While fonts load we render nothing; React Native falls back to system
  // fonts gracefully if loading ever fails, so the screen will still appear.
  if (!fontsLoaded) {
    return null;
  }

  return (
    <AuthProvider>
      <SyncBootstrap />
      <OnboardingProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="workout" />
          <Stack.Screen name="smoothing" />
          <Stack.Screen name="vision" />
        </Stack>
      </OnboardingProvider>
    </AuthProvider>
  );
}

// Sibling of <Stack>: it renders nothing but pulls auth state via context to
// drain the offline queue when the user signs in or the app foregrounds.
function SyncBootstrap() {
  useSyncBootstrap();
  return null;
}
