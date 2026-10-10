// Règles d'accès (RLS) vérifiées avec de vrais comptes de rôles différents, contre le projet Supabase de `.env`.
// Un test visuel ne peut pas voir ces failles : un participant qui lit les envois d'un autre, un juré qui change le règlement…
// Lancer : npm run test:rls   (utilise les numéros de test ; un événement jetable est créé puis supprimé)
import type { SupabaseClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PHONES } from '../../e2e/support/env'
import { cleanOldTestEvents, clientFor, createTestEvent, deleteTestEvent, newClient, registerParticipant, TINY_JPEG } from '../../e2e/support/api'

let org: SupabaseClient, juror1: SupabaseClient, juror2: SupabaseClient, a: SupabaseClient, b: SupabaseClient
const anon = newClient()
let eventId = '', closedEventId = '', challengeId = ''
let pA = '', pB = '', entryA = '', entryB = '', entryBOk = ''
const paths: Record<string, string> = {}

/** Une lecture refusée par la RLS renvoie une liste vide (ou une erreur) : dans les deux cas, rien n'est visible. */
const sees = async (q: PromiseLike<{ data: unknown[] | null; error: unknown }>) => ((await q).data ?? []).length

async function addEntry(sb: SupabaseClient, participantId: string): Promise<string> {
  const id = crypto.randomUUID()
  const path = `${eventId}/${participantId}/${id}.jpg`
  const up = await sb.storage.from('media').upload(path, TINY_JPEG, { contentType: 'image/jpeg' })
  if (up.error) throw up.error
  const { error } = await sb.from('entries').insert({ id, event_id: eventId, challenge_id: challengeId, participant_id: participantId, kind: 'photo', storage_path: path })
  if (error) throw error
  paths[id] = path
  return id
}

beforeAll(async () => {
  ;[org, juror1, juror2, a, b] = await Promise.all([PHONES.organizer, PHONES.juror1, PHONES.juror2, PHONES.participantA, PHONES.participantB].map(clientFor))
  await cleanOldTestEvents(org)
  eventId = await createTestEvent(org, 'règles d’accès')
  closedEventId = await createTestEvent(org, 'événement fermé')
  await org.from('events').update({ status: 'draft' }).eq('id', closedEventId)
  const ch = await org.from('challenges').select('id').eq('event_id', eventId).order('position').limit(1).single()
  challengeId = ch.data!.id
  pA = await registerParticipant(a, eventId, 'Testeuse A')
  pB = await registerParticipant(b, eventId, 'Testeur B')
  entryA = await addEntry(a, pA)
  entryB = await addEntry(b, pB)
  entryBOk = await addEntry(b, pB)
  // Le jury valide un contenu de B : il devient visible des autres participants.
  const v = await juror1.from('entries').update({ status: 'ok' }).eq('id', entryBOk).select()
  if (v.error || v.data?.length !== 1) throw new Error('Préparation impossible : validation par le juré')
})

afterAll(async () => {
  if (org) { await deleteTestEvent(org, eventId); await deleteTestEvent(org, closedEventId) }
})

describe('visiteur non connecté', () => {
  it('lit l’événement ouvert et ses défis, mais pas un brouillon', async () => {
    expect(await sees(anon.from('events').select('id').eq('id', eventId))).toBe(1)
    expect(await sees(anon.from('challenges').select('id').eq('event_id', eventId))).toBeGreaterThan(0)
    expect(await sees(anon.from('events').select('id').eq('id', closedEventId))).toBe(0)
  })
  it('ne lit aucune donnée personnelle ni aucun envoi', async () => {
    for (const table of ['entries', 'participants', 'scores', 'notifications', 'votes', 'staff', 'staff_invites', 'participant_badges']) {
      expect(await sees(anon.from(table).select('*')), table).toBe(0)
    }
  })
  it('ne peut ni s’inscrire ni appeler les fonctions réservées', async () => {
    const ins = await anon.from('participants').insert({ event_id: eventId, user_id: crypto.randomUUID(), display_name: 'X', consent_rules_at: new Date().toISOString(), consent_image_at: new Date().toISOString() })
    expect(ins.error).not.toBeNull()
    expect(((await anon.rpc('standings', { p_event: eventId })).data ?? []).length).toBe(0)
    expect((await anon.rpc('notify_ranks', { p_event: eventId })).error).not.toBeNull()
    expect((await anon.rpc('archive_event', { p_event: eventId })).error).not.toBeNull()
  })
  it('ne peut pas lire un fichier du stockage privé', async () => {
    expect((await anon.storage.from('media').createSignedUrl(paths[entryBOk], 60)).error).not.toBeNull()
  })
})

