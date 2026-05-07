import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, View } from 'react-native';
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
import {
  createMockFridgeImage,
  isMockImageUri,
  pickFridgeImage,
  type PickerOutcome,
} from '../utils/image-picker';

const labelKeyById: Record<string, string> = Object.fromEntries(
  INGREDIENT_CATALOG.map((e) => [e.internalId, e.labelKey]),
);

type PickerErrorKind = 'permission_denied' | 'unavailable';

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

interface ImagePreviewProps {
  uri: string;
  onRemove: () => void;
  onReplace: () => void;
}

function ImagePreview({ uri, onRemove, onReplace }: ImagePreviewProps) {
  const { t } = useTranslation('common');
  const isMock = isMockImageUri(uri);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 10,
        backgroundColor: colors.bg,
        borderRadius: radii.chip,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: radii.chip,
          backgroundColor: colors.brandLight,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {isMock ? (
          <KleanText variant="caption" color={colors.brand} weight="700">
            ★
          </KleanText>
        ) : (
          <Image
            source={{ uri }}
            accessibilityLabel={t('vision.fridge.previewAlt')}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        )}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <KleanText variant="bodyMedium" color={colors.ink} numberOfLines={1}>
          {isMock ? t('vision.fridge.demoImageBadge') : uri.split('/').pop()}
        </KleanText>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Pressable
            onPress={onReplace}
            accessibilityLabel={t('vision.fridge.replacePhoto')}
            testID="fridge-replace-photo"
          >
            <KleanText variant="caption" color={colors.brand} weight="700">
              {t('vision.fridge.replacePhoto')}
            </KleanText>
          </Pressable>
          <Pressable
            onPress={onRemove}
            accessibilityLabel={t('vision.fridge.removePhoto')}
            testID={`fridge-remove-photo-${uri}`}
          >
            <KleanText variant="caption" color={colors.energy} weight="700">
              {t('vision.fridge.removePhoto')}
            </KleanText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export function FridgeVisionScreen() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const flow = useFridgeVisionFlow();
  const { save } = useConfirmedFridge();
  const [pickerError, setPickerError] = useState<PickerErrorKind | null>(null);

  const handleOutcome = useCallback(
    (outcome: PickerOutcome, replaceUri?: string) => {
      if (outcome.ok) {
        setPickerError(null);
        if (replaceUri) flow.removeImage(replaceUri);
        flow.addImage(outcome.image);
        return;
      }
      if (outcome.reason === 'cancelled') return;
      setPickerError(outcome.reason);
    },
    [flow],
  );

  const handlePickFromLibrary = useCallback(
    async (replaceUri?: string) => {
      const outcome = await pickFridgeImage('library');
      handleOutcome(outcome, replaceUri);
    },
    [handleOutcome],
  );

  const handleTakePhoto = useCallback(
    async (replaceUri?: string) => {
      const outcome = await pickFridgeImage('camera');
      handleOutcome(outcome, replaceUri);
    },
    [handleOutcome],
  );

  const handleAddMockImage = useCallback(() => {
    setPickerError(null);
    flow.addImage(createMockFridgeImage(flow.state.images.length + 1));
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
  const showDevControls = __DEV__;
  const hasImages = state.images.length > 0;

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

          <View style={{ gap: 6 }}>
            <KleanText variant="caption" color={colors.muted} weight="700">
              {t('vision.fridge.howItWorksTitle')}
            </KleanText>
            <KleanText variant="caption" color={colors.muted}>
              1. {t('vision.fridge.howItWorksStep1')}
            </KleanText>
            <KleanText variant="caption" color={colors.muted}>
              2. {t('vision.fridge.howItWorksStep2')}
            </KleanText>
            <KleanText variant="caption" color={colors.muted}>
              3. {t('vision.fridge.howItWorksStep3')}
            </KleanText>
          </View>

          <View style={{ gap: 8 }}>
            <PillButton
              label={t('vision.fridge.takePhotoCta')}
              onPress={() => handleTakePhoto()}
              testID="fridge-take-photo"
            />
            <PillButton
              label={t('vision.fridge.pickFromLibraryCta')}
              variant="outline"
              onPress={() => handlePickFromLibrary()}
              testID="fridge-pick-library"
            />
            {showDevControls && (
              <PillButton
                label={t('vision.fridge.useMockImageCta')}
                variant="ghost"
                onPress={handleAddMockImage}
                testID="fridge-add-photo"
              />
            )}
          </View>

          {pickerError && (
            <View
              style={{
                gap: 4,
                padding: 12,
                backgroundColor: colors.energyLight,
                borderRadius: radii.chip,
                borderWidth: 1,
                borderColor: colors.energy,
              }}
              accessibilityRole="alert"
            >
              <KleanText variant="bodyMedium" color={colors.ink}>
                {t(
                  pickerError === 'permission_denied'
                    ? 'vision.fridge.permissionDeniedTitle'
                    : 'vision.fridge.pickerUnavailableTitle',
                )}
              </KleanText>
              <KleanText variant="caption" color={colors.muted}>
                {t(
                  pickerError === 'permission_denied'
                    ? 'vision.fridge.permissionDeniedBody'
                    : 'vision.fridge.pickerUnavailableBody',
                )}
              </KleanText>
            </View>
          )}

          {showDevControls && (
            <KleanText variant="caption" color={colors.muted}>
              {t('vision.fridge.mockNotice')}
            </KleanText>
          )}

          {!hasImages && (
            <KleanText variant="caption" color={colors.muted}>
              {t('vision.fridge.noImagesHint')}
            </KleanText>
          )}

          {hasImages && (
            <View style={{ gap: 8 }}>
              <KleanText variant="caption" color={colors.muted}>
                {t('vision.fridge.imagesSelected', { count: state.images.length })}
              </KleanText>
              {state.images.map((img) => (
                <ImagePreview
                  key={img.uri}
                  uri={img.uri}
                  onRemove={() => flow.removeImage(img.uri)}
                  onReplace={() => handlePickFromLibrary(img.uri)}
                />
              ))}
              <PillButton
                label={t('vision.fridge.addMorePhotosCta')}
                variant="outline"
                onPress={() => handlePickFromLibrary()}
                testID="fridge-add-more"
              />
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
          {showDevControls && (
            <KleanText variant="caption" color={colors.muted}>
              {t('vision.fridge.mockNotice')}
            </KleanText>
          )}
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
