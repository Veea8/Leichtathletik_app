import { Stack, useRouter } from 'expo-router';

import { CompetitionForm, type CompetitionFormValues } from '@/components/competition-form';
import { useAuth } from '@/lib/auth';
import { toIsoDate } from '@/lib/format';
import { supabase } from '@/lib/supabase';

export default function NeuerWettkampfScreen() {
  const { membership, session } = useAuth();
  const router = useRouter();

  async function handleCreate(values: CompetitionFormValues) {
    if (!membership || !session) return;
    const { error } = await supabase.from('competitions').insert({
      group_id: membership.group.id,
      name: values.name,
      location: values.location || null,
      held_on: toIsoDate(values.heldOn),
      registration_deadline: values.registrationDeadline
        ? toIsoDate(values.registrationDeadline)
        : null,
      link: values.link || null,
      created_by: session.user.id,
    });
    if (error) throw error;
    router.back();
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Neuer Wettkampf' }} />
      <CompetitionForm submitLabel="Wettkampf erstellen" onSubmit={handleCreate} />
    </>
  );
}
