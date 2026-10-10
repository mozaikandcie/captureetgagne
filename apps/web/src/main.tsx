import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './lib/install'
import App from './App.tsx'
import { initQueue } from './features/envois/queue'

void initQueue().catch((e) => console.error('File d\'envois indisponible', e))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
