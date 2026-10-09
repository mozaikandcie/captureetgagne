import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nProvider } from './i18n'
import JoinPage from './features/inscription/JoinPage'
import ChallengesPage from './features/defis/ChallengesPage'
import JuryPage from './features/moderation/JuryPage'
import NotificationsPage from './features/notifications/NotificationsPage'
import WallPage from './features/mur/WallPage'
import CeremonyPage from './features/remise-prix/CeremonyPage'
import MyContentPage from './features/envois/MyContentPage'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/e/:eventId" element={<JoinPage />} />
            <Route path="/e/:eventId/defis" element={<ChallengesPage />} />
            <Route path="/e/:eventId/contenus" element={<MyContentPage />} />
            <Route path="/e/:eventId/notifications" element={<NotificationsPage />} />
            <Route path="/jury/:eventId" element={<JuryPage />} />
            <Route path="/jury/:eventId/mur" element={<WallPage />} />
            <Route path="/jury/:eventId/remise" element={<CeremonyPage />} />
            <Route path="*" element={<main className="page"><h1>Capture et Gagne</h1></main>} />
          </Routes>
        </BrowserRouter>
      </I18nProvider>
    </QueryClientProvider>
  )
}