describe('participant A', () => {
  it('voit ses propres envois en attente, pas ceux de B', async () => {
    const ids = ((await a.from('entries').select('id').eq('event_id', eventId)).data ?? []).map((e) => e.id)
    expect(ids).toContain(entryA)
    expect(ids).not.toContain(entryB) // en attente : privé
  })
  it('voit un envoi de B seulement une fois validé', async () => {
    const ids = ((await a.from('entries').select('id').eq('event_id', eventId)).data ?? []).map((e) => e.id)
    expect(ids).toContain(entryBOk)
  })
  it('ne voit que sa propre ligne participant', async () => {
    const rows = (await a.from('participants').select('id').eq('event_id', eventId)).data ?? []
    expect(rows.map((r) => r.id)).toEqual([pA])
  })
  it('ne peut pas valider, refuser ni supprimer l’envoi d’un autre', async () => {
    expect(await sees(a.from('entries').update({ status: 'ok' }).eq('id', entryB).select())).toBe(0)
    expect(await sees(a.from('entries').update({ status: 'rejected' }).eq('id', entryA).select())).toBe(0) // pas même le sien
    expect(await sees(a.from('entries').delete().eq('id', entryB).select())).toBe(0)
    const still = await org.from('entries').select('status').eq('id', entryB).single()
    expect(still.data?.status).toBe('pending')
  })
  it('ne peut pas déposer un envoi au nom de B ni dans son dossier', async () => {
    const id = crypto.randomUUID()
    const ins = await a.from('entries').insert({ id, event_id: eventId, challenge_id: challengeId, participant_id: pB, kind: 'photo', storage_path: `${eventId}/${pB}/${id}.jpg` })
    expect(ins.error).not.toBeNull()
    const up = await a.storage.from('media').upload(`${eventId}/${pB}/intrus.jpg`, TINY_JPEG, { contentType: 'image/jpeg' })
    expect(up.error).not.toBeNull()
  })
  it('ne lit pas le fichier en attente de B, mais lit celui d’un envoi validé', async () => {
    expect((await a.storage.from('media').createSignedUrl(paths[entryB], 60)).error).not.toBeNull()
    expect((await a.storage.from('media').createSignedUrl(paths[entryBOk], 60)).error).toBeNull()
  })
  it('ne peut pas noter, ni lire les notes, ni voir l’équipe', async () => {
    expect((await a.from('scores').insert({ entry_id: entryBOk, juror_id: (await a.auth.getUser()).data.user!.id, respect: 10, quality: 10, originality: 10 })).error).not.toBeNull()
    expect(await sees(a.from('scores').select('*').eq('entry_id', entryBOk))).toBe(0)
    expect(await sees(a.from('staff').select('*').eq('event_id', eventId))).toBe(0)
    expect(await sees(a.from('staff_invites').select('*'))).toBe(0)
    expect(((await a.rpc('entry_stats', { p_event: eventId })).data ?? []).length).toBe(0)
  })
  it('ne peut pas modifier l’événement ni ses défis', async () => {
    expect(await sees(a.from('events').update({ name: 'Piraté' }).eq('id', eventId).select())).toBe(0)
    expect(await sees(a.from('challenges').update({ position: 99 }).eq('id', challengeId).select())).toBe(0)
    expect((await a.from('challenges').insert({ event_id: eventId, position: 50, title: { fr: 'X' }, hint: { fr: 'X' }, kind: 'photo' })).error).not.toBeNull()
  })
  it('ne peut pas appeler les fonctions réservées à l’organisation', async () => {
    expect((await a.rpc('archive_event', { p_event: eventId })).error).not.toBeNull()
    expect((await a.rpc('notify_ranks', { p_event: eventId })).error).not.toBeNull()
    expect((await a.rpc('create_next_event', { p_from: eventId, p_name: 'x' })).error).not.toBeNull()
  })
  it('ne peut pas s’inscrire à un événement qui n’est pas ouvert', async () => {
    expect(await sees(a.from('events').select('id').eq('id', closedEventId))).toBe(0)
    await expect(registerParticipant(a, closedEventId, 'Intruse')).rejects.toBeTruthy()
  })
  it('vote : jamais pour soi, seulement sur un envoi validé, un seul vote par contenu', async () => {
    expect((await a.from('votes').insert({ participant_id: pA, entry_id: entryA })).error).not.toBeNull() // le sien (et en attente)
    expect((await a.from('votes').insert({ participant_id: pA, entry_id: entryB })).error).not.toBeNull() // pas validé
    expect((await a.from('votes').insert({ participant_id: pA, entry_id: entryBOk })).error).toBeNull()
    expect((await a.from('votes').insert({ participant_id: pA, entry_id: entryBOk })).error).not.toBeNull() // doublon
    expect((await b.from('votes').insert({ participant_id: pA, entry_id: entryBOk })).error).not.toBeNull() // au nom d'un autre
    expect(await sees(b.from('votes').select('*'))).toBe(0) // les votes des autres restent privés
    const counts = (await b.rpc('vote_counts', { p_event: eventId })).data as { entry_id: string; votes: number }[]
    expect(counts.find((c) => c.entry_id === entryBOk)?.votes).toBe(1) // mais le total est public
  })
  it('ne lit que ses propres notifications (toutes ses inscriptions, jamais celles d’un autre)', async () => {
    const mineIds = new Set(((await a.from('participants').select('id')).data ?? []).map((p) => p.id)) // ce compte peut être inscrit à plusieurs événements
    const rows = (await a.from('notifications').select('participant_id')).data ?? []
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((r) => mineIds.has(r.participant_id))).toBe(true)
    expect(mineIds.has(pB)).toBe(false)
  })
})

