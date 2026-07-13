// Supabase Edge Function: erinnert per Push an bevorstehende Anmeldeschlüsse
// (3 Tage vorher und am letzten Tag). Wird täglich per Cron aufgerufen.
//
// Einrichtung (einmalig):
//   1. supabase functions deploy deadline-reminders --no-verify-jwt
//   2. supabase secrets set WEBHOOK_SECRET=<zufälliger-string>
//   3. Im Dashboard: Integrations > Cron > neuer Job, täglich um 08:00
//      (Cron-Ausdruck "0 8 * * *"), Typ "Edge Function", diese Funktion,
//      mit HTTP-Header "x-webhook-secret: <derselbe-string>".

import { createClient } from 'npm:@supabase/supabase-js@2';

const REMINDER_DAYS = [3, 1]; // so viele Tage vor dem Anmeldeschluss erinnern

const dateFormat = new Intl.DateTimeFormat('de-CH', {
  weekday: 'short',
  day: 'numeric',
  month: 'long',
  timeZone: 'Europe/Zurich',
});

function isoDateInDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  const secret = Deno.env.get('WEBHOOK_SECRET');
  if (secret && req.headers.get('x-webhook-secret') !== secret) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const targetDates = REMINDER_DAYS.map(isoDateInDays);
  const { data: competitions } = await supabase
    .from('competitions')
    .select('*')
    .in('registration_deadline', targetDates);

  if (!competitions || competitions.length === 0) {
    return new Response('no deadlines today');
  }

  let sent = 0;
  for (const competition of competitions) {
    const { data: members } = await supabase
      .from('group_members')
      .select('profile_id')
      .eq('group_id', competition.group_id);
    const memberIds = (members ?? []).map((m) => m.profile_id as string);
    if (memberIds.length === 0) continue;

    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('token')
      .in('profile_id', memberIds);
    if (!tokens || tokens.length === 0) continue;

    const isLastDay = competition.registration_deadline === isoDateInDays(1);
    const messages = tokens.map((t) => ({
      to: t.token as string,
      title: isLastDay ? '⏰ Letzter Tag: Anmeldeschluss morgen!' : '⏰ Anmeldeschluss in 3 Tagen',
      body: `${competition.name} — Wettkampf am ${dateFormat.format(new Date(competition.held_on))}`,
      sound: 'default',
    }));

    for (let i = 0; i < messages.length; i += 100) {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(messages.slice(i, i + 100)),
      });
    }
    sent += messages.length;
  }

  return new Response(`sent ${sent}`);
});
