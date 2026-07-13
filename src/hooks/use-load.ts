import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

/**
 * Lädt Daten beim Fokussieren des Screens (auch beim Zurücknavigieren)
 * und stellt reload() für Pull-to-Refresh bereit.
 *
 * `deps`: Werte, bei deren Änderung neu geladen werden soll (z.B. eine ID).
 * Der Loader selbst darf inline definiert sein — er wird über eine Ref
 * aufgerufen, damit sich der Effekt nicht bei jedem Render neu auslöst.
 */
export function useLoad<T>(loader: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const reload = useCallback(async () => {
    try {
      setData(await loaderRef.current());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  }, deps);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  return { data, loading, error, reload };
}
