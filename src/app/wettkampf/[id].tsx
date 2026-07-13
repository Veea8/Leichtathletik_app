import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { CompetitionForm, type CompetitionFormValues } from '@/components/competition-form';
import { ThemedView } from '@/components/themed-view';
import { useLoad } from '@/hooks/use-load';
import { parseDateOnly, toIsoDate } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Competition } from '@/lib/types';

export default function WettkampfBearbeitenScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: competition } = useLoad(async () => {
    const { data, error } = await supabase.from('competitions').select('*').eq('id', id).single();
    if (error) throw error;
    return data as Competition;
  }, [id]);

  async function handleUpdate(values: CompetitionFormValues) {
    const { error } = await supabase
      .from('competitions')
      .update({
        name: values.name,
        location: values.location || null,
        held_on: toIsoDate(values.heldOn),
        registration_deadline: values.registrationDeadline
          ? toIsoDate(values.registrationDeadline)
          : null,
        link: values.link || null,
      })
      .eq('id', id);
    if (error) throw error;
    router.back();
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Wettkampf bearbeiten' }} />
      {competition ? (
        <CompetitionForm
          submitLabel="Speichern"
          initial={{
            name: competition.name,
            location: competition.location ?? '',
            heldOn: parseDateOnly(competition.held_on),
            registrationDeadline: competition.registration_deadline
              ? parseDateOnly(competition.registration_deadline)
              : null,
            link: competition.link ?? '',
          }}
          onSubmit={handleUpdate}
        />
      ) : (
        <ThemedView style={{ flex: 1 }} />
      )}
    </>
  );
}
