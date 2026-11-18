import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { SessionProvider } from './features/auth/session'
import { getFlag, loadTheme } from './lib/prefs'
import { applyAccent, loadAccent } from './lib/accent'

document.documentElement.dataset.theme = loadTheme()
applyAccent(loadAccent())
document.documentElement.dataset.motion = getFlag('motion') ? 'on' : 'off'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SessionProvider>
      <App />
    </SessionProvider>
  </StrictMode>,
)
