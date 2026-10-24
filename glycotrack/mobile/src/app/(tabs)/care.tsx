import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { useAppData } from '@/data/store-context';
import { formatRelativeDay, fromDateKey } from '@/domain/dates';
import { AppointmentRow } from '@/features/components';
import { useNow } from '@/features/hooks';
import { Button, IconButton } from '@/ui/button';
import { SegmentedControl } from '@/ui/controls';
import { TextField } from '@/ui/fields';
import { EmptyState, ListGroup, ListRow, Screen, Section } from '@/ui/layout';
import { SafetyNote } from '@/ui/status';
import { Text } from '@/ui/text';
import { spacing } from '@/ui/theme';
import { useTheme } from '@/ui/theme-context';

type CareView = 'appointments' | 'notes' | 'records';
const VIEWS = [
  { value: 'appointments', label: 'Visits' },
  { value: 'notes', label: 'Notes' },
  { value: 'records', label: 'Records' },
] as const;

const ADD: Record<CareView, { label: string; href: '/care/appointment' | '/care/note' | '/care/record' }> = {
  appointments: { label: 'Add appointment', href: '/care/appointment' },
  notes: { label: 'Add note', href: '/care/note' },
  records: { label: 'Add health record', href: '/care/record' },
};

export default function CareScreen() {
  const params = useLocalSearchParams<{ view?: CareView }>();
  const [view, setView] = useState<CareView>(params.view ?? 'appointments');
  return (
    <Screen
      testID="care-screen"
      title="Care"
      subtitle="Appointments, notes and medical records"
      headerRight={<IconButton testID="add-care" icon="plus" variant="filled" label={ADD[view].label} onPress={() => router.push(ADD[view].href)} />}>
      <SegmentedControl testID="care-view" options={VIEWS} value={view} onChange={setView} />
      {view === 'appointments' && <AppointmentsView />}
      {view === 'notes' && <NotesView />}
      {view === 'records' && <RecordsView />}
    </Screen>
  );
}

function AppointmentsView() {
  const now = useNow();
  const appointments = useAppData((d) => d.appointments);
  const upcoming = useMemo(
    () => appointments.filter((a) => new Date(a.startsAt) >= now).sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    [appointments, now],
  );
  const past = useMemo(
    () => appointments.filter((a) => new Date(a.startsAt) < now).sort((a, b) => b.startsAt.localeCompare(a.startsAt)),
    [appointments, now],
  );
  if (!appointments.length) {
    return (
      <EmptyState
        icon="calendar"
        title="No appointments"
        message="Track visits, who you’re seeing, where to go and what to ask."
        action={<Button label="Add appointment" size="sm" variant="soft" icon="plus" onPress={() => router.push('/care/appointment')} />}
      />
    );
  }
  return (
    <>
      <Section title="Upcoming">
        {upcoming.length ? (
          <ListGroup testID="upcoming-appts">{upcoming.map((a) => <AppointmentRow key={a.id} appointment={a} now={now} />)}</ListGroup>
        ) : (
          <Text color="textSecondary">Nothing upcoming.</Text>
        )}
      </Section>
      {past.length ? (
        <Section title="Past">
          <ListGroup>{past.map((a) => <AppointmentRow key={a.id} appointment={a} now={now} />)}</ListGroup>
        </Section>
      ) : null}
    </>
  );
}

function NotesView() {
  const now = useNow();
  const { colors } = useTheme();
  const notes = useAppData((d) => d.notes);
  const [query, setQuery] = useState('');
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes
      .filter((n) => !q || n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q) || n.tags.some((t) => t.toLowerCase().includes(q)))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [notes, query]);
  if (!notes.length) {
    return (
      <EmptyState
        icon="note"
        title="No notes yet"
        message="Jot down symptoms, questions for your doctor, or anything you want to remember."
        action={<Button label="Add note" size="sm" variant="soft" icon="plus" onPress={() => router.push('/care/note')} />}
      />
    );
  }
  return (
    <>
      <TextField testID="note-search" label="Search notes" placeholder="Title, text or tag" value={query} onChangeText={setQuery} />
      <ListGroup testID="notes-list">
        {list.map((n) => (
          <ListRow
            key={n.id}
            testID={`note-${n.id}`}
            icon="note"
            iconBackground={colors.accentSoft}
            iconColor={colors.accent}
            title={n.title}
            subtitle={`${formatRelativeDay(new Date(n.updatedAt), now)}${n.tags.length ? ` · ${n.tags.join(', ')}` : ''}\n${n.body.split('\n')[0]}`}
            onPress={() => router.push({ pathname: '/care/note', params: { id: n.id } })}
          />
        ))}
      </ListGroup>
      {!list.length ? <Text color="textSecondary">No notes match.</Text> : null}
    </>
  );
}

function RecordsView() {
  const now = useNow();
  const { colors } = useTheme();
  const records = useAppData((d) => d.records);
  const sorted = useMemo(() => [...records].sort((a, b) => b.recordedOn.localeCompare(a.recordedOn) || a.name.localeCompare(b.name)), [records]);
  if (!records.length) {
    return (
      <EmptyState
        icon="lab"
        title="No health records"
        message="Keep lab results and measurements from your visits, exactly as reported."
        action={<Button label="Add record" size="sm" variant="soft" icon="plus" onPress={() => router.push('/care/record')} />}
      />
    );
  }
  return (
    <View style={{ gap: spacing.lg }}>
      <ListGroup testID="records-list">
        {sorted.map((r) => (
          <ListRow
            key={r.id}
            testID={`record-${r.id}`}
            icon="lab"
            iconBackground={colors.primarySoft}
            title={r.name}
            subtitle={`${formatRelativeDay(fromDateKey(r.recordedOn), now)}${r.notes ? ` · ${r.notes}` : ''}`}
            detail={`${r.value} ${r.unit}`.trim()}
            onPress={() => router.push({ pathname: '/care/record', params: { id: r.id } })}
          />
        ))}
      </ListGroup>
      <SafetyNote>Records are stored as you enter them. GlycoTrack doesn’t interpret results; discuss them with your care team.</SafetyNote>
    </View>
  );
}
