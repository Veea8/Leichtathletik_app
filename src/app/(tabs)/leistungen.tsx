import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { PerformanceChart } from '@/components/performance-chart';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useLoad } from '@/hooks/use-load';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { formatPerformanceValue, formatShortDate } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Discipline, Performance } from '@/lib/types';

interface MemberOption {
  profile_id: string;
  profile: { display_name: string };
}

export default function LeistungenScreen() {
  const { membership, session } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const isCoach = membership?.role === 'coach';
  const ownId = session?.user.id;

  // Coach kann die Logs der Athlet:innen ansehen, alle anderen nur das eigene
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);
  const athleteId = selectedAthleteId ?? ownId;
  const isOwnLog = athleteId === ownId;

  const [selectedDisciplineId, setSelectedDisciplineId] = useState<string | null>(null);

  const { data, loading, reload } = useLoad(async () => {
    if (!athleteId || !membership) return null;

    const [disciplinesResult, performancesResult, membersResult] = await Promise.all([
      supabase.from('disciplines').select('*').order('sort_order'),
      supabase
        .from('performances')
        .select('*')
        .eq('profile_id', athleteId)
        .order('performed_on'),
      isCoach
        ? supabase
            .from('group_members')
            .select('profile_id, profile:profiles(display_name)')
            .eq('group_id', membership.group.id)
        : Promise.resolve({ data: null }),
    ]);

    return {
      disciplines: (disciplinesResult.data ?? []) as Discipline[],
      performances: (performancesResult.data ?? []) as Performance[],
      members: (membersResult.data ?? []) as unknown as MemberOption[] | null,
    };
  }, [athleteId, membership?.group.id]);

  if (!data) {
    return <ThemedView style={styles.container} />;
  }

  const { disciplines, performances, members } = data;
  const disciplineById = new Map(disciplines.map((d) => [d.id, d]));

  // Nur Disziplinen anzeigen, in denen es Einträge gibt
  const usedDisciplineIds = [...new Set(performances.map((p) => p.discipline_id))];
  const usedDisciplines = disciplines.filter((d) => usedDisciplineIds.includes(d.id));

  const activeDisciplineId =
    selectedDisciplineId && usedDisciplineIds.includes(selectedDisciplineId)
      ? selectedDisciplineId
      : usedDisciplines[0]?.id ?? null;
  const activeDiscipline = activeDisciplineId ? disciplineById.get(activeDisciplineId) : null;

  const entries = performances.filter((p) => p.discipline_id === activeDisciplineId);
  const currentYear = new Date().getFullYear();
  const seasonEntries = entries.filter(
    (p) => new Date(p.performed_on).getFullYear() === currentYear
  );

  function best(list: Performance[]): Performance | null {
    if (list.length === 0 || !activeDiscipline) return null;
    return list.reduce((bestSoFar, entry) => {
      const isBetter = activeDiscipline.lower_is_better
        ? entry.value < bestSoFar.value
        : entry.value > bestSoFar.value;
      return isBetter ? entry : bestSoFar;
    });
  }
  const personalBest = best(entries);
  const seasonBest = best(seasonEntries);

  function confirmDelete(performance: Performance) {
    Alert.alert('Eintrag löschen?', '', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('performances').delete().eq('id', performance.id);
          reload();
        },
      },
    ]);
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {isCoach && members && members.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {members.map((member) => (
                <Chip
                  key={member.profile_id}
                  label={member.profile_id === ownId ? 'Ich' : member.profile.display_name}
                  selected={member.profile_id === athleteId}
                  onPress={() => setSelectedAthleteId(member.profile_id)}
                />
              ))}
            </View>
          </ScrollView>
        )}

        {usedDisciplines.length === 0 ? (
          <View style={styles.emptyState}>
            <ThemedText themeColor="textSecondary" style={styles.emptyText}>
              {isOwnLog
                ? 'Noch keine Leistungen erfasst. Trage deine erste Zeit, Weite oder Höhe ein!'
                : 'Noch keine Leistungen erfasst.'}
            </ThemedText>
          </View>
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                {usedDisciplines.map((discipline) => (
                  <Chip
                    key={discipline.id}
                    label={discipline.name}
                    selected={discipline.id === activeDisciplineId}
                    onPress={() => setSelectedDisciplineId(discipline.id)}
                  />
                ))}
              </View>
            </ScrollView>

            {activeDiscipline && (
              <>
                <View style={styles.bestRow}>
                  <ThemedView type="backgroundElement" style={styles.bestCard}>
                    <ThemedText type="small" themeColor="textSecondary">
                      Bestleistung
                    </ThemedText>
                    <ThemedText type="subtitle" themeColor="tint">
                      {personalBest
                        ? formatPerformanceValue(personalBest.value, activeDiscipline.unit)
                        : '–'}
                    </ThemedText>
                    {personalBest && (
                      <ThemedText type="small" themeColor="textSecondary">
                        {formatShortDate(personalBest.performed_on)}
                      </ThemedText>
                    )}
                  </ThemedView>
                  <ThemedView type="backgroundElement" style={styles.bestCard}>
                    <ThemedText type="small" themeColor="textSecondary">
                      Saisonbest {currentYear}
                    </ThemedText>
                    <ThemedText type="subtitle">
                      {seasonBest
                        ? formatPerformanceValue(seasonBest.value, activeDiscipline.unit)
                        : '–'}
                    </ThemedText>
                    {seasonBest && (
                      <ThemedText type="small" themeColor="textSecondary">
                        {formatShortDate(seasonBest.performed_on)}
                      </ThemedText>
                    )}
                  </ThemedView>
                </View>

                <ThemedView type="backgroundElement" style={styles.chartCard}>
                  <PerformanceChart
                    performances={entries}
                    unit={activeDiscipline.unit}
                    lowerIsBetter={activeDiscipline.lower_is_better}
                  />
                </ThemedView>

                <ThemedView type="backgroundElement" style={styles.entriesCard}>
                  {[...entries].reverse().map((entry) => (
                    <View key={entry.id} style={styles.entryRow}>
                      <View style={styles.entryInfo}>
                        <ThemedText type="smallBold">
                          {formatPerformanceValue(entry.value, activeDiscipline.unit)}
                          {entry.context === 'competition' ? '  🏆' : ''}
                        </ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {formatShortDate(entry.performed_on)}
                          {entry.note ? ` · ${entry.note}` : ''}
                        </ThemedText>
                      </View>
                      {isOwnLog && (
                        <Pressable hitSlop={8} onPress={() => confirmDelete(entry)}>
                          <Ionicons name="trash-outline" size={18} color={theme.textSecondary} />
                        </Pressable>
                      )}
                    </View>
                  ))}
                </ThemedView>
              </>
            )}
          </>
        )}

        {isOwnLog && (
          <Button
            title="Leistung eintragen"
            onPress={() =>
              router.push(
                activeDisciplineId
                  ? `/leistung/neu?disziplin=${activeDisciplineId}`
                  : '/leistung/neu'
              )
            }
          />
        )}
      </ScrollView>
    </ThemedView>
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
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  emptyState: {
    paddingVertical: Spacing.six,
  },
  emptyText: {
    textAlign: 'center',
  },
  bestRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  bestCard: {
    flex: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  chartCard: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  entriesCard: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  entryInfo: {
    gap: 0,
  },
});
