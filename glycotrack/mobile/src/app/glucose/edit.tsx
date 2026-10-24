import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { useAppData, useSettings, useStore } from '@/data/store-context';
import { combine, toDateKey, toTimeOfDay } from '@/domain/dates';
import { CONTEXT_LABEL, formatGlucose, rangeStatus, validateGlucoseEntry } from '@/domain/glucose';
import { GLUCOSE_CONTEXTS, type GlucoseContext } from '@/domain/types';
import { confirmAsync } from '@/services/dialogs';
import { Button } from '@/ui/button';
import { ChoiceField, DateField, TextField, TimeField } from '@/ui/fields';
import { FormScreen } from '@/ui/layout';
import { Badge, RangeBadge, SafetyNote } from '@/ui/status';
import { Text } from '@/ui/text';
import { spacing } from '@/ui/theme';

const CONTEXT_OPTIONS = GLUCOSE_CONTEXTS.map((c) => ({ value: c, label: CONTEXT_LABEL[c] }));

export default function EditGlucoseScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const store = useStore();
  const settings = useSettings();
  const existing = useAppData((d) => d.glucose.find((g) => g.id === id));
  const unit = settings.glucoseUnit;

  const initialAt = existing ? new Date(existing.takenAt) : new Date();
  const initialValue = existing ? formatGlucose(existing.valueMgdl, unit) : '';
  const [value, setValue] = useState(initialValue);
  const [context, setContext] = useState<GlucoseContext>(existing?.context ?? guessContext(initialAt));
  const [date, setDate] = useState(toDateKey(initialAt));
  const [time, setTime] = useState(toTimeOfDay(initialAt));
  const [note, setNote] = useState(existing?.note ?? '');
  const [submitted, setSubmitted] = useState(false);
  const [inFuture, setInFuture] = useState(false);

  const validation = validateGlucoseEntry(value, unit);
  const at = combine(date, time);
  const status = validation.ok ? rangeStatus(validation.mgdl, settings.targetLowMgdl, settings.targetHighMgdl) : null;

  const save = () => {
    setSubmitted(true);
    const future = at.getTime() > Date.now() + 5 * 60_000;
    setInFuture(future);
    if (!validation.ok || future) return;
    store.upsert('glucose', {
      id: existing?.id,
      demo: existing?.demo,
      // Keep the stored value exactly when the displayed value wasn't edited (avoids unit round-trip drift).
      valueMgdl: existing && value === initialValue ? existing.valueMgdl : Math.round(validation.mgdl * 10) / 10,
      takenAt: at.toISOString(),
      context,
      source: 'manual',
      note: note.trim() || undefined,
    });
    router.back();
  };

  const remove = async () => {
    if (!existing) return;
    const ok = await confirmAsync({
      title: 'Delete this reading?',
      message: 'This permanently removes the reading from this device.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (ok) {
      store.remove('glucose', existing.id);
      router.back();
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: existing ? 'Edit reading' : 'Log glucose' }} />
      <FormScreen
        footer={
          <>
            {existing ? <Button label="Delete" variant="destructive" icon="trash" onPress={remove} testID="delete-reading" /> : null}
            <Button label={existing ? 'Save changes' : 'Save reading'} onPress={save} style={{ flex: 1 }} testID="save-reading" />
          </>
        }>
        {existing?.demo ? <Badge label="Fictional sample reading" tone="demo" icon="sparkles" /> : null}
        <TextField
          testID="glucose-value"
          label="Glucose value"
          hint={`From your meter, in ${unit}`}
          large
          suffix={unit}
          value={value}
          onChangeText={setValue}
          keyboardType="decimal-pad"
          placeholder={unit === 'mg/dL' ? '110' : '6.1'}
          autoFocus={!existing}
          error={submitted && !validation.ok ? validation.message : undefined}
        />
        {status ? (
          <View style={{ gap: spacing.sm }}>
            <RangeBadge status={status} />
            {status === 'below' ? (
              <SafetyNote>
                This value is below the target range you set. Follow the plan from your care team. GlycoTrack does not monitor
                glucose or send alerts.
              </SafetyNote>
            ) : null}
          </View>
        ) : null}
        <ChoiceField testID="context" label="When was this?" options={CONTEXT_OPTIONS} value={context} onChange={setContext} />
        <DateField label="Date" value={date} onChange={setDate} allowFuture={false} />
        <TimeField testID="time" label="Time" value={time} onChange={setTime} />
        {submitted && inFuture ? (
          <Text variant="footnote" color="danger" accessibilityRole="alert">
            The time can’t be in the future.
          </Text>
        ) : null}
        <TextField
          testID="glucose-note"
          label="Note"
          hint="Optional — how you felt, activity, anything to remember"
          value={note}
          onChangeText={setNote}
          multiline
          maxLength={500}
        />
      </FormScreen>
    </>
  );
}

function guessContext(at: Date): GlucoseContext {
  const h = at.getHours();
  if (h < 5) return 'overnight';
  if (h < 9) return 'fasting';
  if (h >= 21) return 'bedtime';
  return 'other';
}
