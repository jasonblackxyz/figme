import { describe, it, expect, beforeEach } from 'vitest'
import { useDocumentStore } from '../documentStore.ts'
import { createEmptyDocument } from '@primitives/document-model/operations.ts'

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
})
