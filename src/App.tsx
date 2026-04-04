import styles from './styles/layout.module.css'
import { useDocumentStore } from '@stores/documentStore.ts'
import { useUiStore } from '@stores/uiStore.ts'
import { useViewportStore } from '@stores/viewportStore.ts'
import { createAsciiPalette } from '@primitives/style-system/palette.ts'
import { AgentBriefing } from '@renderer/AgentBriefing.tsx'
import { GridRenderer } from '@renderer/GridRenderer.tsx'
import { SpecView } from '@renderer/SpecView.tsx'
import { useComposedBuffer } from '@hooks/useComposedBuffer.ts'
import { useConsoleLogger } from '@hooks/useConsoleLogger.ts'
import { useMemo } from 'react'

export function App() {
  const document = useDocumentStore((s) => s.document)
  const selectedLayerIds = useUiStore((s) => s.selectedLayerIds)
  const specViewOpen = useUiStore((s) => s.specViewOpen)
  const zoom = useViewportStore((s) => s.zoom)
  const panX = useViewportStore((s) => s.panX)
  const panY = useViewportStore((s) => s.panY)

  const buffer = useComposedBuffer()
  const palette = useMemo(() => createAsciiPalette({
    name: 'default',
    colors: {
      background: '#1e1e2e',
      foreground: '#e0e0f0',
      accent: '#7aa2f7',
      accentForeground: '#ffffff',
      muted: '#444466',
      mutedForeground: '#8888aa',
      border: '#555577',
      card: '#2a2a3e',
      cardForeground: '#c0c0d0',
      error: '#b04040',
      success: '#40b070',
    },
  }), [])

  useConsoleLogger()

  return (
    <div
      id="app-root"
      className={styles.shell}
      aria-describedby="figme-agent-briefing"
    >
      <AgentBriefing document={document} />
      <header className={styles.toolbar}>
        {/* T4: Toolbar */}
      </header>
      <aside className={styles.layersPanel}>
        {/* T2: Layers Panel */}
      </aside>
      <main className={styles.canvas}>
        <GridRenderer
          buffer={buffer}
          palette={palette}
          selectedLayerIds={selectedLayerIds}
          zoom={zoom}
          scrollCol={Math.round(panX / document.gridConfig.cellWidth)}
          scrollRow={Math.round(panY / document.gridConfig.cellHeight)}
        />
      </main>
      <aside className={styles.propertiesPanel}>
        {/* T3: Properties Panel */}
      </aside>
      <footer className={styles.statusBar}>
        {/* Status bar: cursor position, zoom, grid dimensions */}
      </footer>
      {specViewOpen && (
        <SpecView document={document} selectedLayerIds={selectedLayerIds} />
      )}
    </div>
  )
}
