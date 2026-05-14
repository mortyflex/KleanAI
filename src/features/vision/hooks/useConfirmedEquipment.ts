import { useCallback, useEffect, useState } from 'react';
import type { Equipment } from '../../../types/workout.types';
import {
  getConfirmedEquipment,
  saveConfirmedEquipment,
  clearConfirmedEquipment,
} from '../store/equipment-storage';

interface UseConfirmedEquipmentResult {
  loading: boolean;
  equipmentIds: Equipment[] | null;
  save: (ids: Equipment[]) => Promise<void>;
  reset: () => Promise<void>;
  reload: () => Promise<void>;
}

export function useConfirmedEquipment(): UseConfirmedEquipmentResult {
  const [loading, setLoading] = useState(true);
  const [equipmentIds, setEquipmentIds] = useState<Equipment[] | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const record = await getConfirmedEquipment();
      setEquipmentIds(record?.equipmentIds ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload().catch(() => {});
  }, [reload]);

  const save = useCallback(async (ids: Equipment[]) => {
    const record = await saveConfirmedEquipment(ids);
    setEquipmentIds(record.equipmentIds);
  }, []);

  const reset = useCallback(async () => {
    await clearConfirmedEquipment();
    setEquipmentIds(null);
  }, []);

  return { loading, equipmentIds, save, reset, reload };
}
