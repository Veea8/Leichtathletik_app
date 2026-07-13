import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, FlatList, Linking, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useLoad } from '@/hooks/use-load';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { daysUntil, formatDate, formatShortDate } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Competition } from '@/lib/types';

export default function WettkaempfeScreen() {
  const { membership } = useAuth();
  const isCoach = membership?.role === 'coach';
  const groupId = membership?.group.id;

  const { data: competitions, loading, reload } = useLoad(async () => {
    if (!groupId) return [];
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('competitions')
      .select('*')
      .eq('group_id', groupId)
      .gte('held_on', today)
      .order('held_on');
    if (error) throw error;
    return data as Competition[];
  }, [groupId]);

  return (
    <ThemedView style={styles.container}>
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={competitions ?? []}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}
        ListEmptyComponent={
          loading ? null : (
            <ThemedText themeColor="textSecondary" style={styles.empty}>
              Keine kommenden Wettkämpfe.
              {isCoach ? ' Erfasse den ersten über das + oben rechts.' : ''}
            </ThemedText>
          )
        }
        renderItem={({ item }) => (
          <CompetitionCard competition={item} isCoach={isCoach} onChanged={reload} />
        )}
      />
    </ThemedView>
  );
}

function CompetitionCard({
  competition,
  isCoach,
  onChanged,
}: {
  competition: Competition;
  isCoach: boolean;
  onChanged: () => void;
}) {
  const theme = useTheme();
  const router = useRouter();

  function confirmDelete() {
    Alert.alert('Wettkampf löschen?', competition.name, [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('competitions').delete().eq('id', competition.id);
          onChanged();
        },
      },
    ]);
  }

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.cardHeader}>
        <ThemedText type="smallBold" style={styles.cardTitle}>
          {competition.name}
        </ThemedText>
        {isCoach && (
          <View style={styles.coachIcons}>
            <Pressable hitSlop={8} onPress={() => router.push(`/wettkampf/${competition.id}`)}>
              <Ionicons name="pencil" size={18} color={theme.textSecondary} />
            </Pressable>
            <Pressable hitSlop={8} onPress={confirmDelete}>
              <Ionicons name="trash-outline" size={18} color={theme.textSecondary} />
            </Pressable>
          </View>
        )}
      </View>

      <ThemedText type="small" themeColor="textSecondary">
        📅 {formatDate(competition.held_on)}
        {competition.location ? `  ·  📍 ${competition.location}` : ''}
      </ThemedText>

      <DeadlineBadge deadline={competition.registration_deadline} />

      {competition.link ? (
        <Pressable onPress={() => Linking.openURL(competition.link!)}>
          <ThemedText type="linkPrimary">Ausschreibung öffnen ↗</ThemedText>
        </Pressable>
      ) : null}
    </ThemedView>
  );
}

function DeadlineBadge({ deadline }: { deadline: string | null }) {
  if (!deadline) return null;

  const days = daysUntil(deadline);
  if (days < 0) {
    return (
      <ThemedText type="small" themeColor="textSecondary">
        Anmeldeschluss vorbei ({formatShortDate(deadline)})
      </ThemedText>
    );
  }

  const urgent = days <= 3;
  const label =
    days === 0 ? 'HEUTE' : days === 1 ? 'morgen' : `in ${days} Tagen`;
  return (
    <ThemedText type={urgent ? 'smallBold' : 'small'} themeColor={urgent ? 'danger' : 'text'}>
      ⏰ Anmeldeschluss: {label} ({formatShortDate(deadline)})
    </ThemedText>
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
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  cardTitle: {
    flex: 1,
  },
  coachIcons: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
});
