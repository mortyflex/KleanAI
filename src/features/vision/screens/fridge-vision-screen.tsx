import React, { useCallback } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';

import { Card } from '../../../components/ui/card';
import { KleanText } from '../../../components/ui/klean-text';
import { PillButton } from '../../../components/ui/pill-button';
import { colors, radii } from '../../../design/tokens';
import type { IngredientId } from '../../../types/ai.types';
import { useConfirmedFridge } from '../hooks/useConfirmedFridge';
import { useFridgeVisionFlow } from '../hooks/useFridgeVisionFlow';
import { INGREDIENT_CATALOG } from '../data/ingredient-catalog';

const labelKeyById: Record<string, string> = Object.fromEntries(
  INGREDIENT_CATALOG.map((e) => [e.internalId, e.labelKey]),
);

/**
 * Mock image picker. Real implementation will call `expo-image-picker` once
 * the dependency is approved and added — until then we hand the flow a
 * synthetic image URI so the rest of the pipeline (provider, parser,
 * mapper, UI) can be exercised end-to-end.
 */
function pickMockFridgeImage(index: number): { uri: string; mimeType: string } {
  return {
    uri: `mock://fridge-photo-${index}-${Date.now()}.jpg`,
    mimeType: 'image/jpeg',
  };
}

interface IngredientRowProps {
  internalId: IngredientId;
  label: string;
  rawLabel: string;
  confidence: number;
  selected: boolean;
  uncertaintyNote?: string;
  onToggle: () => void;
}

function IngredientRow({
  label,
  rawLabel,
  confidence,
  selected,
  uncertaintyNote,
  onToggle,
}: IngredientRowProps) {
  const { t } = useTranslation('common');
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: selected ? colors.brandLight : colors.bg,
        borderRadius: radii.chip,
        borderWidth: 1,
        borderColor: selected ? colors.brand : colors.border,
      }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          borderWidth: 2,
          borderColor: selected ? colors.brand : colors.muted,
          backgroundColor: selected ? colors.brand : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {selected ? (
          <KleanText variant="caption" color="#FFFFFF" weight="800">
            ✓
          </KleanText>
        ) : null}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <KleanText variant="bodyMedium" color={colors.ink}>
          {label}
        </KleanText>
        <KleanText variant="caption" color={colors.muted}>
          {t('vision.fridge.results.rawLabel', { label: rawLabel })}
        </KleanText>
        {uncertaintyNote ? (
          <KleanText variant="caption" color={colors.muted}>
            {uncertaintyNote}
          </KleanText>
        ) : null}
      </View>
      <View
        style={{
          backgroundColor: colors.card,
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: radii.pill,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <KleanText variant="caption" color={colors.muted}>
          {t('vision.fridge.results.confidence', { percent: Math.round(confidence * 100) })}
        </KleanText>
      </View>
    </Pressable>
  );
}

