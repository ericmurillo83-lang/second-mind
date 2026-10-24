import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { useAppData, useStore } from '@/data/store-context';
import { confirmAsync } from '@/services/dialogs';
import { Button } from '@/ui/button';
import { TextField } from '@/ui/fields';
import { FormScreen } from '@/ui/layout';
import { Badge } from '@/ui/status';

export default function EditNoteScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const store = useStore();
  const existing = useAppData((d) => d.notes.find((n) => n.id === id));
  const [title, setTitle] = useState(existing?.title ?? '');
  const [body, setBody] = useState(existing?.body ?? '');
  const [tags, setTags] = useState(existing?.tags.join(', ') ?? '');
  const [submitted, setSubmitted] = useState(false);

  const save = () => {
    setSubmitted(true);
    if (!title.trim() && !body.trim()) return;
    store.upsert('notes', {
      id: existing?.id,
      demo: existing?.demo,
      title: title.trim() || body.trim().split('\n')[0].slice(0, 60),
      body: body.trim(),
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    });
    router.back();
  };

  const remove = async () => {
    if (!existing) return;
    if (await confirmAsync({ title: 'Delete this note?', message: 'This permanently removes it.', confirmLabel: 'Delete', destructive: true })) {
      store.remove('notes', existing.id);
      router.back();
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: existing ? 'Edit note' : 'New note' }} />
      <FormScreen
        footer={
          <>
            {existing ? <Button label="Delete" variant="destructive" icon="trash" onPress={remove} testID="delete-note" /> : null}
            <Button label="Save note" onPress={save} style={{ flex: 1 }} testID="save-note" />
          </>
        }>
        {existing?.demo ? <Badge label="Fictional sample note" tone="demo" icon="sparkles" /> : null}
        <TextField testID="note-title" label="Title" value={title} onChangeText={setTitle} maxLength={120} error={submitted && !title.trim() && !body.trim() ? 'Write a title or some text.' : undefined} />
        <TextField testID="note-body" label="Note" value={body} onChangeText={setBody} multiline maxLength={5000} autoFocus={!existing} />
        <TextField label="Tags" hint="Comma separated, e.g. Appointment prep, Symptoms" value={tags} onChangeText={setTags} autoCapitalize="words" />
      </FormScreen>
    </>
  );
}
