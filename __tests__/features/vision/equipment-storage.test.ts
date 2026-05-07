import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getConfirmedEquipment,
  saveConfirmedEquipment,
  clearConfirmedEquipment,
} from '../../../src/features/vision/store/equipment-storage';

describe('equipment-storage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('returns null when nothing has been saved', async () => {
    expect(await getConfirmedEquipment()).toBeNull();
  });

  it('saves and reads back equipment ids', async () => {
    await saveConfirmedEquipment(['barbell', 'dumbbell']);
    const record = await getConfirmedEquipment();
    expect(record).not.toBeNull();
    expect(record?.equipmentIds).toEqual(
      expect.arrayContaining(['barbell', 'dumbbell', 'bodyweight']),
    );
  });

  it('always includes bodyweight implicitly', async () => {
    await saveConfirmedEquipment(['cable']);
    const record = await getConfirmedEquipment();
    expect(record?.equipmentIds).toContain('bodyweight');
  });

  it('deduplicates repeated ids', async () => {
    await saveConfirmedEquipment(['barbell', 'barbell', 'dumbbell']);
    const record = await getConfirmedEquipment();
    expect(record?.equipmentIds.filter((id) => id === 'barbell')).toHaveLength(1);
  });

  it('clearConfirmedEquipment removes the record', async () => {
    await saveConfirmedEquipment(['barbell']);
    await clearConfirmedEquipment();
    expect(await getConfirmedEquipment()).toBeNull();
  });

  it('treats a corrupt JSON entry as empty rather than throwing', async () => {
    await AsyncStorage.setItem('@klean_confirmed_equipment', '{not-json');
    await expect(getConfirmedEquipment()).resolves.toBeNull();
  });
});
