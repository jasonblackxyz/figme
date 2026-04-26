import { describe, it, expect, beforeEach } from 'vitest'
import { useDocumentStore } from '../documentStore.ts'
import { createEmptyDocument } from '@primitives/document-model/operations.ts'
import type { SemanticRegion } from '@primitives/document-model/types.ts'

describe('documentStore', () => {
  beforeEach(() => {
    // Fully reset store state between tests
    useDocumentStore.setState({
      document: createEmptyDocument(),
      undoStack: [],
      redoStack: [],
    })
  })

  it('initializes with an empty document', () => {
    const { document } = useDocumentStore.getState()
    expect(document.name).toBe('Untitled')
    expect(document.pages).toHaveLength(1)
  })

  it('setDocument replaces the document', () => {
    const { setDocument, document } = useDocumentStore.getState()
    const newDoc = { ...document, name: 'Updated' }
    setDocument(newDoc)
    expect(useDocumentStore.getState().document.name).toBe('Updated')
  })

  it('undo/redo cycle works', () => {
    const store = useDocumentStore.getState()
    const original = store.document

    // Push undo checkpoint, then modify
    store.pushUndo()
    store.setDocument({ ...original, name: 'Version 2' })

    expect(useDocumentStore.getState().document.name).toBe('Version 2')

    // Undo
    useDocumentStore.getState().undo()
    expect(useDocumentStore.getState().document.name).toBe('Untitled')

    // Redo
    useDocumentStore.getState().redo()
    expect(useDocumentStore.getState().document.name).toBe('Version 2')
  })

  it('undo with empty stack does nothing', () => {
    const { document, undo } = useDocumentStore.getState()
    undo()
    expect(useDocumentStore.getState().document.name).toBe(document.name)
  })

  it('redo with empty stack does nothing', () => {
    const { document, redo } = useDocumentStore.getState()
    redo()
    expect(useDocumentStore.getState().document.name).toBe(document.name)
  })

  it('pushUndo clears redo stack', () => {
    const store = useDocumentStore.getState()
    const original = store.document

    // Create a redo entry
    store.pushUndo()
    store.setDocument({ ...original, name: 'V2' })
    store.pushUndo()
    store.setDocument({ ...original, name: 'V3' })
    useDocumentStore.getState().undo()
    expect(useDocumentStore.getState().redoStack).toHaveLength(1)

    // New pushUndo should clear redo
    useDocumentStore.getState().pushUndo()
    expect(useDocumentStore.getState().redoStack).toHaveLength(0)
  })

  it('undo stack limited to 50 entries', () => {
    const store = useDocumentStore.getState()
    for (let i = 0; i < 60; i++) {
      store.pushUndo()
      store.setDocument({ ...store.document, name: `V${i}` })
    }
    expect(useDocumentStore.getState().undoStack.length).toBeLessThanOrEqual(50)
  })

  it('appends imported documents as a single undoable action', () => {
    const store = useDocumentStore.getState()
    const imported = createEmptyDocument('Imported')
    const importedPage = {
      ...imported.pages[0]!,
      id: 'imported-page',
      name: 'Imported Page',
    }

    store.appendImportedDocuments([{
      ...imported,
      pages: [importedPage],
      activePageId: importedPage.id,
    }])

    expect(useDocumentStore.getState().document.pages).toHaveLength(2)
    expect(useDocumentStore.getState().undoStack).toHaveLength(1)

    useDocumentStore.getState().undo()
    expect(useDocumentStore.getState().document.pages).toHaveLength(1)
  })

  it('adds, updates, removes, and redoes regions through the undo stack', () => {
    const region: SemanticRegion = {
      id: 'region-submit',
      componentKind: 'button',
      semanticId: 'submit',
      shape: { rect: { col: 4, row: 5, width: 12, height: 3 } },
      interactions: [{ id: 'submitQuery', action: { kind: 'submitQuery', target: 'search' } }],
    }

    const store = useDocumentStore.getState()
    store.addRegion(region)
    expect(useDocumentStore.getState().document.pages[0]!.regions?.[region.id]).toEqual(region)
    expect(useDocumentStore.getState().undoStack).toHaveLength(1)

    useDocumentStore.getState().updateRegion(region.id, { componentKind: 'link', semanticId: 'submit-link' })
    expect(useDocumentStore.getState().document.pages[0]!.regions?.[region.id]?.componentKind).toBe('link')
    expect(useDocumentStore.getState().document.pages[0]!.regions?.[region.id]?.interactions).toEqual(region.interactions)

    useDocumentStore.getState().updateRegionShape(region.id, {
      rect: { col: 6, row: 7, width: 10, height: 2 },
      exclude: [{ col: 7, row: 7 }],
    })
    expect(useDocumentStore.getState().document.pages[0]!.regions?.[region.id]?.shape.exclude).toEqual([{ col: 7, row: 7 }])

    useDocumentStore.getState().removeRegion(region.id)
    expect(useDocumentStore.getState().document.pages[0]!.regions?.[region.id]).toBeUndefined()

    useDocumentStore.getState().undo()
    expect(useDocumentStore.getState().document.pages[0]!.regions?.[region.id]?.shape.exclude).toEqual([{ col: 7, row: 7 }])

    useDocumentStore.getState().redo()
    expect(useDocumentStore.getState().document.pages[0]!.regions?.[region.id]).toBeUndefined()
  })

  it('updates page and document runtime metadata with undo', () => {
    const store = useDocumentStore.getState()

    store.updateActivePageRuntime({ screenId: 'search', desktopBehavior: 'centered-mobile-canvas' })
    expect(useDocumentStore.getState().document.pages[0]!.runtime).toMatchObject({
      exportAsScreen: false,
      screenId: 'search',
      desktopBehavior: 'centered-mobile-canvas',
    })

    useDocumentStore.getState().updateDocumentRuntime({
      designFamily: 'starter-circuit',
      packageVersion: 'readme-design-package-v1',
    })
    expect(useDocumentStore.getState().document.runtime?.manifest).toMatchObject({
      family: 'starter-circuit',
      version: 'readme-design-package-v1',
    })

    useDocumentStore.getState().undo()
    expect(useDocumentStore.getState().document.runtime?.manifest?.family).toBeUndefined()
    expect(useDocumentStore.getState().document.pages[0]!.runtime?.screenId).toBe('search')
  })
})
