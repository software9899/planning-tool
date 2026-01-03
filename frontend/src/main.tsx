import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './css/theme.css'
import './css/styles.css'
import './css/timeline.css'
import './react-overrides.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
