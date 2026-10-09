import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nProvider } from './i18n'
import Layout from './features/accessibilite/Layout'
import JoinPage from './features/inscription/JoinPage'
import ChallengesPage from './features/defis/ChallengesPage'
import MyContentPage from './features/envois/MyContentPage'
import NotificationsPage from './features/notifications/NotificationsPage'
import DataPage from './features/legal/DataPage'
import RulesPage from './features/legal/RulesPage'

// Écrans réservés à l'organisation : chargés à la demande pour alléger le parcours des participants.
const JuryPage = lazy(() => import('./features/moderation/JuryPage'))
const WallPage = lazy(() => import('./features/mur/WallPage'))
const CeremonyPage = lazy(() => import('./features/remise-prix/CeremonyPage'))

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <BrowserRouter>
          <Suspense fallback={<main className="page"><p role="status">…</p></main>}>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/e/:eventId" element={<JoinPage />} />
                <Route path="/e/:eventId/defis" element={<ChallengesPage />} />
                <Route path="/e/:eventId/contenus" element={<MyContentPage />} />
                <Route path="/e/:eventId/notifications" element={<NotificationsPage />} />
                <Route path="/e/:eventId/reglement" element={<RulesPage />} />
                <Route path="/jury/:eventId" element={<JuryPage />} />
                <Route path="/donnees-personnelles" element={<DataPage />} />
                <Route path="*" element={<main className="page"><h1>Capture et Gagne</h1></main>} />
              </Route>
              {/* Écrans projetés : plein écran, sans cadre ni pied de page */}
              <Route path="/jury/:eventId/mur" element={<WallPage />} />
              <Route path="/jury/:eventId/remise" element={<CeremonyPage />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </I18nProvider>
    </QueryClientProvider>
  )
}
