import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'
import { AUTH_DIR, MAIN_EVENT, OTP, SUPABASE_KEY, SUPABASE_URL } from './env'

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const cacheFile = (phone: string) => `${AUTH_DIR}/${phone.replace('+', '')}.json`
export const newClient = (): SupabaseClient => createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })

/** Session d'un compte de test. Réutilise la session mémorisée tant qu'elle est valable (Supabase limite à 1 code par minute et par numéro). */
export async function getSession(phone: string): Promise<Session> {
  mkdirSync(AUTH_DIR, { recursive: true })
  try {
    const cached = JSON.parse(readFileSync(cacheFile(phone), 'utf8')) as Session
    if (cached.expires_at && cached.expires_at * 1000 - Date.now() > 10 * 60_000) return cached
    const sb = newClient()
    const { data, error } = await sb.auth.refreshSession({ refresh_token: cached.refresh_token })
    if (!error && data.session) { writeFileSync(cacheFile(phone), JSON.stringify(data.session)); return data.session }
  } catch { /* pas de session mémorisée */ }
  const sb = newClient()
  for (let attempt = 0; attempt < 10; attempt++) {
    const { error } = await sb.auth.signInWithOtp({ phone })
    if (!error) break
    if (error.code !== 'over_sms_send_rate_limit' || attempt === 9) throw error
    await wait(15_000)
  }
  const { data, error } = await sb.auth.verifyOtp({ phone, token: OTP, type: 'sms' })
  if (error || !data.session) throw error ?? new Error('Connexion impossible')
  writeFileSync(cacheFile(phone), JSON.stringify(data.session))
  return data.session
}

/** Client Supabase connecté en tant que ce compte de test. */
export async function clientFor(phone: string): Promise<SupabaseClient> {
  const session = await getSession(phone)
  const sb = newClient()
  const { error } = await sb.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token })
  if (error) throw error
  return sb
}

/** Clé et valeur à poser dans le localStorage du navigateur pour y être connecté sans repasser par le SMS. */
export async function browserSession(phone: string): Promise<{ key: string; value: string }> {
  const session = await getSession(phone)
  const ref = new URL(SUPABASE_URL).hostname.split('.')[0]
  return { key: `sb-${ref}-auth-token`, value: JSON.stringify(session) }
}

// ---------- Événement de test jetable ----------

const PREFIX = 'E2E · '

/** Crée un événement en cours, copie de l'événement d'exemple (défis, règlement, équipe), avec 2 jurés validés. */
export async function createTestEvent(org: SupabaseClient, name: string): Promise<string> {
  const { data, error } = await org.rpc('create_next_event', { p_from: MAIN_EVENT, p_name: PREFIX + name })
  if (error) throw error
  const id = data as string
  const up = await org.from('events').update({ status: 'live', public_vote: true, jurors_expected: 2, jurors_validated: true, message: 'Événement de test automatique' }).eq('id', id)
  if (up.error) throw up.error
  return id
}

/** Supprime l'événement et les fichiers de ses participants (les lignes partent en cascade). */
export async function deleteTestEvent(org: SupabaseClient, id: string): Promise<void> {
  const [entries, parts] = await Promise.all([
    org.from('entries').select('storage_path').eq('event_id', id),
    org.from('participants').select('avatar_path').eq('event_id', id),
  ])
  const paths = [...(entries.data ?? []).map((e) => e.storage_path as string), ...(parts.data ?? []).map((p) => p.avatar_path as string | null).filter((p): p is string => !!p)]
  if (paths.length) await org.storage.from('media').remove(paths)
  await org.from('events').delete().eq('id', id)
}

/** Efface les événements de test restés après une exécution interrompue. */
export async function cleanOldTestEvents(org: SupabaseClient): Promise<void> {
  const { data } = await org.from('events').select('id').like('name', `${PREFIX}%`)
  for (const e of data ?? []) await deleteTestEvent(org, e.id)
}

/** Inscrit un compte comme participant (sans passer par l'écran), avec les deux consentements. */
export async function registerParticipant(sb: SupabaseClient, eventId: string, name: string): Promise<string> {
  const { data: u } = await sb.auth.getUser()
  const now = new Date().toISOString()
  const { data, error } = await sb.from('participants')
    .insert({ event_id: eventId, user_id: u.user!.id, display_name: name, consent_rules_at: now, consent_image_at: now }).select('id').single()
  if (error) throw error
  return data.id
}

export const TINY_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AL+AB//Z',
  'base64',
)
