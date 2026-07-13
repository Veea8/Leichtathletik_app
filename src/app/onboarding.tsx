import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function OnboardingScreen() {
  const { profile, refresh, signOut } = useAuth();
  const [inviteCode, setInviteCode] = useState('');
  const [groupName, setGroupName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [creating, setCreating] = useState(false);

  async function handleJoin() {
    setError(null);
    setJoining(true);
    const { error: rpcError } = await supabase.rpc('join_group', { code: inviteCode });
    if (rpcError) {
      setJoining(false);
      setError(
        rpcError.message.includes('Ungültiger')
          ? 'Dieser Einladungscode existiert nicht. Prüfe die Schreibweise.'
          : rpcError.message
      );
      return;
    }
    await refresh(); // Navigation übernimmt der RootNavigator
  }

  async function handleCreate() {
    setError(null);
    setCreating(true);
    const { error: rpcError } = await supabase.rpc('create_group', { group_name: groupName.trim() });
    if (rpcError) {
      setCreating(false);
      setError(rpcError.message);
      return;
    }
    await refresh();
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <ThemedText type="subtitle">Hallo {profile?.display_name ?? ''} 👋</ThemedText>
            <ThemedText themeColor="textSecondary">
              Tritt deiner Trainingsgruppe bei — oder erstelle als Coach eine neue.
            </ThemedText>

            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="smallBold">Ich bin Athlet:in</ThemedText>
              <TextField
                label="Einladungscode von deinem Coach"
                value={inviteCode}
                onChangeText={(text) => setInviteCode(text.toUpperCase())}
                autoCapitalize="characters"
                autoCorrect={false}
                placeholder="z.B. K7M2XA"
                maxLength={6}
              />
              <Button
                title="Gruppe beitreten"
                onPress={handleJoin}
                loading={joining}
                disabled={inviteCode.trim().length !== 6 || creating}
              />
            </ThemedView>

            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="smallBold">Ich bin Coach</ThemedText>
              <TextField
                label="Name der Trainingsgruppe"
                value={groupName}
                onChangeText={setGroupName}
                placeholder="z.B. U18/U20 Sprint"
              />
              <Button
                title="Gruppe erstellen"
                variant="secondary"
                onPress={handleCreate}
                loading={creating}
                disabled={groupName.trim().length < 2 || joining}
              />
            </ThemedView>

            {error ? (
              <ThemedText type="small" themeColor="danger">
                {error}
              </ThemedText>
            ) : null}

            <Button title="Abmelden" variant="secondary" onPress={signOut} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
    justifyContent: 'center',
    flexGrow: 1,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.three,
  },
});
