import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { useAppData, useStore } from '@/data/store-context';
import { addDays, combine, toDateKey, toTimeOfDay } from '@/domain/dates';
import { confirmAsync } from '@/services/dialogs';
import { Button } from '@/ui/button';
import { Stepper } from '@/ui/controls';
import { DateField, TextField, TimeField } from '@/ui/fields';
import { Card, FormScreen } from '@/ui/layout';
import { Badge } from '@/ui/status';

export default function EditAppointmentScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const store = useStore();
  const existing = useAppData((d) => d.appointments.find((a) => a.id === id));
  const start = existing ? new Date(existing.startsAt) : addDays(new Date(), 7);

  const [title, setTitle] = useState(existing?.title ?? '');
  const [provider, setProvider] = useState(existing?.provider ?? '');
  const [specialty, setSpecialty] = useState(existing?.specialty ?? '');
  const [location, setLocation] = useState(existing?.location ?? '');
  const [date, setDate] = useState(toDateKey(start));
  const [time, setTime] = useState(existing ? toTimeOfDay(start) : '09:00');
  const [duration, setDuration] = useState(existing?.durationMinutes ?? 30);
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [submitted, setSubmitted] = useState(false);

  const save = () => {
    setSubmitted(true);
    if (!title.trim()) return;
    store.upsert('appointments', {
      id: existing?.id,
      demo: existing?.demo,
      title: title.trim(),
      provider: provider.trim(),
      specialty: specialty.trim(),
      location: location.trim(),
      startsAt: combine(date, time).toISOString(),
      durationMinutes: duration,
      notes: notes.trim(),
    });
    router.back();
  };

  const remove = async () => {
    if (!existing) return;
    if (await confirmAsync({ title: 'Delete this appointment?', message: 'This removes it from this device.', confirmLabel: 'Delete', destructive: true })) {
      store.remove('appointments', existing.id);
      router.back();
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: existing ? 'Edit appointment' : 'New appointment' }} />
      <FormScreen
        footer={
          <>
            {existing ? <Button label="Delete" variant="destructive" icon="trash" onPress={remove} testID="delete-appt" /> : null}
            <Button label="Save appointment" onPress={save} style={{ flex: 1 }} testID="save-appt" />
          </>
        }>
        {existing?.demo ? <Badge label="Fictional sample appointment" tone="demo" icon="sparkles" /> : null}
        <TextField testID="appt-title" label="Visit" placeholder="e.g. Endocrinology follow-up" value={title} onChangeText={setTitle} error={submitted && !title.trim() ? 'Name this visit.' : undefined} maxLength={120} />
        <TextField testID="appt-provider" label="Provider" placeholder="Doctor, nurse or clinic" value={provider} onChangeText={setProvider} maxLength={120} />
        <TextField label="Specialty" placeholder="e.g. Endocrinology" value={specialty} onChangeText={setSpecialty} maxLength={80} />
        <TextField label="Location" placeholder="Address, room or “Video visit”" value={location} onChangeText={setLocation} maxLength={200} />
        <DateField label="Date" value={date} onChange={setDate} />
        <TimeField testID="appt-time" label="Time" value={time} onChange={setTime} />
        <Card padded={false}>
          <Stepper label="Length (minutes)" value={duration} onChange={setDuration} min={5} max={480} step={5} />
        </Card>
        <TextField label="Prep notes and questions" hint="What to bring, what to ask" value={notes} onChangeText={setNotes} multiline maxLength={2000} />
      </FormScreen>
    </>
  );
}
