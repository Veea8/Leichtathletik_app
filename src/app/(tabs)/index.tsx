import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useLoad } from '@/hooks/use-load';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { SignupStatus, Training } from '@/lib/types';

interface TrainingWithOwnStatus extends Training {
  ownStatus: SignupStatus | null;
}

export default function TrainingScreen() {
  const { membership, session } = useAuth();
  const theme = useTheme();
  const groupId = membership?.group.id;
  const userId = session?.user.id;

  const { data: trainings, loading, reload } = useLoad(async () => {
    if (!groupId || !userId) return [];

    // Kommende Trainings (inkl. der letzten 2 Stunden, damit ein laufendes
    // Training noch sichtbar ist)
    const since = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data: trainingRows, error } = await supabase
      .from('trainings')
      .select('*')
      .eq('group_id', groupId)
      .gte('starts_at', since)
      .order('starts_at');
    if (error) throw error;

    const rows = (trainingRows ?? []) as Training[];
    if (rows.length === 0) return [];

    const { data: signupRows } = await supabase
      .from('signups')
      .select('training_id, status')
      .eq('profile_id', userId)
      .in('training_id', rows.map((t) => t.id));

    const statusByTraining = new Map(
      (signupRows ?? []).map((s) => [s.training_id as string, s.status as SignupStatus])
    );
    return rows.map((t) => ({ ...t, ownStatus: statusByTraining.get(t.id) ?? null }));
  }, [groupId, userId]);

  async function setStatus(trainingId: string, status: SignupStatus) {
    if (!userId) return;
    await supabase.from('signups').upsert({
      training_id: trainingId,
      profile_id: userId,
      status,
      updated_at: new Date().toISOString(),
    });
    reload();
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={trainings ?? []}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}
        ListEmptyComponent={
          loading ? null : (
            <ThemedText themeColor="textSecondary" style={styles.empty}>
              Keine kommenden Trainings.
              {membership?.role === 'coach' ? ' Erstelle das erste über das + oben rechts.' : ''}
            </ThemedText>
          )
        }
        renderItem={({ item }) => (
          <TrainingCard training={item} onSetStatus={setStatus} tint={theme.tint} />
        )}
      />
    </ThemedView>
  );
}

function TrainingCard({
  training,
  onSetStatus,
  tint,
}: {
  training: TrainingWithOwnStatus;
  onSetStatus: (id: string, status: SignupStatus) => void;
  tint: string;
}) {
  const theme = useTheme();
  const isIn = training.ownStatus === 'in';
  const isOut = training.ownStatus === 'out';

  return (
    <Link href={`/training/${training.id}`} asChild>
      <Pressable>
        <ThemedView type="backgroundElement" style={styles.card}>
          <View style={styles.cardHeader}>
            <ThemedText type="smallBold" style={training.cancelled && styles.strikethrough}>
              {formatDateTime(training.starts_at)}
            </ThemedText>
            {training.cancelled && (
              <ThemedText type="smallBold" themeColor="danger">
                Abgesagt
              </ThemedText>
            )}
          </View>
          <ThemedText themeColor="textSecondary" type="small">
            📍 {training.location}
          </ThemedText>
          {training.program ? (
            <ThemedText type="small" numberOfLines={2}>
              {training.program}
            </ThemedText>
          ) : null}
          {training.equipment_note ? (
            <ThemedText type="small" themeColor="tint">
              🎒 {training.equipment_note}
            </ThemedText>
          ) : null}

          {!training.cancelled && (
            <View style={styles.statusRow}>
              <Pressable
                onPress={() => onSetStatus(training.id, 'in')}
                style={[
                  styles.statusButton,
                  { backgroundColor: isIn ? tint : theme.backgroundSelected },
                ]}>
                <Ionicons name="checkmark" size={16} color={isIn ? theme.onTint : theme.text} />
                <ThemedText type="small" style={{ color: isIn ? theme.onTint : theme.text }}>
                  Dabei
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => onSetStatus(training.id, 'out')}
                style={[
                  styles.statusButton,
                  { backgroundColor: isOut ? theme.text : theme.backgroundSelected },
                ]}>
                <Ionicons name="close" size={16} color={isOut ? theme.background : theme.text} />
                <ThemedText type="small" style={{ color: isOut ? theme.background : theme.text }}>
                  Abgemeldet
                </ThemedText>
              </Pressable>
            </View>
          )}
        </ThemedView>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  list: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  listContent: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  empty: {
    textAlign: 'center',
    marginTop: Spacing.six,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  strikethrough: {
    textDecorationLine: 'line-through',
  },
  statusRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
});
