import { Ionicons } from '@expo/vector-icons';
import { Link, Tabs } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { registerPushToken } from '@/lib/notifications';

/** Header-Button, mit dem der Coach ein neues Training bzw. einen Wettkampf erstellt. */
function AddButton({ href }: { href: '/training/new' | '/wettkampf/neu' }) {
  const theme = useTheme();
  return (
    <Link href={href} asChild>
      <Pressable hitSlop={8} style={styles.headerButton}>
        <Ionicons name="add" size={28} color={theme.tint} />
      </Pressable>
    </Link>
  );
}

export default function TabsLayout() {
  const theme = useTheme();
  const { membership, session } = useAuth();
  const isCoach = membership?.role === 'coach';
  const userId = session?.user.id;

  // Sobald jemand eingeloggt in der App ist: Push-Token registrieren
  useEffect(() => {
    if (userId) {
      registerPushToken(userId);
    }
  }, [userId]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.tint,
        tabBarInactiveTintColor: theme.textSecondary,
        headerShown: true,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Training',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" color={color} size={size} />,
          headerRight: isCoach ? () => <AddButton href="/training/new" /> : undefined,
        }}
      />
      <Tabs.Screen
        name="leistungen"
        options={{
          title: 'Leistungen',
          tabBarIcon: ({ color, size }) => <Ionicons name="trending-up" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="wettkaempfe"
        options={{
          title: 'Wettkämpfe',
          tabBarIcon: ({ color, size }) => <Ionicons name="trophy" color={color} size={size} />,
          headerRight: isCoach ? () => <AddButton href="/wettkampf/neu" /> : undefined,
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    paddingHorizontal: 16,
  },
});
