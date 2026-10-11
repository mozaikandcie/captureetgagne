// SMS aux gagnants. POST { event, dry?: boolean } avec le jeton d'un organisateur.
//  - dry = true : renvoie la liste (qui, quel message, déjà envoyé ?) sans rien envoyer ;
//  - sinon : envoie un SMS par gagnant via Brevo, une seule fois par personne (table winner_sms).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { buildMessage, groupAwards, maskPhone } from '../_shared/winners.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  const auth = req.headers.get('Authorization')
  const body = await req.json().catch(() => null) as { event?: string; dry?: boolean } | null
  if (!auth || !body?.event) return json({ error: 'Requête invalide' }, 400)
  const eventId = body.event

  const url = Deno.env.get('SUPABASE_URL')!
  const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
  const { data: me } = await asUser.auth.getUser()
  if (!me.user) return json({ error: 'Non connecté' }, 401)
  const { data: staff } = await asUser.from('staff').select('role').eq('event_id', eventId).eq('user_id', me.user.id).eq('role', 'organizer').maybeSingle()
  if (!staff) return json({ error: 'Réservé aux organisateurs' }, 403)

  // Classement, prix par défi et Prix du public : lus avec le jeton de l'organisateur (les fonctions vérifient is_staff).
  const [event, ranking, prizes, challenges] = await Promise.all([
    asUser.from('events').select('public_vote').eq('id', eventId).single(),
    asUser.rpc('standings', { p_event: eventId }),
    asUser.rpc('challenge_prizes', { p_event: eventId }),
    asUser.from('challenges').select('id, title').eq('event_id', eventId),
  ])
  for (const r of [event, ranking, prizes, challenges]) if (r.error) return json({ error: 'Lecture impossible' }, 500)
  const publicPrize = event.data!.public_vote ? await asUser.rpc('public_prize', { p_event: eventId }) : null
  if (publicPrize?.error) return json({ error: 'Lecture impossible' }, 500)

  const titles = new Map(challenges.data!.map((c) => [c.id as string, ((c.title as Record<string, string>)?.fr ?? '') as string]))
  const awards = groupAwards({
    podium: (ranking.data as { participant_id: string; done: number }[]).filter((r) => r.done > 0).slice(0, 3)
      .map((r, i) => ({ participantId: r.participant_id, rank: i + 1 })),
    challengePrizes: (prizes.data as { participant_id: string; challenge_id: string }[])
      .map((p) => ({ participantId: p.participant_id, title: titles.get(p.challenge_id) ?? '' })),
    publicWinnerId: (publicPrize?.data as { participant_id: string }[] | null)?.[0]?.participant_id ?? null,
  })

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const ids = awards.map((a) => a.participantId)
  const [people, already] = await Promise.all([
    admin.from('participants').select('id, user_id, display_name').in('id', ids),
    admin.from('winner_sms').select('participant_id').eq('event_id', eventId),
  ])
  if (people.error || already.error) return json({ error: 'Lecture impossible' }, 500)
  const sent = new Set((already.data ?? []).map((r) => r.participant_id as string))

  const rows = []
  for (const a of awards) {
    const person = people.data!.find((p) => p.id === a.participantId)
    if (!person) continue
    // Coordonnées purgées (RGPD) : plus de compte, donc plus de numéro.
    const phone = person.user_id ? (await admin.auth.admin.getUserById(person.user_id as string)).data.user?.phone ?? null : null
    rows.push({
      participantId: a.participantId, name: person.display_name as string, rank: a.rank,
      phone, phoneMasked: phone ? maskPhone(phone) : null,
      message: buildMessage(person.display_name as string, a), alreadySent: sent.has(a.participantId),
    })
  }

  if (body.dry) return json({ winners: rows.map(({ phone: _phone, ...r }) => r) })

  const brevoKey = Deno.env.get('BREVO_API_KEY')
  const sender = Deno.env.get('BREVO_SMS_SENDER') ?? 'AMBYANS'
  if (!brevoKey) return json({ error: 'Configuration manquante' }, 500)
  const result = { sent: 0, skipped: 0, failed: [] as { name: string; reason: string }[] }
  for (const r of rows) {
    if (r.alreadySent) { result.skipped++; continue }
    if (!r.phone) { result.failed.push({ name: r.name, reason: 'numéro introuvable' }); continue }
    // On réserve la ligne avant l'envoi : un double clic ne peut pas envoyer deux fois.
    const claim = await admin.from('winner_sms').insert({ event_id: eventId, participant_id: r.participantId })
    if (claim.error) { result.skipped++; continue }
    const res = await fetch('https://api.brevo.com/v3/transactionalSMS/sms', {
      method: 'POST',
      headers: { 'api-key': brevoKey, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ sender, recipient: r.phone, content: r.message, type: 'transactional' }),
    })
    if (res.ok) { result.sent++; continue }
    console.error('Brevo', res.status, await res.text())
    await admin.from('winner_sms').delete().eq('event_id', eventId).eq('participant_id', r.participantId)
    result.failed.push({ name: r.name, reason: `Brevo ${res.status}` })
  }
  return json(result)
})
