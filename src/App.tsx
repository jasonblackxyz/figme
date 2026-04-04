import styles from './styles/layout.module.css'

export function App() {
  return (
    <div className={styles.shell}>
      <header className={styles.toolbar}>
        {/* T4: Toolbar */}
      </header>
      <aside className={styles.layersPanel}>
        {/* T2: Layers Panel */}
      </aside>
      <main className={styles.canvas}>
        {/* T1: Canvas & Viewport */}
      </main>
      <aside className={styles.propertiesPanel}>
        {/* T3: Properties Panel */}
      </aside>
      <footer className={styles.statusBar}>
        {/* Status bar: cursor position, zoom, grid dimensions */}
      </footer>
    </div>
  )
}
