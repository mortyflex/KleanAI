import type { TextStyle } from "react-native";

/**
 * Centralized typography system for Klean AI.
 *
 * Source of truth for font sizes, line heights, weights, and font family.
 * Components should consume these variants through the KleanText component
 * rather than defining their own fontSize/fontWeight inline.
 *
 * To change the app font globally, update {@link fontFamilies} below.
 * To change font sizes globally, update the variants in {@link typography}.
 */

export type TypographyVariant =
  | "display"
  | "h1"
  | "h2"
  | "h3"
  | "bodyLarge"
  | "body"
  | "bodyMedium"
  | "secondary"
  | "label"
  | "caption"
  | "button"
  | "metric";

export type FontWeightToken =
  | "regular"
  | "medium"
  | "semiBold"
  | "bold"
  | "extraBold";

/**
 * Font family names per weight. These names must match the keys passed to
 * `useFonts(...)` in the root layout. If a font fails to load, React Native
 * silently falls back to the system font, which is the desired behavior.
 *
 * Swap the values here to change the app font globally.
 */
export const fontFamilies: Record<FontWeightToken, string> = {
  regular: "PlusJakartaSans_400Regular",
  medium: "PlusJakartaSans_500Medium",
  semiBold: "PlusJakartaSans_600SemiBold",
  bold: "PlusJakartaSans_700Bold",
  extraBold: "PlusJakartaSans_800ExtraBold",
};

export const fontWeights: Record<FontWeightToken, TextStyle["fontWeight"]> = {
  regular: "400",
  medium: "500",
  semiBold: "600",
  bold: "700",
  extraBold: "800",
};

export interface TypographyStyle {
  fontSize: number;
  lineHeight: number;
  fontWeight: TextStyle["fontWeight"];
  fontFamily: string;
  letterSpacing?: number;
}

interface VariantSpec {
  fontSize: number;
  lineHeight: number;
  weight: FontWeightToken;
  letterSpacing?: number;
}

const variantSpecs: Record<TypographyVariant, VariantSpec> = {
  display: { fontSize: 32, lineHeight: 38, weight: "extraBold", letterSpacing: -0.5 },
  h1: { fontSize: 28, lineHeight: 34, weight: "extraBold", letterSpacing: -0.4 },
  h2: { fontSize: 24, lineHeight: 30, weight: "bold", letterSpacing: -0.3 },
  h3: { fontSize: 21, lineHeight: 27, weight: "bold", letterSpacing: -0.2 },
  bodyLarge: { fontSize: 18, lineHeight: 27, weight: "regular" },
  body: { fontSize: 16, lineHeight: 24, weight: "regular" },
  bodyMedium: { fontSize: 16, lineHeight: 24, weight: "semiBold" },
  secondary: { fontSize: 15, lineHeight: 22, weight: "regular" },
  label: { fontSize: 14, lineHeight: 20, weight: "semiBold" },
  caption: { fontSize: 13, lineHeight: 18, weight: "medium" },
  button: { fontSize: 16, lineHeight: 22, weight: "bold", letterSpacing: 0.1 },
  metric: { fontSize: 30, lineHeight: 36, weight: "extraBold", letterSpacing: -0.4 },
};

function buildVariant(spec: VariantSpec): TypographyStyle {
  return {
    fontSize: spec.fontSize,
    lineHeight: spec.lineHeight,
    fontWeight: fontWeights[spec.weight],
    fontFamily: fontFamilies[spec.weight],
    ...(spec.letterSpacing !== undefined ? { letterSpacing: spec.letterSpacing } : {}),
  };
}

export const typography: Record<TypographyVariant, TypographyStyle> = (
  Object.keys(variantSpecs) as TypographyVariant[]
).reduce(
  (acc, variant) => {
    acc[variant] = buildVariant(variantSpecs[variant]);
    return acc;
  },
  {} as Record<TypographyVariant, TypographyStyle>,
);

/**
 * Font assets to load via `expo-font`. Imported by the root layout.
 * Keep aligned with {@link fontFamilies}.
 */
export const fontAssetKeys: FontWeightToken[] = [
  "regular",
  "medium",
  "semiBold",
  "bold",
  "extraBold",
];
