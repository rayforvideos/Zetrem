import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { WorkspaceScreen } from '@/pages/workspace'
import './styles/global.css'

const root = document.getElementById('root')
if (!root) throw new Error('#root 를 찾지 못했다')

createRoot(root).render(
  <StrictMode>
    <WorkspaceScreen />
  </StrictMode>,
)
