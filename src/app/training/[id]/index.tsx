import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useLoad } from '@/hooks/use-load';
import { useAuth } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { GroupRole, Signup, SignupStatus, Training } from '@/lib/types';

interface MemberRow {
  profile_id: string;
  role: GroupRole;
  profile: { display_name: string };
}

export default function TrainingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { membership, session } = useAuth();
  const router = useRouter();
  const isCoach = membership?.role === 'coach';
  const userId = session?.user.id;
  const [note, setNote] = useState<string | null>(null);

  const { data, loading, reload } = useLoad(async () => {
    if (!membership) return null;
    const [trainingResult, membersResult, signupsResult] = await Promise.all([
      supabase.from('trainings').select('*').eq('id', id).single(),
      supabase
        .from('group_members')
        .select('profile_id, role, profile:profiles(display_name)')
        .eq('group_id', membership.group.id),
      supabase.from('signups').select('*').eq('training_id', id),
    ]);
    if (trainingResult.error) throw trainingResult.error;

    return {
      training: trainingResult.data as Training,
      members: (membersResult.data ?? []) as unknown as MemberRow[],
      signups: (signupsResult.data ?? []) as Signup[],
    };
  }, [id, membership?.group.id]);

  if (loading || !data) {
    return <ThemedView style={styles.container} />;
  }

  const { training, members, signups } = data;
  const signupByProfile = new Map(signups.map((s) => [s.profile_id, s]));
  const ownSignup = userId ? signupByProfile.get(userId) : undefined;
  const displayedNote = note ?? ownSignup?.note ?? '';

  const attending = members.filter((m) => signupByProfile.get(m.profile_id)?.status === 'in');
  const declined = members.filter((m) => signupByProfile.get(m.profile_id)?.status === 'out');
  const noAnswer = members.filter((m) => !signupByProfile.has(m.profile_id));

  async function setOwnStatus(status: SignupStatus) {
    if (!userId) return;
    await supabase.from('signups').upsert({
      training_id: id,
      profile_id: userId,
      status,
      note: displayedNote.trim() || null,
      updated_at: new Date().toISOString(),
    });
    reload();
  }

  async function saveNote() {
    if (!userId || !ownSignup) return;
    await supabase
      .from('signups')
      .update({ note: displayedNote.trim() || null, updated_at: new Date().toISOString() })
      .eq('training_id', id)
      .eq('profile_id', userId);
    reload();
  }

  async function toggleCancelled() {
    await supabase.from('trainings').update({ cancelled: !training.cancelled }).eq('id', id);
    reload();
  }

  function confirmDelete() {
    Alert.alert('Training löschen?', 'Das Training und alle An-/Abmeldungen werden gelöscht.', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('trainings').delete().eq('id', id);
          router.back();
        },
      },
    ]);
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'Training' }} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <ThemedView type="backgroundElement" style={styles.card}>
          <View style={styles.headerRow}>
            <ThemedText type="smallBold">{formatDateTime(training.starts_at)}</ThemedText>
            {training.cancelled && (
              <ThemedText type="smallBold" themeColor="danger">
                Abgesagt
              </ThemedText>
            )}
          </View>
          <ThemedText themeColor="textSecondary">📍 {training.location}</ThemedText>
          {training.program ? <ThemedText>{training.program}</ThemedText> : null}
          {training.equipment_note ? (
            <ThemedText themeColor="tint">🎒 {training.equipment_note}</ThemedText>
          ) : null}
        </ThemedView>

        {!training.cancelled && (
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">Deine Anmeldung</ThemedText>
            <View style={styles.buttonRow}>
              <View style={styles.flex}>
                <Button
                  title="Dabei"
                  variant={ownSignup?.status === 'in' ? 'primary' : 'secondary'}
                  onPress={() => setOwnStatus('in')}
                />
              </View>
              <View style={styles.flex}>
                <Button
                  title="Abmelden"
                  variant={ownSignup?.status === 'out' ? 'primary' : 'secondary'}
                  onPress={() => setOwnStatus('out')}
                />
              </View>
            </View>
            <TextField
              label="Notiz (optional)"
              value={displayedNote}
              onChangeText={setNote}
              onEndEditing={saveNote}
              placeholder="z.B. komme 15 Min später"
            />
          </ThemedView>
        )}

        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold">Wer kommt? </ThemedText>
          <AttendanceSection title={`Dabei (${attending.length})`} members={attending} signups={signupByProfile} />
          <AttendanceSection title={`Abgemeldet (${declined.length})`} members={declined} signups={signupByProfile} />
          <AttendanceSection title={`Keine Antwort (${noAnswer.length})`} members={noAnswer} signups={signupByProfile} />
        </ThemedView>

        {isCoach && (
          <View style={styles.coachActions}>
            <Button
              title="Bearbeiten"
              variant="secondary"
              onPress={() => router.push(`/training/${id}/edit`)}
            />
            <Button
              title={training.cancelled ? 'Training wieder aktivieren' : 'Training absagen'}
              variant="secondary"
              onPress={toggleCancelled}
            />
            <Button title="Löschen" variant="secondary" onPress={confirmDelete} />
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

function AttendanceSection({
  title,
  members,
  signups,
}: {
  title: string;
  members: MemberRow[];
  signups: Map<string, Signup>;
}) {
  return (
    <View style={styles.attendanceSection}>
      <ThemedText type="small" themeColor="textSecondary">
        {title}
      </ThemedText>
      {members.map((member) => {
        const note = signups.get(member.profile_id)?.note;
        return (
          <ThemedText key={member.profile_id} type="small">
            {member.profile.display_name}
            {note ? <ThemedText type="small" themeColor="textSecondary"> — {note}</ThemedText> : null}
          </ThemedText>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
  attendanceSection: {
    gap: Spacing.one,
    marginTop: Spacing.one,
  },
  coachActions: {
    gap: Spacing.two,
  },
});
