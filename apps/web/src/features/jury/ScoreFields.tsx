import { useI18n } from '../../i18n'
import { average, type NoteForm } from '../notation/notes'

const CRITERIA = [
  ['respect', 'critRespect'],
  ['quality', 'critQuality'],
  ['originality', 'critOriginality'],
] as const

/** Trois curseurs 0 à 10 + commentaire, partagés par la grille et la notation à la chaîne. */
export default function ScoreFields({ note, onChange, id }: { note: NoteForm; onChange: (n: NoteForm) => void; id: string }) {
  const { t } = useI18n()
  return (
    <div className="stack">
      {CRITERIA.map(([key, label]) => (
        <div key={key} className="crit">
          <label htmlFor={`${id}-${key}`}>{t(label)}</label>
          <input id={`${id}-${key}`} type="range" min={0} max={10} step={1} value={note[key]}
            onChange={(e) => onChange({ ...note, [key]: Number(e.target.value) })} />
          <output htmlFor={`${id}-${key}`}>{note[key]}</output>
        </div>
      ))}
      <p className="help">{t('noteAvg', { n: average(note).toFixed(1).replace('.', ',') })}</p>
      <textarea className="jcom" rows={2} aria-label={t('commentLabel')} placeholder={t('commentLabel')}
        value={note.comment} onChange={(e) => onChange({ ...note, comment: e.target.value })} />
    </div>
  )
}
