import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { useAppData, useStore } from '@/data/store-context';
import { addDays, toDateKey } from '@/domain/dates';
import { FORM_LABEL, sortTimes } from '@/domain/medications';
import { MEDICATION_FORMS, type MedicationForm, type TimeOfDay } from '@/domain/types';
import { confirmAsync } from '@/services/dialogs';
import { Button, IconButton } from '@/ui/button';
import { ToggleRow } from '@/ui/controls';
import { ChoiceField, DateField, FieldLabel, TextField, TimeField } from '@/ui/fields';
import { Card, Divider, FormScreen } from '@/ui/layout';
import { Badge, SafetyNote } from '@/ui/status';
import { spacing } from '@/ui/theme';

const FORM_OPTIONS = MEDICATION_FORMS.map((f) => ({ value: f, label: FORM_LABEL[f] }));

export default function EditMedicationScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const store = useStore();
  const existing = useAppData((d) => d.medications.find((m) => m.id === id));

  const [name, setName] = useState(existing?.name ?? '');
  const [strength, setStrength] = useState(existing?.strength ?? '');
  const [form, setForm] = useState<MedicationForm>(existing?.form ?? 'tablet');
  const [instructions, setInstructions] = useState(existing?.instructions ?? '');
  const [times, setTimes] = useState<TimeOfDay[]>(existing?.times ?? ['08:00']);
  const [remindersOn, setRemindersOn] = useState(existing?.remindersOn ?? true);
  const [active, setActive] = useState(existing?.active ?? true);
  const [prescriber, setPrescriber] = useState(existing?.prescriber ?? '');
  const [trackRefill, setTrackRefill] = useState(!!existing?.refillOn);
  const [refillOn, setRefillOn] = useState(existing?.refillOn ?? toDateKey(addDays(new Date(), 30)));
  const [submitted, setSubmitted] = useState(false);

  const save = () => {
    setSubmitted(true);
    if (!name.trim()) return;
    store.upsert('medications', {
      id: existing?.id,
      demo: existing?.demo,
      name: name.trim(),
      strength: strength.trim(),
      form,
      instructions: instructions.trim(),
      times: sortTimes(times),
      remindersOn,
      active,
      prescriber: prescriber.trim() || undefined,
      refillOn: trackRefill ? refillOn : undefined,
    });
    router.back();
  };

  const remove = async () => {
    if (!existing) return;
    const ok = await confirmAsync({
      title: `Delete ${existing.name}?`,
      message: 'This also deletes its dose history. To keep history, turn off “Currently taking” instead.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (ok) {
      store.remove('medications', existing.id);
      router.back();
    }
  };

  const setTimeAt = (i: number, v: TimeOfDay) => setTimes((ts) => ts.map((t, j) => (j === i ? v : t)));

  return (
    <>
      <Stack.Screen options={{ title: existing ? 'Edit medication' : 'Add medication' }} />
      <FormScreen
        footer={
          <>
            {existing ? <Button label="Delete" variant="destructive" icon="trash" onPress={remove} testID="delete-med" /> : null}
            <Button label="Save medication" onPress={save} style={{ flex: 1 }} testID="save-med" />
          </>
        }>
        {existing?.demo ? <Badge label="Fictional sample prescription" tone="demo" icon="sparkles" /> : null}
        <SafetyNote>
          Enter exactly what your prescription label says. GlycoTrack never calculates or changes doses.
        </SafetyNote>
        <TextField testID="med-name" label="Medication name" value={name} onChangeText={setName} error={submitted && !name.trim() ? 'Add the medication name.' : undefined} maxLength={80} />
        <TextField testID="med-strength" label="Strength" hint="As written on the label, e.g. 500 mg" value={strength} onChangeText={setStrength} maxLength={40} />
        <ChoiceField testID="med-form" label="Form" options={FORM_OPTIONS} value={form} onChange={setForm} />
        <TextField label="Instructions" hint="As given by your prescriber" value={instructions} onChangeText={setInstructions} multiline maxLength={500} />

        <View style={{ gap: spacing.md }}>
          <FieldLabel label="Scheduled times" hint="Used for your daily checklist and reminders" />
          {times.map((t, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <TimeField testID={`med-time-${i}`} label={`Time ${i + 1}`} value={t} onChange={(v) => setTimeAt(i, v)} />
              </View>
              <IconButton icon="trash" variant="plain" label={`Remove time ${i + 1}`} onPress={() => setTimes((ts) => ts.filter((_, j) => j !== i))} />
            </View>
          ))}
          <Button
            testID="add-time"
            label="Add a time"
            icon="plus"
            variant="secondary"
            size="sm"
            onPress={() => setTimes((ts) => [...ts, ts.length ? '20:00' : '08:00'])}
          />
        </View>

        <Card padded={false}>
          <ToggleRow testID="med-reminders" icon="bell" title="Reminders" subtitle="Notify me at the scheduled times" value={remindersOn} onValueChange={setRemindersOn} />
          <Divider inset={spacing.lg} />
          <ToggleRow testID="med-active" icon="meds" title="Currently taking" subtitle="Turn off to keep history without reminders" value={active} onValueChange={setActive} />
          <Divider inset={spacing.lg} />
          <ToggleRow icon="refill" title="Track refill date" value={trackRefill} onValueChange={setTrackRefill} />
        </Card>
        {trackRefill ? <DateField label="Refill due" value={refillOn} onChange={setRefillOn} /> : null}
        <TextField label="Prescriber" hint="Optional" value={prescriber} onChangeText={setPrescriber} maxLength={80} />
      </FormScreen>
    </>
  );
}
