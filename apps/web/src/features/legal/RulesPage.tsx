import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useI18n } from '../../i18n'

/** Règlement du concours : texte de `events.rules`, en français (non traduit en V1). */
export default function RulesPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const { t } = useI18n()
  const rules = useQuery({
    queryKey: ['rules', eventId],
    queryFn: async () => {
      const { data, error } = await supabase.from('events').select('rules').eq('id', eventId!).maybeSingle()
      if (error) throw error
      return data?.rules ?? null
    },
  })
  if (rules.isLoading) return <p role="status">{t('loading')}</p>
  return (
    <section className="box">
      <h2>{t('rules')}</h2>
      {rules.data ? <div className="rules" lang="fr">{rules.data}</div> : <p>{t('rulesEmpty')}</p>}
      <p><Link to={`/e/${eventId}`}>{t('back')}</Link></p>
    </section>
  )
}
