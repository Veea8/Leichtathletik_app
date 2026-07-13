import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

export default function SignUpScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    setError(null);
    setInfo(null);
    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        // Landet via Datenbank-Trigger als display_name im Profil
        data: { display_name: name.trim() },
      },
    });
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    // Wenn E-Mail-Bestätigung aktiviert ist, gibt es noch keine Session.
    if (!data.session) {
      setInfo('Fast geschafft! Bestätige deine E-Mail-Adresse über den Link, den wir dir geschickt haben.');
    }
    // Bei Erfolg übernimmt der AuthProvider die Navigation.
  }

  const canSubmit = name.trim().length >= 2 && email.trim().length > 3 && password.length >= 8;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.form}>
          <ThemedText type="subtitle">Registrieren</ThemedText>

          <TextField
            label="Name"
            value={name}
            onChangeText={setName}
            autoComplete="name"
            placeholder="Vorname Nachname"
          />
          <TextField
            label="E-Mail"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="du@beispiel.ch"
          />
          <TextField
            label="Passwort (mind. 8 Zeichen)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            placeholder="••••••••"
          />

          {error ? (
            <ThemedText type="small" themeColor="danger">
              {error}
            </ThemedText>
          ) : null}
          {info ? (
            <ThemedText type="small" themeColor="textSecondary">
              {info}
            </ThemedText>
          ) : null}

          <Button title="Konto erstellen" onPress={handleSignUp} loading={loading} disabled={!canSubmit} />

          <Link href="/sign-in" style={styles.link}>
            <ThemedText type="link" themeColor="textSecondary">
              Schon ein Konto? <ThemedText type="linkPrimary">Anmelden</ThemedText>
            </ThemedText>
          </Link>
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
    paddingHorizontal: Spacing.four,
    justifyContent: 'center',
  },
  form: {
    gap: Spacing.three,
  },
  link: {
    alignSelf: 'center',
  },
});
