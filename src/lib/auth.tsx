import type { Session } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';

import { supabase } from '@/lib/supabase';
import type { Membership, Profile } from '@/lib/types';

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  /** Gruppenmitgliedschaft inkl. Rolle — null, solange der User keiner Gruppe angehört. */
  membership: Membership | null;
  /** true, bis Session UND Profildaten initial geladen sind. */
  initializing: boolean;
  /** Profil + Mitgliedschaft neu laden (z.B. nach Gruppenbeitritt). */
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth muss innerhalb von <AuthProvider> verwendet werden');
  }
  return context;
}

async function loadUserData(userId: string) {
  const [profileResult, membershipResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase
      .from('group_members')
      .select('role, group:groups(*)')
      .eq('profile_id', userId)
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    profile: (profileResult.data as Profile | null) ?? null,
    membership: (membershipResult.data as unknown as Membership | null) ?? null,
  };
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [initializing, setInitializing] = useState(true);

  const userId = session?.user.id ?? null;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // Profildaten laden, sobald sich der eingeloggte User ändert.
  // (Abhängig von userId statt session, damit Token-Refreshes kein Neuladen auslösen.)
  useEffect(() => {
    let cancelled = false;

    if (!userId) {
      setProfile(null);
      setMembership(null);
      // Erst nach dem initialen getSession() als "fertig" markieren
      supabase.auth.getSession().then(() => {
        if (!cancelled) setInitializing(false);
      });
      return;
    }

    loadUserData(userId).then((data) => {
      if (cancelled) return;
      setProfile(data.profile);
      setMembership(data.membership);
      setInitializing(false);
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const data = await loadUserData(userId);
    setProfile(data.profile);
    setMembership(data.membership);
  }, [userId]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ session, profile, membership, initializing, refresh, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
