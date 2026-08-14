import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { WorkspaceScreen } from '@/pages/workspace'
import { Boundary } from './Boundary'
import './styles/global.css'

const root = document.getElementById('root')
if (!root) throw new Error('#root not found')

createRoot(root).render(
  <StrictMode>
    <Boundary>
      <WorkspaceScreen />
    </Boundary>
  </StrictMode>,
)
