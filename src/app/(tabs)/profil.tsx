import { ScrollView, Share, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useLoad } from '@/hooks/use-load';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { CATEGORY_LABELS, type Discipline, type DisciplineCategory } from '@/lib/types';

export default function ProfilScreen() {
  const { profile, membership, session, signOut } = useAuth();
  const userId = session?.user.id;

  const { data, reload } = useLoad(async () => {
    if (!userId) return null;
    const [disciplinesResult, ownResult] = await Promise.all([
      supabase.from('disciplines').select('*').order('sort_order'),
      supabase.from('athlete_disciplines').select('discipline_id').eq('profile_id', userId),
    ]);
    return {
      disciplines: (disciplinesResult.data ?? []) as Discipline[],
      ownIds: new Set((ownResult.data ?? []).map((row) => row.discipline_id as string)),
    };
  }, [userId]);

  async function toggleDiscipline(disciplineId: string) {
    if (!userId || !data) return;
    if (data.ownIds.has(disciplineId)) {
      await supabase
        .from('athlete_disciplines')
        .delete()
        .eq('profile_id', userId)
        .eq('discipline_id', disciplineId);
    } else {
      await supabase
        .from('athlete_disciplines')
        .insert({ profile_id: userId, discipline_id: disciplineId });
    }
    reload();
  }

  async function handleShareInvite() {
    if (!membership) return;
    await Share.share({
      message: `Tritt unserer Trainingsgruppe "${membership.group.name}" in der Leichtathletik-App bei! Einladungscode: ${membership.group.invite_code}`,
    });
  }

  const categories = [...new Set((data?.disciplines ?? []).map((d) => d.category))];

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="subtitle">{profile?.display_name}</ThemedText>
          <ThemedText themeColor="textSecondary">
            {membership?.role === 'coach' ? 'Coach' : 'Athlet:in'} · {membership?.group.name}
          </ThemedText>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold">Meine Disziplinen</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Dein Coach sieht, welche Disziplinen du machst, und kann das Training danach planen.
          </ThemedText>
          {categories.map((category) => (
            <View key={category} style={styles.categoryBlock}>
              <ThemedText type="small" themeColor="textSecondary">
                {CATEGORY_LABELS[category as DisciplineCategory]}
              </ThemedText>
              <View style={styles.chipRow}>
                {(data?.disciplines ?? [])
                  .filter((d) => d.category === category)
                  .map((discipline) => (
                    <Chip
                      key={discipline.id}
                      label={discipline.name}
                      selected={data?.ownIds.has(discipline.id) ?? false}
                      onPress={() => toggleDiscipline(discipline.id)}
                    />
                  ))}
              </View>
            </View>
          ))}
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold">Einladungscode</ThemedText>
          <ThemedText type="title" style={styles.inviteCode}>
            {membership?.group.invite_code}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Mit diesem Code treten neue Mitglieder deiner Gruppe bei.
          </ThemedText>
          <Button title="Code teilen" variant="secondary" onPress={handleShareInvite} />
        </ThemedView>

        <Button title="Abmelden" variant="secondary" onPress={signOut} />
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
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
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
  inviteCode: {
    letterSpacing: 4,
  },
});
