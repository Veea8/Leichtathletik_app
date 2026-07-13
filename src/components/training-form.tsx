import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { DateTimeField } from '@/components/ui/date-time-field';
import { TextField } from '@/components/ui/text-field';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface TrainingFormValues {
  startsAt: Date;
  location: string;
  program: string;
  equipmentNote: string;
  /** Anzahl Wochen, in denen das Training wöchentlich wiederholt wird (1 = einmalig). */
  repeatWeeks: number;
}

interface TrainingFormProps {
  initial?: Partial<TrainingFormValues>;
  submitLabel: string;
  /** Wiederholung nur beim Erstellen anbieten, nicht beim Bearbeiten. */
  showRepeat?: boolean;
  onSubmit: (values: TrainingFormValues) => Promise<void>;
}

const REPEAT_OPTIONS = [1, 4, 8, 12];

/** Nächster Wochentag um 18:00 als sinnvoller Startwert. */
function defaultStartsAt(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(18, 0, 0, 0);
  return date;
}

export function TrainingForm({ initial, submitLabel, showRepeat, onSubmit }: TrainingFormProps) {
  const theme = useTheme();
  const [startsAt, setStartsAt] = useState(initial?.startsAt ?? defaultStartsAt());
  const [location, setLocation] = useState(initial?.location ?? '');
  const [program, setProgram] = useState(initial?.program ?? '');
  const [equipmentNote, setEquipmentNote] = useState(initial?.equipmentNote ?? '');
  const [repeatWeeks, setRepeatWeeks] = useState(initial?.repeatWeeks ?? 1);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    setError(null);
    setSaving(true);
    try {
      await onSubmit({ startsAt, location: location.trim(), program: program.trim(), equipmentNote: equipmentNote.trim(), repeatWeeks });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Speichern fehlgeschlagen');
      setSaving(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <DateTimeField label="Datum & Zeit" value={startsAt} onChange={setStartsAt} />

          <TextField
            label="Ort"
            value={location}
            onChangeText={setLocation}
            placeholder="z.B. Stadion Schützenmatte"
          />
          <TextField
            label="Programm (optional)"
            value={program}
            onChangeText={setProgram}
            placeholder="z.B. Sprint-Technik + Starts aus dem Block"
            multiline
            numberOfLines={3}
            style={styles.multiline}
          />
          <TextField
            label="Material (optional)"
            value={equipmentNote}
            onChangeText={setEquipmentNote}
            placeholder="z.B. Spikes mitnehmen"
          />

          {showRepeat && (
            <View style={styles.repeatSection}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Wöchentlich wiederholen
              </ThemedText>
              <View style={styles.repeatRow}>
                {REPEAT_OPTIONS.map((weeks) => {
                  const selected = repeatWeeks === weeks;
                  return (
                    <Pressable
                      key={weeks}
                      onPress={() => setRepeatWeeks(weeks)}
                      style={[
                        styles.repeatChip,
                        { backgroundColor: selected ? theme.tint : theme.backgroundElement },
                      ]}>
                      <ThemedText type="small" style={{ color: selected ? theme.onTint : theme.text }}>
                        {weeks === 1 ? 'Einmalig' : `${weeks} Wochen`}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {error ? (
            <ThemedText type="small" themeColor="danger">
              {error}
            </ThemedText>
          ) : null}

          <Button title={submitLabel} onPress={handleSubmit} loading={saving} disabled={!location.trim()} />
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
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  repeatSection: {
    gap: Spacing.one,
  },
  repeatRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  repeatChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
});
