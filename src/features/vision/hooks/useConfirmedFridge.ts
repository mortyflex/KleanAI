import { useCallback, useEffect, useState } from 'react';
import type { IngredientId } from '../../../types/ai.types';
import {
  getConfirmedFridge,
  saveConfirmedFridge,
  clearConfirmedFridge,
} from '../store/fridge-storage';

interface UseConfirmedFridgeResult {
  loading: boolean;
  ingredientIds: IngredientId[] | null;
  save: (ids: IngredientId[]) => Promise<void>;
  reset: () => Promise<void>;
  reload: () => Promise<void>;
}

export function useConfirmedFridge(): UseConfirmedFridgeResult {
  const [loading, setLoading] = useState(true);
  const [ingredientIds, setIngredientIds] = useState<IngredientId[] | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const record = await getConfirmedFridge();
      setIngredientIds(record?.ingredientIds ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload().catch(() => {});
  }, [reload]);

  const save = useCallback(async (ids: IngredientId[]) => {
    const record = await saveConfirmedFridge(ids);
    setIngredientIds(record.ingredientIds);
  }, []);

  const reset = useCallback(async () => {
    await clearConfirmedFridge();
    setIngredientIds(null);
  }, []);

  return { loading, ingredientIds, save, reset, reload };
}
