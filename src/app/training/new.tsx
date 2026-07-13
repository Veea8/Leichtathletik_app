import * as Crypto from 'expo-crypto';
import { Stack, useRouter } from 'expo-router';

import { TrainingForm, type TrainingFormValues } from '@/components/training-form';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function NewTrainingScreen() {
  const { membership, session } = useAuth();
  const router = useRouter();

  async function handleCreate(values: TrainingFormValues) {
    if (!membership || !session) return;

    // Bei Wiederholung bekommen alle Termine dieselbe series_id
    const seriesId = values.repeatWeeks > 1 ? Crypto.randomUUID() : null;

    const rows = Array.from({ length: values.repeatWeeks }, (_, week) => {
      const startsAt = new Date(values.startsAt);
      startsAt.setDate(startsAt.getDate() + week * 7);
      return {
        group_id: membership.group.id,
        starts_at: startsAt.toISOString(),
        location: values.location,
        program: values.program || null,
        equipment_note: values.equipmentNote || null,
        series_id: seriesId,
        created_by: session.user.id,
      };
    });

    const { error } = await supabase.from('trainings').insert(rows);
    if (error) throw error;
    router.back();
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Neues Training' }} />
      <TrainingForm submitLabel="Training erstellen" showRepeat onSubmit={handleCreate} />
    </>
  );
}
