import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './lib/install'
import App from './App.tsx'
import * as queue from './features/envois/queue'
import { supabase } from './lib/supabase'

// Accès de test (développement seulement) : les scripts de vérification pilotent la même file que l'application.
if (import.meta.env.DEV) (window as unknown as { __cg: unknown }).__cg = { queue, supabase }

void queue.initQueue().catch((e) => console.error('File d\'envois indisponible', e))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
