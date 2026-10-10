import { useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { useI18n } from '../../i18n'
import InstallBox from '../../components/InstallBox'
import Onboarding from '../inscription/Onboarding'
import BadgesBox from './BadgesBox'
import MineBox from './MineBox'
import MyBox from './MyBox'
import RulesBox from './RulesBox'
import type { ParticipantCtx } from './data'

/** « Moi » : classement, mes contenus, règlement, présentation et accès à l'espace organisation. */
export default function MePage() {
  const ctx = useOutletContext<ParticipantCtx>()
  const { t } = useI18n()
  const [intro, setIntro] = useState(false)
  return (
    <>
      <MyBox ctx={ctx} />
      <BadgesBox participantId={ctx.me.id} />
      <MineBox ctx={ctx} />
      <InstallBox />
      <RulesBox eventId={ctx.event.id} />
      <p className="orglink">
        <button type="button" className="link" onClick={() => setIntro(true)}>{t('obAgain')}</button>
        {' · '}
        <Link to={`/jury/${ctx.event.id}`}>{t('orgLink')}</Link>
      </p>
      {intro && <Onboarding onClose={() => setIntro(false)} />}
    </>
  )
}
