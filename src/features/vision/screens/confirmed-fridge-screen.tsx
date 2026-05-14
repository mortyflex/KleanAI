import React, { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect, useRouter } from 'expo-router';

import { Card } from '../../../components/ui/card';
import { KleanText } from '../../../components/ui/klean-text';
import { PillButton } from '../../../components/ui/pill-button';
import { colors, radii } from '../../../design/tokens';
import type { IngredientId } from '../../../types/ai.types';
import { useConfirmedFridge } from '../hooks/useConfirmedFridge';
import { formatRawLabel } from '../utils/format-label';

interface IngredientChipProps {
  label: string;
  onRemove: () => void;
  estimatedNutrition?: boolean;
  testID?: string;
}

function IngredientRow({
  label,
  onRemove,
  estimatedNutrition,
  testID,
}: IngredientChipProps) {
  const { t } = useTranslation('common');
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: colors.bg,
        borderRadius: radii.chip,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <KleanText variant="bodyMedium" color={colors.ink}>
          {label}
        </KleanText>
        {estimatedNutrition ? (
          <View
            style={{
              alignSelf: 'flex-start',
              marginTop: 2,
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: radii.pill,
              backgroundColor: colors.amberLight,
            }}
          >
            <KleanText variant="caption" color={colors.amber} weight="700">
              {t('vision.fridge.results.estimatedNutritionBadge')}
            </KleanText>
          </View>
        ) : null}
      </View>
      <Pressable
        onPress={onRemove}
        accessibilityRole="button"
        accessibilityLabel={t('vision.confirmedFridge.removeAccessibility', {
          label,
        })}
        testID={testID}
        style={{
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: radii.pill,
          borderWidth: 1,
          borderColor: colors.energy,
          backgroundColor: colors.energyLight,
        }}
      >
        <KleanText variant="caption" color={colors.energy} weight="700">
          {t('vision.confirmedFridge.removeCta')}
        </KleanText>
      </Pressable>
    </View>
  );
}

/**
 * Lists the user's currently confirmed fridge — both mapped catalog items
 * and free-text unmapped labels — and lets them remove individual entries
 * or kick off a fresh scan.
 */
export function ConfirmedFridgeScreen() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { ingredientIds, unmappedLabels, save, reset, reload, loading } =
    useConfirmedFridge();

  // Re-read storage on every focus so a fresh scan saved on the Fridge Vision
  // screen is reflected here when the user navigates back — without it the
  // screen kept showing the ingredients from the previous scan.
  useFocusEffect(
    useCallback(() => {
      reload().catch(() => {});
    }, [reload]),
  );

  const ids = useMemo(() => ingredientIds ?? [], [ingredientIds]);
  const labels = useMemo(() => unmappedLabels ?? [], [unmappedLabels]);

  const totalCount = useMemo(
    () => ids.length + labels.length,
    [ids.length, labels.length],
  );

  const handleRemoveMapped = useCallback(
    async (id: IngredientId) => {
      await save({
        ingredientIds: ids.filter((existing) => existing !== id),
        unmappedLabels: labels,
      });
    },
    [ids, labels, save],
  );

  const handleRemoveUnmapped = useCallback(
    async (label: string) => {
      await save({
        ingredientIds: ids,
        unmappedLabels: labels.filter((existing) => existing !== label),
      });
    },
    [ids, labels, save],
  );

  const handleRescan = useCallback(() => {
    router.push('/vision/fridge');
  }, [router]);

  const handleClear = useCallback(async () => {
    await reset();
  }, [reset]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: 64,
        paddingBottom: 48,
        gap: 18,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ gap: 6 }}>
        <KleanText variant="h1" color={colors.ink}>
          {t('vision.confirmedFridge.title')}
        </KleanText>
        <KleanText variant="body" color={colors.muted}>
          {totalCount > 0
            ? t('vision.confirmedFridge.subtitle', { count: totalCount })
            : t('vision.confirmedFridge.emptyBody')}
        </KleanText>
      </View>

      {loading && (
        <Card>
          <KleanText variant="body" color={colors.muted}>
            {t('vision.confirmedFridge.loading')}
          </KleanText>
        </Card>
      )}

      {!loading && ids.length > 0 && (
        <Card style={{ gap: 8 }}>
          <KleanText
            variant="caption"
            color={colors.muted}
            weight="700"
            style={{ letterSpacing: 1, textTransform: 'uppercase' }}
          >
            {t('vision.confirmedFridge.mappedSection')}
          </KleanText>
          {ids.map((id) => (
            <IngredientRow
              key={id}
              label={t(`vision.ingredients.${id}`, { defaultValue: id })}
              onRemove={() => handleRemoveMapped(id)}
              testID={`confirmed-remove-${id}`}
            />
          ))}
        </Card>
      )}

      {!loading && labels.length > 0 && (
        <Card style={{ gap: 8 }}>
          <KleanText
            variant="caption"
            color={colors.muted}
            weight="700"
            style={{ letterSpacing: 1, textTransform: 'uppercase' }}
          >
            {t('vision.confirmedFridge.unmappedSection')}
          </KleanText>
          {labels.map((label) => (
            <IngredientRow
              key={label}
              label={formatRawLabel(label)}
              estimatedNutrition
              onRemove={() => handleRemoveUnmapped(label)}
              testID={`confirmed-remove-unmapped-${label}`}
            />
          ))}
        </Card>
      )}

      {!loading && totalCount === 0 && (
        <Card style={{ gap: 10 }}>
          <KleanText variant="bodyMedium" color={colors.ink}>
            {t('vision.confirmedFridge.emptyTitle')}
          </KleanText>
          <KleanText variant="caption" color={colors.muted}>
            {t('vision.confirmedFridge.emptyBody')}
          </KleanText>
        </Card>
      )}

      <PillButton
        label={t('vision.confirmedFridge.rescanCta')}
        onPress={handleRescan}
        testID="confirmed-rescan"
      />
      {totalCount > 0 && (
        <PillButton
          label={t('vision.confirmedFridge.clearAllCta')}
          variant="ghost"
          onPress={handleClear}
          testID="confirmed-clear-all"
        />
      )}
      <PillButton
        label={t('vision.confirmedFridge.backCta')}
        variant="ghost"
        onPress={() => router.back()}
      />
    </ScrollView>
  );
}
