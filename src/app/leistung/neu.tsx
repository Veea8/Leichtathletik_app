import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { DateTimeField } from '@/components/ui/date-time-field';
import { TextField } from '@/components/ui/text-field';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useLoad } from '@/hooks/use-load';
import { useAuth } from '@/lib/auth';
import { parsePerformanceValue, toIsoDate } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { CATEGORY_LABELS, type Discipline, type DisciplineCategory } from '@/lib/types';

const VALUE_PLACEHOLDERS = {
  seconds: 'z.B. 11.42 oder 2:04.31',
  meters: 'z.B. 6.12',
  points: 'z.B. 5432',
} as const;

export default function NeueLeistungScreen() {
  const { disziplin } = useLocalSearchParams<{ disziplin?: string }>();
  const { session } = useAuth();
  const router = useRouter();

  const [disciplineId, setDisciplineId] = useState<string | null>(disziplin ?? null);
  const [valueText, setValueText] = useState('');
  const [performedOn, setPerformedOn] = useState(new Date());
  const [context, setContext] = useState<'training' | 'competition'>('training');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: disciplines } = useLoad(async () => {
    const { data, error: loadError } = await supabase
      .from('disciplines')
      .select('*')
      .order('sort_order');
    if (loadError) throw loadError;
    return data as Discipline[];
  }, []);

  const selectedDiscipline = disciplines?.find((d) => d.id === disciplineId) ?? null;
  const parsedValue = selectedDiscipline
    ? parsePerformanceValue(valueText, selectedDiscipline.unit)
    : null;

  // Disziplinen nach Kategorie gruppieren
  const categories = [...new Set((disciplines ?? []).map((d) => d.category))];

  async function handleSave() {
    if (!session || !selectedDiscipline || parsedValue === null) return;
    setError(null);
    setSaving(true);
    const { error: insertError } = await supabase.from('performances').insert({
      profile_id: session.user.id,
      discipline_id: selectedDiscipline.id,
      value: parsedValue,
      performed_on: toIsoDate(performedOn),
      context,
      note: note.trim() || null,
    });
    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }
    router.back();
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'Leistung eintragen' }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.section}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Disziplin
            </ThemedText>
            {categories.map((category) => (
              <View key={category} style={styles.categoryBlock}>
                <ThemedText type="small" themeColor="textSecondary">
                  {CATEGORY_LABELS[category as DisciplineCategory]}
                </ThemedText>
                <View style={styles.chipRow}>
                  {(disciplines ?? [])
                    .filter((d) => d.category === category)
                    .map((discipline) => (
                      <Chip
                        key={discipline.id}
                        label={discipline.name}
                        selected={discipline.id === disciplineId}
                        onPress={() => setDisciplineId(discipline.id)}
                      />
                    ))}
                </View>
              </View>
            ))}
          </View>

          <TextField
            label={
              selectedDiscipline
                ? `Wert (${selectedDiscipline.unit === 'seconds' ? 'Zeit' : selectedDiscipline.unit === 'meters' ? 'Meter' : 'Punkte'})`
                : 'Wert'
            }
            value={valueText}
            onChangeText={setValueText}
            keyboardType="numbers-and-punctuation"
            autoCorrect={false}
            placeholder={selectedDiscipline ? VALUE_PLACEHOLDERS[selectedDiscipline.unit] : '–'}
          />
          {valueText.length > 0 && selectedDiscipline && parsedValue === null && (
            <ThemedText type="small" themeColor="danger">
              Ungültiger Wert — Format: {VALUE_PLACEHOLDERS[selectedDiscipline.unit]}
            </ThemedText>
          )}

          <DateTimeField label="Datum" value={performedOn} onChange={setPerformedOn} mode="date" />

          <View style={styles.section}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Kontext
            </ThemedText>
            <View style={styles.chipRow}>
              <Chip
                label="Training"
                selected={context === 'training'}
                onPress={() => setContext('training')}
              />
              <Chip
                label="Wettkampf 🏆"
                selected={context === 'competition'}
                onPress={() => setContext('competition')}
              />
            </View>
          </View>

          <TextField
            label="Notiz (optional)"
            value={note}
            onChangeText={setNote}
            placeholder="z.B. Rückenwind 1.2 m/s, Testlauf"
          />

          {error ? (
            <ThemedText type="small" themeColor="danger">
              {error}
            </ThemedText>
          ) : null}

          <Button
            title="Speichern"
            onPress={handleSave}
            loading={saving}
            disabled={!selectedDiscipline || parsedValue === null}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  flex: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  section: {
    gap: Spacing.two,
  },
  categoryBlock: {
    gap: Spacing.one,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
