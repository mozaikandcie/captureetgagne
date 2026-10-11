// Solde de crédits SMS Brevo, pour les organisateurs (GET avec leur jeton). Sert à surveiller la réserve avant l'événement.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  const auth = req.headers.get('Authorization')
  if (!auth) return json({ error: 'Requête invalide' }, 400)
  const asUser = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
  const { data: me } = await asUser.auth.getUser()
  if (!me.user) return json({ error: 'Non connecté' }, 401)
  const { data: staff } = await asUser.from('staff').select('role').eq('user_id', me.user.id).eq('role', 'organizer').limit(1)
  if (!staff?.length) return json({ error: 'Réservé aux organisateurs' }, 403)

  const key = Deno.env.get('BREVO_API_KEY')
  if (!key) return json({ credits: null, error: 'Clé Brevo absente' })
  const res = await fetch('https://api.brevo.com/v3/account', { headers: { 'api-key': key, accept: 'application/json' } })
  if (!res.ok) return json({ credits: null, error: `Brevo ${res.status}` })
  const account = await res.json() as { plan?: { type: string; credits?: number }[] }
  const sms = account.plan?.find((p) => p.type === 'sms')
  return json({ credits: typeof sms?.credits === 'number' ? Math.floor(sms.credits) : null })
})