describe('juré', () => {
  it('voit tous les envois de l’événement et peut modérer', async () => {
    const ids = ((await juror1.from('entries').select('id').eq('event_id', eventId)).data ?? []).map((e) => e.id)
    expect(ids).toEqual(expect.arrayContaining([entryA, entryB, entryBOk]))
    expect(await sees(juror1.from('entries').update({ status: 'ok' }).eq('id', entryA).select())).toBe(1)
  })
  it('note avec son propre compte seulement', async () => {
    const me = (await juror1.auth.getUser()).data.user!.id
    const other = (await juror2.auth.getUser()).data.user!.id
    expect((await juror1.from('scores').upsert({ entry_id: entryA, juror_id: me, respect: 8, quality: 7, originality: 9 })).error).toBeNull()
    expect((await juror1.from('scores').upsert({ entry_id: entryA, juror_id: other, respect: 10, quality: 10, originality: 10 })).error).not.toBeNull()
  })
  it('ne lit pas les notes des autres jurés', async () => {
    const other = (await juror2.auth.getUser()).data.user!.id
    expect((await juror2.from('scores').upsert({ entry_id: entryA, juror_id: other, respect: 5, quality: 5, originality: 5 })).error).toBeNull()
    const seen = (await juror1.from('scores').select('juror_id').eq('entry_id', entryA)).data ?? []
    expect(seen.length).toBe(1)
    expect(seen[0].juror_id).toBe((await juror1.auth.getUser()).data.user!.id)
    // Les agrégats (moyenne, nombre de jurés) restent accessibles à l'équipe.
    const stats = ((await juror1.rpc('entry_stats', { p_event: eventId })).data ?? []) as { entry_id: string; n_jurors: number }[]
    expect(stats.find((s) => s.entry_id === entryA)?.n_jurors).toBe(2)
  })
  it('ne peut pas modifier l’événement, les défis, l’équipe ni archiver', async () => {
    expect(await sees(juror1.from('events').update({ name: 'Piraté' }).eq('id', eventId).select())).toBe(0)
    expect(await sees(juror1.from('challenges').update({ position: 99 }).eq('id', challengeId).select())).toBe(0)
    expect((await juror1.from('staff_invites').insert({ event_id: eventId, phone: '33699999999', label: 'X' })).error).not.toBeNull()
    expect((await juror1.rpc('archive_event', { p_event: eventId })).error).not.toBeNull()
    expect((await juror1.rpc('notify_ranks', { p_event: eventId })).error).not.toBeNull()
  })
})

describe('organisateur', () => {
  it('lit toutes les notes et tous les participants de l’événement', async () => {
    expect(await sees(org.from('scores').select('*').eq('entry_id', entryA))).toBe(2)
    expect(await sees(org.from('participants').select('id').eq('event_id', eventId))).toBe(2)
  })
  it('ne peut pas noter (il n’est pas juré)', async () => {
    const me = (await org.auth.getUser()).data.user!.id
    expect((await org.from('scores').insert({ entry_id: entryA, juror_id: me, respect: 10, quality: 10, originality: 10 })).error).not.toBeNull()
  })
  it('modifie l’événement et les défis, invite un juré', async () => {
    expect(await sees(org.from('events').update({ message: 'Modifié par l’organisateur' }).eq('id', eventId).select())).toBe(1)
    expect((await org.from('staff_invites').insert({ event_id: eventId, phone: '33699999999', label: 'Invité test' })).error).toBeNull()
    expect(await sees(org.from('staff_invites').delete().eq('event_id', eventId).select())).toBe(1)
  })
  it('l’inscription expire avec le droit à l’effacement : un participant supprime la sienne', async () => {
    expect(await sees(b.from('participants').delete().eq('id', pB).select())).toBe(1)
    expect(await sees(org.from('entries').select('id').eq('participant_id', pB))).toBe(0) // ses envois partent avec
  })
})

describe('badges', () => {
  it('sont attribués côté serveur et lisibles par leur propriétaire seulement', async () => {
    // A a un envoi validé et noté : « Premier envoi ». B a été supprimé, A ne voit pas les badges d'un autre.
    const mine = ((await a.from('participant_badges').select('badge')).data ?? []).map((r) => r.badge)
    expect(mine).toContain('first')
    const mineIds = ((await a.from('participants').select('id')).data ?? []).map((p) => p.id)
    const foreign = ((await a.from('participant_badges').select('participant_id')).data ?? []).filter((r) => !mineIds.includes(r.participant_id))
    expect(foreign).toEqual([])
  })
})
