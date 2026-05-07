import React, { useCallback } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';

import { Card } from '../../../components/ui/card';
import { KleanText } from '../../../components/ui/klean-text';
import { PillButton } from '../../../components/ui/pill-button';
import { colors, radii } from '../../../design/tokens';
import type { Equipment } from '../../../types/workout.types';
import { useConfirmedEquipment } from '../hooks/useConfirmedEquipment';
import { useGymVisionFlow } from '../hooks/useGymVisionFlow';
import { EQUIPMENT_CATALOG } from '../data/equipment-catalog';

const labelKeyById: Record<string, string> = Object.fromEntries(
  EQUIPMENT_CATALOG.map((e) => [e.internalId, e.labelKey]),
);

/**
 * Mock image picker. Real implementation will call `expo-image-picker` once
 * the dependency is approved and added — until then we hand the flow a
 * synthetic image URI so the rest of the pipeline (provider, parser,
 * mapper, UI) can be exercised end-to-end.
 */
function pickMockImage(index: number): { uri: string; mimeType: string } {
  return {
    uri: `mock://gym-photo-${index}-${Date.now()}.jpg`,
    mimeType: 'image/jpeg',
  };
}

interface ResultRowProps {
  internalId: Equipment;
  label: string;
  rawLabel: string;
  confidence: number;
  selected: boolean;
  onToggle: () => void;
}

function ResultRow({
  label,
  rawLabel,
  confidence,
  selected,
  onToggle,
}: ResultRowProps) {
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
          {t('vision.gym.results.rawLabel', { label: rawLabel })}
        </KleanText>
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
          {t('vision.gym.results.confidence', { percent: Math.round(confidence * 100) })}
        </KleanText>
      </View>
    </Pressable>
  );
}

export function GymVisionScreen() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const flow = useGymVisionFlow();
  const { save } = useConfirmedEquipment();

  const handlePickImage = useCallback(() => {
    flow.addImage(pickMockImage(flow.state.images.length + 1));
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
          {t('vision.gym.title')}
        </KleanText>
        <KleanText variant="body" color={colors.muted}>
          {t('vision.gym.subtitle')}
        </KleanText>
      </View>

      {state.stage === 'idle' && (
        <Card style={{ gap: 14 }}>
          <KleanText variant="body" color={colors.ink}>
            {t('vision.gym.intro')}
          </KleanText>
          <KleanText variant="caption" color={colors.muted}>
            {t('vision.gym.mockNotice')}
          </KleanText>
          <PillButton
            label={
              state.images.length === 0
                ? t('vision.gym.addPhotosCta')
                : t('vision.gym.addMorePhotosCta')
            }
            variant="outline"
            onPress={handlePickImage}
            testID="vision-add-photo"
          />
          {state.images.length === 0 && (
            <KleanText variant="caption" color={colors.muted}>
              {t('vision.gym.noImagesHint')}
            </KleanText>
          )}
          {state.images.length > 0 && (
            <View style={{ gap: 8 }}>
              <KleanText variant="caption" color={colors.muted}>
                {t('vision.gym.imagesSelected', { count: state.images.length })}
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
                    accessibilityLabel={t('vision.gym.removePhoto')}
                  >
                    <KleanText variant="caption" color={colors.energy} weight="700">
                      {t('vision.gym.removePhoto')}
                    </KleanText>
                  </Pressable>
                </View>
              ))}
              <PillButton
                label={t('vision.gym.analyzeCta')}
                onPress={handleAnalyze}
                disabled={state.images.length === 0}
                testID="vision-analyze"
              />
            </View>
          )}
        </Card>
      )}

      {state.stage === 'analyzing' && (
        <Card style={{ alignItems: 'center', gap: 12, paddingVertical: 32 }}>
          <ActivityIndicator color={colors.brand} />
          <KleanText variant="bodyMedium" color={colors.ink}>
            {t('vision.gym.analyzing')}
          </KleanText>
        </Card>
      )}

      {state.stage === 'error' && (
        <Card style={{ gap: 10 }}>
          <KleanText variant="h3" color={colors.ink}>
            {t(
              state.failureReason === 'no_detections'
                ? 'vision.gym.errors.noDetectionsTitle'
                : state.failureReason === 'invalid_schema'
                  ? 'vision.gym.errors.schemaTitle'
                  : 'vision.gym.errors.providerTitle',
            )}
          </KleanText>
          <KleanText variant="body" color={colors.muted}>
            {t(
              state.failureReason === 'no_detections'
                ? 'vision.gym.errors.noDetectionsBody'
                : state.failureReason === 'invalid_schema'
                  ? 'vision.gym.errors.schemaBody'
                  : 'vision.gym.errors.providerBody',
            )}
          </KleanText>
          <PillButton
            label={t('vision.gym.retryCta')}
            variant="outline"
            onPress={handleAnalyze}
            testID="vision-retry"
          />
        </Card>
      )}

      {state.stage === 'results' && (
        <Card style={{ gap: 12 }}>
          <View style={{ gap: 4 }}>
            <KleanText variant="h3" color={colors.ink}>
              {t('vision.gym.results.title')}
            </KleanText>
            <KleanText variant="body" color={colors.muted}>
              {t('vision.gym.results.subtitle')}
            </KleanText>
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={flow.selectAll} testID="vision-select-all">
              <KleanText variant="caption" color={colors.brand} weight="700">
                {t('vision.gym.results.selectAll')}
              </KleanText>
            </Pressable>
            <KleanText variant="caption" color={colors.border}>
              ·
            </KleanText>
            <Pressable onPress={flow.clearAll} testID="vision-clear-all">
              <KleanText variant="caption" color={colors.muted} weight="700">
                {t('vision.gym.results.clearAll')}
              </KleanText>
            </Pressable>
          </View>

          <View style={{ gap: 8 }}>
            {state.detected.map((item) => {
              const labelKey = labelKeyById[item.internalId];
              return (
                <ResultRow
                  key={item.internalId}
                  internalId={item.internalId}
                  label={labelKey ? t(labelKey) : item.rawLabel}
                  rawLabel={item.rawLabel}
                  confidence={item.confidence}
                  selected={!!state.selection[item.internalId]}
                  onToggle={() => flow.toggleSelection(item.internalId)}
                />
              );
            })}
          </View>

          {flow.selectedIds.length === 0 && (
            <KleanText variant="caption" color={colors.muted}>
              {t('vision.gym.results.noneSelectedHint')}
            </KleanText>
          )}

          <PillButton
            label={t('vision.gym.results.saveCta')}
            onPress={handleSave}
            testID="vision-save"
          />
          <PillButton
            label={t('vision.gym.results.skipCta')}
            variant="ghost"
            onPress={handleSkip}
          />
        </Card>
      )}

      {state.stage === 'saved' && (
        <Card style={{ gap: 10 }}>
          <KleanText variant="h3" color={colors.ink}>
            {t('vision.gym.results.savedTitle')}
          </KleanText>
          <KleanText variant="body" color={colors.muted}>
            {t('vision.gym.results.savedBody')}
          </KleanText>
          <PillButton
            label={t('onboarding.next')}
            onPress={handleSkip}
            testID="vision-saved-continue"
          />
        </Card>
      )}
    </ScrollView>
  );
}
