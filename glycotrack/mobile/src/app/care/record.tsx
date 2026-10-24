import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { useAppData, useStore } from '@/data/store-context';
import { toDateKey } from '@/domain/dates';
import { confirmAsync } from '@/services/dialogs';
import { Button } from '@/ui/button';
import { Chip } from '@/ui/controls';
import { DateField, FieldLabel, TextField } from '@/ui/fields';
import { FormScreen } from '@/ui/layout';
import { Badge, SafetyNote } from '@/ui/status';
import { spacing } from '@/ui/theme';

/** Common record types to speed up entry; values are always typed by the user. */
const PRESETS: { name: string; unit: string }[] = [
  { name: 'A1C', unit: '%' },
  { name: 'Blood pressure', unit: 'mmHg' },
  { name: 'LDL cholesterol', unit: 'mg/dL' },
  { name: 'eGFR', unit: 'mL/min/1.73m²' },
  { name: 'Weight', unit: 'lb' },
  { name: 'Urine albumin (UACR)', unit: 'mg/g' },
];

export default function EditRecordScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const store = useStore();
  const existing = useAppData((d) => d.records.find((r) => r.id === id));
  const [name, setName] = useState(existing?.name ?? '');
  const [value, setValue] = useState(existing?.value ?? '');
  const [unit, setUnit] = useState(existing?.unit ?? '');
  const [recordedOn, setRecordedOn] = useState(existing?.recordedOn ?? toDateKey(new Date()));
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [submitted, setSubmitted] = useState(false);

  const save = () => {
    setSubmitted(true);
    if (!name.trim() || !value.trim()) return;
    store.upsert('records', {
      id: existing?.id,
      demo: existing?.demo,
      name: name.trim(),
      value: value.trim(),
      unit: unit.trim(),
      recordedOn,
      notes: notes.trim(),
    });
    router.back();
  };

  const remove = async () => {
    if (!existing) return;
    if (await confirmAsync({ title: 'Delete this record?', message: 'This permanently removes it.', confirmLabel: 'Delete', destructive: true })) {
      store.remove('records', existing.id);
      router.back();
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: existing ? 'Edit record' : 'New health record' }} />
      <FormScreen
        footer={
          <>
            {existing ? <Button label="Delete" variant="destructive" icon="trash" onPress={remove} testID="delete-record" /> : null}
            <Button label="Save record" onPress={save} style={{ flex: 1 }} testID="save-record" />
          </>
        }>
        {existing?.demo ? <Badge label="Fictional sample record" tone="demo" icon="sparkles" /> : null}
        {!existing ? (
          <View style={{ gap: spacing.sm }}>
            <FieldLabel label="Common records" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {PRESETS.map((p) => (
                <Chip
                  key={p.name}
                  label={p.name}
                  selected={name === p.name}
                  onPress={() => {
                    setName(p.name);
                    setUnit(p.unit);
                  }}
                />
              ))}
            </View>
          </View>
        ) : null}
        <TextField testID="record-name" label="Test or measurement" value={name} onChangeText={setName} error={submitted && !name.trim() ? 'Add a name.' : undefined} maxLength={120} />
        <TextField testID="record-value" label="Result" hint="Exactly as reported" value={value} onChangeText={setValue} error={submitted && !value.trim() ? 'Add the result.' : undefined} maxLength={60} />
        <TextField label="Unit" value={unit} onChangeText={setUnit} maxLength={40} autoCapitalize="none" />
        <DateField label="Date" value={recordedOn} onChange={setRecordedOn} allowFuture={false} />
        <TextField label="Notes" hint="Optional" value={notes} onChangeText={setNotes} multiline maxLength={1000} />
        <SafetyNote>GlycoTrack stores results as entered and doesn’t interpret them.</SafetyNote>
      </FormScreen>
    </>
  );
}
