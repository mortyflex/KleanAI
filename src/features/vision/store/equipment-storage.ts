import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Equipment } from '../../../types/workout.types';

const STORAGE_KEY = '@klean_confirmed_equipment';

export interface ConfirmedEquipmentRecord {
  /** Internal equipment ids the user has confirmed they have access to. */
  equipmentIds: Equipment[];
  updatedAt: string;
}

/** Returns the persisted confirmed equipment, or null if nothing has been saved yet. */
export async function getConfirmedEquipment(): Promise<ConfirmedEquipmentRecord | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ConfirmedEquipmentRecord;
  } catch {
    // A corrupt entry is treated as empty so we never crash the workout flow.
    return null;
  }
}

export async function saveConfirmedEquipment(
  equipmentIds: Equipment[],
): Promise<ConfirmedEquipmentRecord> {
  // De-duplicate in a single pass — bodyweight is always implicitly available.
  const unique = Array.from(new Set<Equipment>(['bodyweight', ...equipmentIds]));
  const record: ConfirmedEquipmentRecord = {
    equipmentIds: unique,
    updatedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  return record;
}

export async function clearConfirmedEquipment(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