export function FridgeVisionScreen() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const flow = useFridgeVisionFlow();
  const { save } = useConfirmedFridge();

  const handlePickImage = useCallback(() => {
    flow.addImage(pickMockFridgeImage(flow.state.images.length + 1));
  }, [flow]);

  const handleAnalyze = useCallback(() => {
    flow.analyze().catch(() => {});
  }, [flow]);

  const handleSave = useCallback(async () => {
    await save(flow.selectedIds);
    flow.markSaved();
  }, [flow, save]);

  const handleSkip = useCallback(() => {
    router.back();
  }, [router]);

  const { state } = flow;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: 64,
        paddingBottom: 48,
        gap: 16,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ gap: 6 }}>
        <KleanText variant="h1" color={colors.ink}>
          {t('vision.fridge.title')}
        </KleanText>
        <KleanText variant="body" color={colors.muted}>
          {t('vision.fridge.subtitle')}
        </KleanText>
      </View>

      {state.stage === 'idle' && (
        <Card style={{ gap: 14 }}>
          <KleanText variant="body" color={colors.ink}>
            {t('vision.fridge.intro')}
          </KleanText>
          <KleanText variant="caption" color={colors.muted}>
            {t('vision.fridge.mockNotice')}
          </KleanText>
          <PillButton
            label={
              state.images.length === 0
                ? t('vision.fridge.addPhotosCta')
                : t('vision.fridge.addMorePhotosCta')
            }
            variant="outline"
            onPress={handlePickImage}
            testID="fridge-add-photo"
          />
          {state.images.length === 0 && (
            <KleanText variant="caption" color={colors.muted}>
              {t('vision.fridge.noImagesHint')}
            </KleanText>
          )}
          {state.images.length > 0 && (
            <View style={{ gap: 8 }}>
              <KleanText variant="caption" color={colors.muted}>
                {t('vision.fridge.imagesSelected', { count: state.images.length })}
              </KleanText>
              {state.images.map((img) => (
                <View
                  key={img.uri}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    backgroundColor: colors.bg,
                    borderRadius: radii.chip,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <KleanText
                    variant="caption"
                    color={colors.ink}
                    style={{ flex: 1 }}
                    numberOfLines={1}
                  >
                    {img.uri}
                  </KleanText>
                  <Pressable
                    onPress={() => flow.removeImage(img.uri)}
                    accessibilityLabel={t('vision.fridge.removePhoto')}
                  >
                    <KleanText variant="caption" color={colors.energy} weight="700">
                      {t('vision.fridge.removePhoto')}
                    </KleanText>
                  </Pressable>
                </View>
              ))}
              <PillButton
                label={t('vision.fridge.analyzeCta')}
                onPress={handleAnalyze}
                disabled={state.images.length === 0}
                testID="fridge-analyze"
              />
            </View>
          )}
        </Card>
      )}

      {state.stage === 'analyzing' && (
        <Card style={{ alignItems: 'center', gap: 12, paddingVertical: 32 }}>
          <ActivityIndicator color={colors.brand} />
          <KleanText variant="bodyMedium" color={colors.ink}>
            {t('vision.fridge.analyzing')}
          </KleanText>
        </Card>
      )}

      {state.stage === 'error' && (
        <Card style={{ gap: 10 }}>
          <KleanText variant="h3" color={colors.ink}>
            {t(
              state.failureReason === 'no_detections'
                ? 'vision.fridge.errors.noDetectionsTitle'
                : state.failureReason === 'invalid_schema'
                  ? 'vision.fridge.errors.schemaTitle'
                  : 'vision.fridge.errors.providerTitle',
            )}
          </KleanText>
          <KleanText variant="body" color={colors.muted}>
            {t(
              state.failureReason === 'no_detections'
                ? 'vision.fridge.errors.noDetectionsBody'
                : state.failureReason === 'invalid_schema'
                  ? 'vision.fridge.errors.schemaBody'
                  : 'vision.fridge.errors.providerBody',
            )}
          </KleanText>
          <PillButton
            label={t('vision.fridge.retryCta')}
            variant="outline"
            onPress={handleAnalyze}
            testID="fridge-retry"
          />
        </Card>
      )}

      {state.stage === 'results' && (
        <Card style={{ gap: 12 }}>
          <View style={{ gap: 4 }}>
            <KleanText variant="h3" color={colors.ink}>
              {t('vision.fridge.results.title')}
            </KleanText>
            <KleanText variant="body" color={colors.muted}>
              {t('vision.fridge.results.subtitle')}
            </KleanText>
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={flow.selectAll} testID="fridge-select-all">
              <KleanText variant="caption" color={colors.brand} weight="700">
                {t('vision.fridge.results.selectAll')}
              </KleanText>
            </Pressable>
            <KleanText variant="caption" color={colors.border}>
              ·
            </KleanText>
            <Pressable onPress={flow.clearAll} testID="fridge-clear-all">
              <KleanText variant="caption" color={colors.muted} weight="700">
                {t('vision.fridge.results.clearAll')}
              </KleanText>
            </Pressable>
          </View>

          <View style={{ gap: 8 }}>
            {state.detected.map((item) => {
              const labelKey = labelKeyById[item.internalId];
              return (
                <IngredientRow
                  key={item.internalId}
                  internalId={item.internalId}
                  label={labelKey ? t(labelKey) : item.rawLabel}
                  rawLabel={item.rawLabel}
                  confidence={item.confidence}
                  uncertaintyNote={item.uncertaintyNote}
                  selected={!!state.selection[item.internalId]}
                  onToggle={() => flow.toggleSelection(item.internalId)}
                />
              );
            })}
          </View>

          {flow.selectedIds.length === 0 && (
            <KleanText variant="caption" color={colors.muted}>
              {t('vision.fridge.results.noneSelectedHint')}
            </KleanText>
          )}

          <PillButton
            label={t('vision.fridge.results.saveCta')}
            onPress={handleSave}
            testID="fridge-save"
          />
          <PillButton
            label={t('vision.fridge.results.skipCta')}
            variant="ghost"
            onPress={handleSkip}
          />
        </Card>
      )}

      {state.stage === 'saved' && (
        <Card style={{ gap: 10 }}>
          <KleanText variant="h3" color={colors.ink}>
            {t('vision.fridge.results.savedTitle')}
          </KleanText>
          <KleanText variant="body" color={colors.muted}>
            {t('vision.fridge.results.savedBody')}
          </KleanText>
          <PillButton
            label={t('onboarding.next')}
            onPress={handleSkip}
            testID="fridge-saved-continue"
          />
        </Card>
      )}
    </ScrollView>
  );
}
