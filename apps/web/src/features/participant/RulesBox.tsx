import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useI18n } from '../../i18n'

/** Règlement repliable (texte de `events.rules`, en français non traduit en V1). */
export default function RulesBox({ eventId }: { eventId: string }) {
  const { t, lang } = useI18n()
  const rules = useQuery({
    queryKey: ['rules', eventId],
    queryFn: async () => {
      const { data, error } = await supabase.from('events').select('rules').eq('id', eventId).maybeSingle()
      if (error) throw error
      return data?.rules ?? null
    },
  })
  return (
    <details className="box rules">
      <summary><h2>{t('rules')}</h2></summary>
      {lang !== 'fr' && t('rulesFrOnly') && <p className="help">{t('rulesFrOnly')}</p>}
      <div className="rtext" lang="fr">{rules.data ?? t('rulesEmpty')}</div>
    </details>
  )
}
