// Test mock for @expo-google-fonts/plus-jakarta-sans.
// In jsdom/jest there is no asset loader, so we expose stub font handles
// and a useFonts() that immediately resolves to "loaded".
export const PlusJakartaSans_400Regular = "PlusJakartaSans_400Regular";
export const PlusJakartaSans_500Medium = "PlusJakartaSans_500Medium";
export const PlusJakartaSans_600SemiBold = "PlusJakartaSans_600SemiBold";
export const PlusJakartaSans_700Bold = "PlusJakartaSans_700Bold";
export const PlusJakartaSans_800ExtraBold = "PlusJakartaSans_800ExtraBold";

export const useFonts = () => [true, null] as const;
