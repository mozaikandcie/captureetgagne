import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nProvider } from './i18n'
import Layout from './features/accessibilite/Layout'
import ParticipantArea from './features/participant/ParticipantArea'
import HomePage from './features/participant/HomePage'
import GalleryPage from './features/participant/GalleryPage'
import MePage from './features/participant/MePage'
import ChallengesPage from './features/defis/ChallengesPage'
import DataPage from './features/legal/DataPage'
import RulesPage from './features/legal/RulesPage'

// Écrans réservés à l'organisation : chargés à la demande pour alléger le parcours des participants.
const JurySpace = lazy(() => import('./features/jury/JurySpace'))
const OrgSpace = lazy(() => import('./features/jury/OrgSpace'))
const WallPage = lazy(() => import('./features/mur/WallPage'))
const CeremonyPage = lazy(() => import('./features/remise-prix/CeremonyPage'))

const queryClient = new QueryClient()

/** Anciennes adresses « contenus » et « notifications » : tout est maintenant dans « Moi ». */
function ToMe() {
  const { eventId } = useParams()
  return <Navigate to={`/e/${eventId}/moi`} replace />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <BrowserRouter>
          <Suspense fallback={<main className="page"><p role="status">…</p></main>}>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/e/:eventId" element={<ParticipantArea />}>
                  <Route index element={<HomePage />} />
                  <Route path="defis" element={<ChallengesPage />} />
                  <Route path="galerie" element={<GalleryPage />} />
                  <Route path="moi" element={<MePage />} />
                  <Route path="contenus" element={<ToMe />} />
                  <Route path="notifications" element={<ToMe />} />
                  <Route path="reglement" element={<RulesPage />} />
                </Route>
                <Route path="/jury/:eventId" element={<JurySpace />} />
                <Route path="/organisation/:eventId" element={<OrgSpace />} />
                <Route path="/donnees-personnelles" element={<DataPage />} />
                <Route path="*" element={<main className="page"><h1>Capture et Gagne</h1></main>} />
              </Route>
              {/* Écrans projetés : plein écran, sans cadre ni pied de page */}
              <Route path="/jury/:eventId/mur" element={<WallPage />} />
              <Route path="/organisation/:eventId/mur" element={<WallPage />} />
              <Route path="/organisation/:eventId/remise" element={<CeremonyPage />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </I18nProvider>
    </QueryClientProvider>
  )
}
