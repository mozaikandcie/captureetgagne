import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useI18n } from '../../i18n'
import { normalizePhone } from '../inscription/phone'

/** L'organisation choisit et valide le nombre de jurés, invite des jurés par téléphone et retire ceux qui ne participent pas. */
export default function JurorsManager({ eventId, toast }: { eventId: string; toast: (text: string, error?: boolean) => void }) {
  const { t } = useI18n()
  const qc = useQueryClient()
  const [count, setCount] = useState<number | null>(null)
  const [label, setLabel] = useState('')
  const [phone, setPhone] = useState('')
  const [askRemove, setAskRemove] = useState<string | null>(null)

  const data = useQuery({
    queryKey: ['jurors-manager', eventId],
    queryFn: async () => {
      const [ev, staff, invites] = await Promise.all([
        supabase.from('events').select('jurors_expected, jurors_validated').eq('id', eventId).single(),
        supabase.from('staff').select('user_id, label').eq('event_id', eventId).eq('role', 'juror'),
        supabase.from('staff_invites').select('phone, label').eq('event_id', eventId).eq('role', 'juror'),
      ])
      for (const r of [ev, staff, invites]) if (r.error) throw r.error
      return { ev: ev.data!, jurors: staff.data!, invites: invites.data! }
    },
  })
  const refresh = async () => {
    for (const k of ['jurors-manager', 'juror-count', 'ranking', 'ceremony', 'entry-stats']) await qc.invalidateQueries({ queryKey: [k] })
  }

  if (!data.data) return null
  const { ev, jurors, invites } = data.data
  const enrolled = jurors.length
  const expected = count ?? ev.jurors_expected ?? Math.max(enrolled + invites.length, 1)
  const validated = ev.jurors_validated && ev.jurors_expected !== null
  const full = validated && enrolled + invites.length >= (ev.jurors_expected ?? 0)

  async function validate() {
    const { error } = await supabase.from('events').update({ jurors_expected: expected, jurors_validated: true }).eq('id', eventId)
    if (error) return toast(t('modFailed'), true)
    setCount(null)
    toast(t('jurorsValidatedToast', { n: expected }))
    await refresh()
  }
  async function unlock() {
    const { error } = await supabase.from('events').update({ jurors_validated: false }).eq('id', eventId)
    if (error) return toast(t('modFailed'), true)
    await refresh()
  }
  async function invite() {
    const e164 = normalizePhone(phone)
    if (!e164) return toast(t('badPhone'), true)
    if (!label.trim()) return toast(t('jurorNameNeeded'), true)
    const { error } = await supabase.from('staff_invites').upsert({ event_id: eventId, phone: e164.replace('+', ''), role: 'juror', label: label.trim() })
    if (error) return toast(t('modFailed'), true)
    setLabel(''); setPhone('')
    toast(t('jurorInvited'))
    await refresh()
  }
  async function removeJuror(userId: string) {
    const { error } = await supabase.from('staff').delete().eq('event_id', eventId).eq('user_id', userId).eq('role', 'juror')
    if (error) return toast(t('modFailed'), true)
    setAskRemove(null)
    await refresh()
  }
  async function cancelInvite(p: string) {
    await supabase.from('staff_invites').delete().eq('event_id', eventId).eq('phone', p)
    await refresh()
  }

  return (
    <section className="box">
      <h3>{t('jurorsTitle')}</h3>
      <p className="help">{t('jurorsHelp')}</p>

      <div className="row">
        <label className="f" style={{ maxWidth: 180 }}>
          <span>{t('jurorsNumber')}</span>
          <input type="number" min={1} max={20} value={expected} disabled={validated}
            onChange={(e) => setCount(Math.min(20, Math.max(1, Number(e.target.value) || 1)))} />
        </label>
        {validated
          ? <><span className="pill ok">✓ {t('jurorsValidated', { n: ev.jurors_expected ?? 0 })}</span>
              <button type="button" className="btn small ghost" onClick={() => void unlock()}>{t('jurorsModify')}</button></>
          : <button type="button" className="btn small" onClick={() => void validate()}>{t('jurorsValidate')}</button>}
      </div>
      <p className={enrolled + invites.length < (ev.jurors_expected ?? expected) ? 'miss' : 'help'}>
        {t('jurorsEnrolled', { n: enrolled, total: validated ? ev.jurors_expected ?? expected : expected })}
      </p>

      <ul className="clist">
        {jurors.map((j) => (
          <li key={j.user_id}>
            <div className="t"><b>{j.label}</b><small>{t('jurorActive')}</small></div>
            {askRemove === j.user_id ? (
              <div className="row err">
                <span>{t('jurorRemoveAsk')}</span>
                <button type="button" className="btn small ghost bad" onClick={() => void removeJuror(j.user_id)}>{t('yesDelete')}</button>
                <button type="button" className="btn small ghost" onClick={() => setAskRemove(null)}>{t('cancel')}</button>
              </div>
            ) : <button type="button" className="btn small ghost bad" onClick={() => setAskRemove(j.user_id)}>{t('jurorRemove')}</button>}
          </li>
        ))}
        {invites.map((i) => (
          <li key={i.phone}>
            <div className="t"><b>{i.label}</b><small>{t('jurorPending', { phone: `+${i.phone}` })}</small></div>
            <button type="button" className="btn small ghost" onClick={() => void cancelInvite(i.phone)}>{t('jurorCancelInvite')}</button>
          </li>
        ))}
        {jurors.length + invites.length === 0 && <li className="empty">{t('jurorsNone')}</li>}
      </ul>

      <h4>{t('jurorAdd')}</h4>
      <div className="filters">
        <label className="f"><span>{t('jurorName')}</span><input type="text" value={label} disabled={full} onChange={(e) => setLabel(e.target.value)} /></label>
        <label className="f"><span>{t('phone')}</span><input type="tel" inputMode="tel" value={phone} disabled={full} onChange={(e) => setPhone(e.target.value)} /></label>
      </div>
      {full && <p className="help">{t('jurorsFull')}</p>}
      <p className="help">{t('jurorInviteHelp')}</p>
      <button type="button" className="btn small" disabled={full} onClick={() => void invite()}>{t('jurorInvite')}</button>
    </section>
  )
}
