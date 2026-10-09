// Suppression automatique (durées de conservation proposées au bureau : coordonnées 3 mois, médias 2 ans).
// À déclencher une fois par jour (pg_cron + pg_net, ou planificateur externe) avec l'en-tête
// `x-cron-secret: <CRON_SECRET>`. `?dry=1` ne supprime rien et renvoie seulement ce qui serait supprimé.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CONTACT_MONTHS = 3
const MEDIA_MONTHS = 24

const monthsAgo = (n: number) => {
  const d = new Date()
  d.setMonth(d.getMonth() - n)
  return d.toISOString()
}

Deno.serve(async (req) => {
  const secret = Deno.env.get('CRON_SECRET')
  if (!secret || req.headers.get('x-cron-secret') !== secret) return new Response('Interdit', { status: 403 })
  const dry = new URL(req.url).searchParams.get('dry') === '1'

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const report = { dry, contactsDeleted: 0, mediaDeleted: 0, eventsPurged: 0, errors: [] as string[] }

  // L'événement est daté par la fin des envois, à défaut par sa création.
  const { data: events, error } = await admin.from('events').select('id, ends_at, created_at')
  if (error) return new Response(error.message, { status: 500 })
  const dateOf = (e: { ends_at: string | null; created_at: string }) => e.ends_at ?? e.created_at

  // 1. Coordonnées : suppression des comptes Auth des participants (hors jury et organisation).
  const contactCutoff = monthsAgo(CONTACT_MONTHS)
  const old = events.filter((e) => dateOf(e) < contactCutoff).map((e) => e.id)
  if (old.length) {
    const { data: staff } = await admin.from('staff').select('user_id')
    const keep = new Set((staff ?? []).map((s) => s.user_id))
    const { data: people } = await admin.from('participants').select('user_id').in('event_id', old).not('user_id', 'is', null)
    for (const userId of new Set((people ?? []).map((p) => p.user_id as string))) {
      if (keep.has(userId)) continue
      if (!dry) {
        const { error } = await admin.auth.admin.deleteUser(userId)
        if (error) { report.errors.push(`user ${userId}: ${error.message}`); continue }
      }
      report.contactsDeleted++
    }
  }

  // 2. Médias : fichiers puis lignes (envois, notes, notifications partent en cascade avec les participants).
  const mediaCutoff = monthsAgo(MEDIA_MONTHS)
  for (const e of events.filter((e) => dateOf(e) < mediaCutoff)) {
    const { data: entries } = await admin.from('entries').select('storage_path').eq('event_id', e.id)
    const paths = (entries ?? []).map((x) => x.storage_path as string)
    if (!dry) {
      for (let i = 0; i < paths.length; i += 100) {
        const { error } = await admin.storage.from('media').remove(paths.slice(i, i + 100))
        if (error) report.errors.push(`event ${e.id}: ${error.message}`)
      }
      const { error } = await admin.from('participants').delete().eq('event_id', e.id)
      if (error) report.errors.push(`event ${e.id}: ${error.message}`)
    }
    report.mediaDeleted += paths.length
    report.eventsPurged++
  }

  return new Response(JSON.stringify(report), { headers: { 'Content-Type': 'application/json' }, status: report.errors.length ? 207 : 200 })
})
