import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { ThemedView } from '@/components/themed-view';
import { TrainingForm, type TrainingFormValues } from '@/components/training-form';
import { useLoad } from '@/hooks/use-load';
import { supabase } from '@/lib/supabase';
import type { Training } from '@/lib/types';

export default function EditTrainingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: training } = useLoad(async () => {
    const { data, error } = await supabase.from('trainings').select('*').eq('id', id).single();
    if (error) throw error;
    return data as Training;
  }, [id]);

  async function handleUpdate(values: TrainingFormValues) {
    const { error } = await supabase
      .from('trainings')
      .update({
        starts_at: values.startsAt.toISOString(),
        location: values.location,
        program: values.program || null,
        equipment_note: values.equipmentNote || null,
      })
      .eq('id', id);
    if (error) throw error;
    router.back();
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Training bearbeiten' }} />
      {training ? (
        <TrainingForm
          submitLabel="Speichern"
          initial={{
            startsAt: new Date(training.starts_at),
            location: training.location,
            program: training.program ?? '',
            equipmentNote: training.equipment_note ?? '',
          }}
          onSubmit={handleUpdate}
        />
      ) : (
        <ThemedView style={{ flex: 1 }} />
      )}
    </>
  );
}
