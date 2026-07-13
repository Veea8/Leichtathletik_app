import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { DateTimeField } from '@/components/ui/date-time-field';
import { TextField } from '@/components/ui/text-field';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface CompetitionFormValues {
  name: string;
  location: string;
  heldOn: Date;
  registrationDeadline: Date | null;
  link: string;
}

interface CompetitionFormProps {
  initial?: Partial<CompetitionFormValues>;
  submitLabel: string;
  onSubmit: (values: CompetitionFormValues) => Promise<void>;
}

function inTwoWeeks(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return date;
}

export function CompetitionForm({ initial, submitLabel, onSubmit }: CompetitionFormProps) {
  const theme = useTheme();
  const [name, setName] = useState(initial?.name ?? '');
  const [location, setLocation] = useState(initial?.location ?? '');
  const [heldOn, setHeldOn] = useState(initial?.heldOn ?? inTwoWeeks());
  const [hasDeadline, setHasDeadline] = useState(
    initial?.registrationDeadline !== null || initial === undefined
  );
  const [deadline, setDeadline] = useState(initial?.registrationDeadline ?? new Date());
  const [link, setLink] = useState(initial?.link ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    setError(null);
    setSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        location: location.trim(),
        heldOn,
        registrationDeadline: hasDeadline ? deadline : null,
        link: link.trim(),
      });
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
          <TextField
            label="Name"
            value={name}
            onChangeText={setName}
            placeholder="z.B. Regionalmeisterschaft Bern"
          />
          <TextField
            label="Ort (optional)"
            value={location}
            onChangeText={setLocation}
            placeholder="z.B. Wankdorf, Bern"
          />
          <DateTimeField label="Wettkampfdatum" value={heldOn} onChange={setHeldOn} mode="date" />

          <View style={styles.switchRow}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Anmeldeschluss
            </ThemedText>
            <Switch
              value={hasDeadline}
              onValueChange={setHasDeadline}
              trackColor={{ true: theme.tint }}
            />
          </View>
          {hasDeadline && (
            <DateTimeField label="Anmeldeschluss am" value={deadline} onChange={setDeadline} mode="date" />
          )}

          <TextField
            label="Link zur Ausschreibung (optional)"
            value={link}
            onChangeText={setLink}
            autoCapitalize="none"
            keyboardType="url"
            placeholder="https://…"
          />

          {error ? (
            <ThemedText type="small" themeColor="danger">
              {error}
            </ThemedText>
          ) : null}

          <Button title={submitLabel} onPress={handleSubmit} loading={saving} disabled={!name.trim()} />
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
