import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { WorkspaceScreen } from '@/pages/workspace'
import { Boundary } from './Boundary'
import { Toaster } from '@/shared/ui/sonner'
import './styles/global.css'

window.addEventListener('unhandledrejection', (event) => {
  console.error('[zetrem] a promise was dropped', event.reason)
})

const root = document.getElementById('root')
if (!root) throw new Error('#root not found')

createRoot(root).render(
  <StrictMode>
    <Boundary>
      <WorkspaceScreen />
      <Toaster position="bottom-right" richColors closeButton />
    </Boundary>
  </StrictMode>,
)
