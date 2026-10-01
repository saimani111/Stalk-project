import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'

// Auto-updates the service worker when a new build ships
registerSW({ immediate: true })

// Capture the install prompt before React mounts so it is never missed
window.__stalkBip = null
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  window.__stalkBip = e
  window.dispatchEvent(new Event('stalk-install-available'))
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
