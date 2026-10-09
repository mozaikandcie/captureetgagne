// Export ZIP des contenus validés (un dossier par défi) + classement.csv.
// Appelée par un organisateur : GET /functions/v1/export-zip?event=<uuid> avec son jeton Auth.
// Le ZIP est produit en flux (fflate) pour ne jamais garder tous les médias en mémoire.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Zip, ZipDeflate, ZipPassThrough, strToU8 } from 'https://esm.sh/fflate@0.8.2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
}

const safe = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '_').slice(0, 60)
const csvCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })

  const eventId = new URL(req.url).searchParams.get('event')
  const auth = req.headers.get('Authorization')
  if (!eventId || !auth) return new Response('Requête invalide', { status: 400, headers: cors })

  // 1. Qui appelle ? Le jeton est vérifié avec le client « utilisateur » (RLS appliquée).
  const url = Deno.env.get('SUPABASE_URL')!
  const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
  const { data: me } = await asUser.auth.getUser()
  if (!me.user) return new Response('Non connecté', { status: 401, headers: cors })
  const { data: staff } = await asUser.from('staff').select('role')
    .eq('event_id', eventId).eq('user_id', me.user.id).eq('role', 'organizer').maybeSingle()
  if (!staff) return new Response('Réservé aux organisateurs', { status: 403, headers: cors })

  // 2. Les données et les fichiers sont lus avec la clé de service (jamais exposée au navigateur).
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const [entries, challenges, participants, ranking] = await Promise.all([
    admin.from('entries').select('id, participant_id, challenge_id, kind, storage_path').eq('event_id', eventId).eq('status', 'ok'),
    admin.from('challenges').select('id, position, title').eq('event_id', eventId),
    admin.from('participants').select('id, display_name').eq('event_id', eventId),
    // standings() vérifie is_staff via auth.uid() : on l'appelle donc avec le client de l'organisateur.
    asUser.rpc('standings', { p_event: eventId }),
  ])
  for (const r of [entries, challenges, participants, ranking]) {
    if (r.error) return new Response('Lecture impossible', { status: 500, headers: cors })
  }

  const names = new Map(participants.data!.map((p) => [p.id, p.display_name as string]))
  const folders = new Map(challenges.data!.map((c) => [c.id, `${String(c.position).padStart(2, '0')}_${safe(c.title?.fr ?? 'defi')}`]))

  const header = 'rang;participant;defis_valides;note_jury;score\n'
  const csv = header + (ranking.data ?? []).map((r: Record<string, unknown>, i: number) =>
    [i + 1, r.display_name, r.done, r.jury, r.score].map(csvCell).join(';')).join('\n') + '\n'

  // 3. Flux ZIP.
  let controller!: ReadableStreamDefaultController<Uint8Array>
  const body = new ReadableStream<Uint8Array>({ start: (c) => { controller = c } })
  const zip = new Zip((err, chunk, final) => {
    if (err) return controller.error(err)
    controller.enqueue(chunk)
    if (final) controller.close()
  })

  ;(async () => {
    try {
      const csvFile = new ZipDeflate('classement.csv')
      zip.add(csvFile)
      csvFile.push(strToU8('﻿' + csv), true) // BOM : Excel lit correctement les accents

      for (const e of entries.data!) {
        const ext = e.storage_path.split('.').pop() ?? 'bin'
        const name = `${folders.get(e.challenge_id) ?? 'defi'}/${safe(names.get(e.participant_id) ?? 'inconnu')}_${e.id.slice(0, 8)}.${ext}`
        const { data: signed } = await admin.storage.from('media').createSignedUrl(e.storage_path, 600)
        if (!signed) continue
        const res = await fetch(signed.signedUrl)
        if (!res.ok || !res.body) continue
        const file = new ZipPassThrough(name) // photos et vidéos sont déjà compressées
        zip.add(file)
        const reader = res.body.getReader()
        for (;;) {
          const { done, value } = await reader.read()
          if (done) { file.push(new Uint8Array(0), true); break }
          file.push(value)
        }
      }
      zip.end()
    } catch (err) {
      controller.error(err)
    }
  })()

  return new Response(body, {
    headers: { ...cors, 'Content-Type': 'application/zip', 'Content-Disposition': 'attachment; filename="capture-et-gagne.zip"' },
  })
})
