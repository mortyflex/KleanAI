import { useCallback, useEffect, useState } from 'react';
import type { IngredientId } from '../../../types/ai.types';
import {
  getConfirmedFridge,
  saveConfirmedFridge,
  clearConfirmedFridge,
  type SaveConfirmedFridgeInput,
} from '../store/fridge-storage';

interface UseConfirmedFridgeResult {
  loading: boolean;
  ingredientIds: IngredientId[] | null;
  /** Free-text labels the user confirmed even though they're not in the catalog. */
  unmappedLabels: string[];
  save: (
    input: SaveConfirmedFridgeInput | IngredientId[],
  ) => Promise<void>;
  reset: () => Promise<void>;
  reload: () => Promise<void>;
}

export function useConfirmedFridge(): UseConfirmedFridgeResult {
  const [loading, setLoading] = useState(true);
  const [ingredientIds, setIngredientIds] = useState<IngredientId[] | null>(null);
  const [unmappedLabels, setUnmappedLabels] = useState<string[]>([]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const record = await getConfirmedFridge();
      setIngredientIds(record?.ingredientIds ?? null);
      setUnmappedLabels(record?.unmappedLabels ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload().catch(() => {});
  }, [reload]);

  const save = useCallback(
    async (input: SaveConfirmedFridgeInput | IngredientId[]) => {
      const record = await saveConfirmedFridge(input);
      setIngredientIds(record.ingredientIds);
      setUnmappedLabels(record.unmappedLabels);
    },
    [],
  );

  const reset = useCallback(async () => {
    await clearConfirmedFridge();
    setIngredientIds(null);
    setUnmappedLabels([]);
  }, []);

  return {
    loading,
    ingredientIds,
    unmappedLabels,
    save,
    reset,
    reload,
  };
}
