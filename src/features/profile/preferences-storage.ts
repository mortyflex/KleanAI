import AsyncStorage from "@react-native-async-storage/async-storage";

export type UnitSystem = "metric" | "imperial";

const UNIT_KEY = "@kleanai/unit-system";
const DEFAULT_UNIT: UnitSystem = "metric";

/**
 * Local-only preferences shim. We deliberately avoid Supabase here for now —
 * the schema does not yet have a `unit_system` column and this phase is
 * scoped to UX, not data-model changes.
 *
 * The conversion of stored kg/cm to lb/ft remains a presentation concern;
 * see the README/phase notes for the full conversion punch list.
 */
export const preferencesStorage = {
  async getUnitSystem(): Promise<UnitSystem> {
    try {
      const v = await AsyncStorage.getItem(UNIT_KEY);
      return v === "imperial" || v === "metric" ? v : DEFAULT_UNIT;
    } catch {
      return DEFAULT_UNIT;
    }
  },

  async setUnitSystem(value: UnitSystem): Promise<void> {
    await AsyncStorage.setItem(UNIT_KEY, value);
  },
};

export const APP_VERSION = "0.7.2";
