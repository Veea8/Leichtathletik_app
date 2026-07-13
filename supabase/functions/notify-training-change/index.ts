// Supabase Edge Function: schickt Push-Benachrichtigungen, wenn ein
// Training erstellt, geändert oder abgesagt wird.
//
// Einrichtung (einmalig):
//   1. supabase functions deploy notify-training-change --no-verify-jwt
//   2. supabase secrets set WEBHOOK_SECRET=<zufälliger-string>
//   3. Im Dashboard: Database > Webhooks > neuer Webhook auf die Tabelle
//      "trainings" (INSERT + UPDATE), Ziel = diese Funktion, mit
//      HTTP-Header "x-webhook-secret: <derselbe-string>".

import { createClient } from 'npm:@supabase/supabase-js@2';

interface TrainingRecord {
  id: string;
  group_id: string;
  starts_at: string;
  location: string;
  cancelled: boolean;
  series_id: string | null;
  created_by: string;
}

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  record: TrainingRecord;
  old_record: TrainingRecord | null;
}

const dateFormat = new Intl.DateTimeFormat('de-CH', {
  weekday: 'short',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Zurich',
});

Deno.serve(async (req) => {
  // Nur Anfragen mit dem richtigen Secret akzeptieren
  const secret = Deno.env.get('WEBHOOK_SECRET');
  if (secret && req.headers.get('x-webhook-secret') !== secret) {
    return new Response('Unauthorized', { status: 401 });
  }

  const payload = (await req.json()) as WebhookPayload;
  const training = payload.record;
  const old = payload.old_record;

  // Titel und Text je nach Art der Änderung
  let title: string;
  if (payload.type === 'INSERT') {
    // Bei Serien (wöchentliche Wiederholung) keine Flut von Nachrichten
    if (training.series_id !== null) {
      return new Response('skipped (series insert)');
    }
    title = 'Neues Training';
  } else if (payload.type === 'UPDATE' && old) {
    if (training.cancelled && !old.cancelled) {
      title = '❌ Training abgesagt';
    } else if (!training.cancelled && old.cancelled) {
      title = 'Training findet wieder statt';
    } else if (!training.cancelled) {
      title = 'Training geändert';
    } else {
      return new Response('skipped (edit of cancelled training)');
    }
  } else {
    return new Response('skipped');
  }

  const body = `${dateFormat.format(new Date(training.starts_at))} · ${training.location}`;

  // Tokens aller Gruppenmitglieder holen (ausser der Person, die geändert hat)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: members } = await supabase
    .from('group_members')
    .select('profile_id')
    .eq('group_id', training.group_id);

  const recipientIds = (members ?? [])
    .map((m) => m.profile_id as string)
    .filter((id) => id !== training.created_by);
  if (recipientIds.length === 0) return new Response('no recipients');

  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('token')
    .in('profile_id', recipientIds);
  if (!tokens || tokens.length === 0) return new Response('no tokens');

  // An den Expo-Push-Service schicken (max. 100 Nachrichten pro Request)
  const messages = tokens.map((t) => ({
    to: t.token as string,
    title,
    body,
    sound: 'default',
    data: { trainingId: training.id },
  }));

  for (let i = 0; i < messages.length; i += 100) {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(messages.slice(i, i + 100)),
    });
  }

  return new Response(`sent ${messages.length}`);
});
