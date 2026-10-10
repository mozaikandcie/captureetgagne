import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useI18n } from '../../i18n'
import { eventLink, isLocalAddress } from '../../lib/publicUrl'
import { buildQrPoster } from './poster'
import { useQr } from './useQr'

interface Archived { id: string; name: string; date: string; participants: number; contents: number; winner: string | null; score: number | null; publicWinner: string | null; thumbs: string[] }

const download = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Mur, remise des prix, QR code, export, historique des événements (organisateur pour l'export et l'archivage). */
export default function ToolsTab({ eventId, isOrganizer, toast }: { eventId: string; isOrganizer: boolean; toast: (text: string, error?: boolean) => void }) {
  const { t, lang } = useI18n()
  const qc = useQueryClient()
  const navigate = useNavigate()
  // Lien du QR code : l'adresse publique de l'application (jamais « localhost »), modifiable et mémorisé pour cet événement.
  const storageKey = `cg-qr-link-${eventId}`
  const [link, setLinkState] = useState(() => { try { return localStorage.getItem(storageKey) ?? eventLink(eventId) } catch { return eventLink(eventId) } })
  const setLink = (v: string) => { setLinkState(v); try { localStorage.setItem(storageKey, v) } catch { /* ignoré */ } }
  const [busy, setBusy] = useState(false)
  const [askArchive, setAskArchive] = useState(false)
  const qr = useQr(link || eventLink(eventId), 640)
  const local = isLocalAddress(link)

  const info = useQuery({
    queryKey: ['tools-info', eventId],
    refetchInterval: 20000,
    queryFn: async () => {
      const [ev, participants, entries, challenges] = await Promise.all([
        supabase.from('events').select('name, date_label, place').eq('id', eventId).single(),
        supabase.from('participants').select('id', { count: 'exact', head: true }).eq('event_id', eventId),
        supabase.from('entries').select('participant_id, challenge_id, kind, status').eq('event_id', eventId),
        supabase.from('challenges').select('id, title').eq('event_id', eventId),
      ])
      for (const r of [ev, participants, entries, challenges]) if (r.error) throw r.error
      const list = entries.data!
      const perChallenge = new Map<string, number>()
      for (const e of list) perChallenge.set(e.challenge_id, (perChallenge.get(e.challenge_id) ?? 0) + 1)
      const top = [...perChallenge.entries()].sort((a, b) => b[1] - a[1])[0]
      const ok = list.filter((e) => e.status === 'ok')
      return {
        event: ev.data!, participants: participants.count ?? 0, senders: new Set(list.map((e) => e.participant_id)).size, entries: list.length,
        photos: ok.filter((e) => e.kind === 'photo').length, videos: ok.filter((e) => e.kind === 'video').length,
        topName: top ? (challenges.data!.find((c) => c.id === top[0])?.title as Record<string, string> | undefined)?.[lang] ?? (challenges.data!.find((c) => c.id === top[0])?.title as Record<string, string>)?.fr ?? '–' : '–',
        topCount: top?.[1] ?? 0,
      }
    },
  })

  const history = useQuery({
    queryKey: ['history'],
    queryFn: async (): Promise<Archived[]> => {
      const { data, error } = await supabase.from('events').select('id').eq('status', 'archived').order('created_at', { ascending: false })
      if (error) throw error
      const out: Archived[] = []
      for (const { id } of data) {
        const s = await supabase.rpc('event_summary', { p_event: id })
        const r = s.data?.[0]
        if (!r) continue
        const signed = r.favorite_paths?.length ? await supabase.storage.from('media').createSignedUrls(r.favorite_paths, 3600) : { data: [] }
        out.push({ id, name: r.name, date: r.date_label ?? '', participants: r.participants, contents: r.contents, winner: r.winner, score: r.winner_score, publicWinner: r.public_winner,
          thumbs: (signed.data ?? []).map((u) => u.signedUrl).filter((u): u is string => !!u) })
      }
      return out
    },
  })

  async function exportZip() {
    setBusy(true)
    try {
      const { data } = await supabase.auth.getSession()
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-zip?event=${eventId}`, {
        headers: { Authorization: `Bearer ${data.session?.access_token ?? ''}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
      })
      if (!res.ok) throw new Error(String(res.status))
      download(await res.blob(), 'capture-et-gagne.zip')
    } catch {
      toast(t('exportFailed'), true)
    } finally {
      setBusy(false)
    }
  }

  async function exportCsv() {
    const { data, error } = await supabase.rpc('standings', { p_event: eventId })
    if (error) return toast(t('exportFailed'), true)
    const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const rows = [['Rang', 'Participant', 'Défis validés', 'Note jury /10', 'Score /100']].concat(
      (data ?? []).map((r: Record<string, unknown>, i: number) => [String(i + 1), String(r.display_name), String(r.done), Number(r.jury).toFixed(1).replace('.', ','), Number(r.score).toFixed(1).replace('.', ',')]))
    download(new Blob(['﻿' + rows.map((r) => r.map(q).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' }), 'classement-capture-et-gagne.csv')
  }

  async function poster() {
    if (!qr || !info.data) return
    try {
      const sub = [info.data.event.date_label, info.data.event.place].filter(Boolean).join(' · ')
      download(await buildQrPoster({ qrDataUrl: qr, name: info.data.event.name, subtitle: sub }), 'affichette-qr-capture-et-gagne.png')
    } catch {
      toast(t('exportFailed'), true)
    }
  }

  async function copy() {
    try { await navigator.clipboard.writeText(link); toast(t('linkCopied')) } catch { toast(link) }
  }

  async function archive() {
    const { error } = await supabase.rpc('archive_event', { p_event: eventId })
    if (error) return toast(t('modFailed'), true)
    const next = await supabase.rpc('create_next_event', { p_from: eventId, p_name: '' })
    await qc.invalidateQueries()
    toast(t('archived'))
    if (next.data) navigate(`/organisation/${next.data as string}`)
  }

  const d = info.data
  return (
    <section className="stack">
      <div className="box">
        <h2>{t('wallTitle')}</h2>
        <p className="help">{t('wallNote')}</p>
        <div className="row"><Link className="btn small" to={`/organisation/${eventId}/mur`}>{t('launchWall')}</Link>
          <span className="help">{d ? t('wallInfo', { n: d.photos + d.videos }) : ''}</span></div>
      </div>

      {isOrganizer && (
        <div className="box">
          <h2>{t('cerTitle')}</h2>
          <p className="help">{t('cerNote')}</p>
          <div className="row"><Link className="btn small" to={`/organisation/${eventId}/remise`}>{t('launchCeremony')}</Link></div>
        </div>
      )}

      <div className="box">
        <h2>{t('qrTitle')}</h2>
        <p className="help">{t('qrHelp')}</p>
        <label className="f"><span>{t('qrLinkLabel')}</span><input type="text" value={link} onChange={(e) => setLink(e.target.value.trim())} /></label>
        {local && <p role="alert" className="notice"><b>{t('qrLocalTitle')}</b> {t('qrLocalHelp')}</p>}
        <div className="row"><button type="button" className="btn small ghost" onClick={() => setLink(eventLink(eventId))}>{t('qrReset')}</button></div>
        <div className="qrcard">
          {qr && <img className="qrbox" src={qr} alt={t('wallScan')} />}
          <div className="qrtxt"><span className="lab">{t('wallScan')}</span><b>{d?.event.name}</b><span>Capture et Gagne · Ambyans Twopikal</span></div>
        </div>
        <div className="row">
          <button type="button" className="btn small" onClick={() => void poster()}>{t('qrDownload')}</button>
          <button type="button" className="btn small ghost" onClick={() => void copy()}>{t('qrCopy')}</button>
        </div>
      </div>

      <div className="box">
        <h2>{t('exportTitle')}</h2>
        <p className="help">{t('exportNote')}</p>
        {d && (
          <div className="stats">
            {[[d.participants, t('statParticipants')], [d.senders, t('statSenders')], [d.entries, t('statEntries')], [d.photos, t('statPhotos')], [d.videos, t('statVideos')], [d.topCount, t('statTop', { name: d.topName })]]
              .map(([n, l], i) => <div key={i}><b>{n}</b><span>{l}</span></div>)}
          </div>
        )}
        <div className="row">
          {isOrganizer && <button type="button" className="btn small" disabled={busy} onClick={() => void exportZip()}>{busy ? t('exporting') : t('exportZip')}</button>}
          <button type="button" className="btn small ghost" onClick={() => void exportCsv()}>{t('exportCsv')}</button>
        </div>
      </div>

      <div className="box">
        <h2>{t('history')}</h2>
        <p className="help">{t('historyHelp')}</p>
        {isOrganizer && (askArchive ? (
          <div className="row err">
            <span>{t('archiveAsk', { name: d?.event.name ?? '' })}</span>
            <button type="button" className="btn small ghost bad" onClick={() => void archive()}>{t('archiveYes')}</button>
            <button type="button" className="btn small ghost" onClick={() => setAskArchive(false)}>{t('cancel')}</button>
          </div>
        ) : <div className="row"><button type="button" className="btn small ghost" onClick={() => setAskArchive(true)}>{t('archiveBtn')}</button></div>)}
        <ul className="hist">
          {(history.data ?? []).map((a) => (
            <li key={a.id}>
              <div className="hn"><b>{a.name}</b><span className="help">{a.date}</span></div>
              <span className="help">{a.participants} {t('statParticipants')} · {t('statContentsValid', { n: a.contents })}</span>
              <span>🏆 {a.winner ? `${a.winner} (${a.score?.toFixed(1).replace('.', ',')} pts)` : '–'}{a.publicWinner ? ` · ${t('publicWinnerLine', { name: a.publicWinner })}` : ''}</span>
              {a.thumbs.length > 0 && <div className="ht">{a.thumbs.map((u, i) => <img key={i} src={u} alt="" />)}</div>}
            </li>
          ))}
          {history.data?.length === 0 && <li className="empty">{t('noArchive')}</li>}
        </ul>
      </div>
    </section>
  )
}
