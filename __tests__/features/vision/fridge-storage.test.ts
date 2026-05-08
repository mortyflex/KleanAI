import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearConfirmedFridge,
  getConfirmedFridge,
  saveConfirmedFridge,
} from '../../../src/features/vision/store/fridge-storage';

describe('fridge-storage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('returns null when nothing has been saved', async () => {
    expect(await getConfirmedFridge()).toBeNull();
  });

  it('saves and reads back a list of ingredient ids', async () => {
    await saveConfirmedFridge(['eggs', 'spinach', 'olive_oil']);
    const record = await getConfirmedFridge();
    expect(record?.ingredientIds).toEqual(['eggs', 'spinach', 'olive_oil']);
    expect(record?.updatedAt).toBeTruthy();
  });

  it('dedupes ingredient ids while preserving the first occurrence', async () => {
    await saveConfirmedFridge(['eggs', 'eggs', 'spinach', 'eggs']);
    const record = await getConfirmedFridge();
    expect(record?.ingredientIds).toEqual(['eggs', 'spinach']);
  });

  it('treats a corrupt entry as empty', async () => {
    await AsyncStorage.setItem('@klean_confirmed_fridge', 'not-json{');
    expect(await getConfirmedFridge()).toBeNull();
  });

  it('clears the saved record', async () => {
    await saveConfirmedFridge(['eggs']);
    await clearConfirmedFridge();
    expect(await getConfirmedFridge()).toBeNull();
  });

  it('persists unmapped labels and dedupes them', async () => {
    await saveConfirmedFridge({
      ingredientIds: ['eggs'],
      unmappedLabels: ['Ketchup', 'Ketchup', 'Harissa'],
    });
    const record = await getConfirmedFridge();
    expect(record?.ingredientIds).toEqual(['eggs']);
    expect(record?.unmappedLabels).toEqual(['Ketchup', 'Harissa']);
  });

  it('falls back to an empty unmapped list when the persisted record is from an older version', async () => {
    await AsyncStorage.setItem(
      '@klean_confirmed_fridge',
      JSON.stringify({ ingredientIds: ['eggs'], updatedAt: '2024-01-01' }),
    );
    const record = await getConfirmedFridge();
    expect(record?.unmappedLabels).toEqual([]);
  });
});
