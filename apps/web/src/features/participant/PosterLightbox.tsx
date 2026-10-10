import { useI18n } from '../../i18n'
import { useDialog } from '../../components/useDialog'

/** Affiche en grand : focus dans la fenêtre, Échap ou clic à côté pour fermer, retour du focus au bouton d'origine. */
export default function PosterLightbox({ src, title, onClose }: { src: string; title: string; onClose: () => void }) {
  const { t } = useI18n()
  const ref = useDialog<HTMLDivElement>(onClose)
  return (
    <div className="lb" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="lb-in" ref={ref} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
        <img src={src} alt={title} />
        <button type="button" className="btn small ghost" data-autofocus onClick={onClose}>{t('close')}</button>
      </div>
    </div>
  )
}
