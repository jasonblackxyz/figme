import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App.tsx'
import { mountFigmiiApi } from '@features/agent-api/index.ts'
import { migrateFigmeToFigmii } from '@features/file-io/legacyMigration.ts'
import './styles/global.css'

await migrateFigmeToFigmii()
mountFigmiiApi()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
