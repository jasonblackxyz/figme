import { describe, it, expect } from 'vitest'
import {
  createEmptyDocument,
  createEmptyPage,
  addLayer,
  removeLayer,
  updateLayer,
  moveLayer,
  reorderLayers,
  addPage,
  removePage,
  setActivePage,
  createComponent,
} from '../operations.ts'
// Types imported as needed via function return types

describe('createEmptyDocument', () => {
  it('creates a document with default config', () => {
    const doc = createEmptyDocument()
    expect(doc.name).toBe('Untitled')
    expect(doc.gridConfig.fontFamily).toContain('IBM Plex Mono')
    expect(doc.gridConfig.fontSize).toBe(14)
    expect(doc.gridConfig.canvasCols).toBe(228)
    expect(doc.gridConfig.canvasRows).toBe(57)
    expect(doc.pages).toHaveLength(1)
    expect(doc.activePageId).toBe(doc.pages[0]!.id)
    expect(doc.metadata.version).toBe(1)
  })

  it('accepts custom name', () => {
    const doc = createEmptyDocument('My Design')
    expect(doc.name).toBe('My Design')
  })

  it('palette covers all style keys', () => {
    const doc = createEmptyDocument()
    expect(doc.palette.bg).toBeDefined()
    expect(doc.palette.bg.bg).toBe('#faf6ef')
    expect(doc.palette.modalBorder).toBeDefined()
    expect(doc.palette.ghostBlob).toBeDefined()
  })
})

describe('createEmptyPage', () => {
  it('creates a page with a Background layer', () => {
    const page = createEmptyPage('Test Page')
    expect(page.name).toBe('Test Page')
    expect(Object.keys(page.layers)).toHaveLength(1)
    expect(page.layerOrder).toHaveLength(1)
    const bgLayer = page.layers[page.layerOrder[0]!]!
    expect(bgLayer.kind).toBe('group')
    expect(bgLayer.isBackground).toBe(true)
    expect(bgLayer.name).toBe('Background')
  })
})

describe('addLayer', () => {
  it('adds a layer to a page', () => {
    const page = createEmptyPage('Test')
    const updated = addLayer(
      page,
      'border-box',
      'My Box',
      { col: 5, row: 3, width: 20, height: 10 },
      'border',
      { borderStyle: 'rounded', padding: { top: 1, right: 1, bottom: 1, left: 1 } },
    )
    expect(Object.keys(updated.layers)).toHaveLength(2) // Background + new layer
    expect(updated.layerOrder).toHaveLength(2)
    const layerId = updated.layerOrder[updated.layerOrder.length - 1]!
    expect(updated.layers[layerId]!.name).toBe('My Box')
    expect(updated.layers[layerId]!.kind).toBe('border-box')
    expect(updated.layers[layerId]!.visible).toBe(true)
  })

  it('does not mutate the original page', () => {
    const page = createEmptyPage('Test')
    addLayer(page, 'divider', 'Div', { col: 0, row: 0, width: 10, height: 1 }, 'border', {})
    expect(Object.keys(page.layers)).toHaveLength(1) // Only Background
  })
})

describe('removeLayer', () => {
  it('removes a layer by ID', () => {
    let page = createEmptyPage('Test')
    page = addLayer(page, 'divider', 'Div', { col: 0, row: 0, width: 10, height: 1 }, 'border', {})
    const layerId = page.layerOrder[page.layerOrder.length - 1]!
    const updated = removeLayer(page, layerId)
    expect(Object.keys(updated.layers)).toHaveLength(1) // Background remains
    expect(updated.layerOrder).toHaveLength(1)
  })

  it('does nothing for non-existent ID', () => {
    const page = createEmptyPage('Test')
    const updated = removeLayer(page, 'nonexistent')
    expect(updated.layerOrder).toHaveLength(1) // Background
  })
})

describe('updateLayer', () => {
  it('updates layer properties', () => {
    let page = createEmptyPage('Test')
    page = addLayer(page, 'text-block', 'Text', { col: 0, row: 0, width: 20, height: 5 }, 'text', {
      content: 'Hello',
      fontFamily: 'monospace',
      kerning: 0,
      lineSpacing: 0,
      alignment: 'left',
      styleKey: 'text',
    })
    const layerId = page.layerOrder[page.layerOrder.length - 1]!
    const updated = updateLayer(page, layerId, { name: 'Renamed', opacity: 0.5 })
    expect(updated.layers[layerId]!.name).toBe('Renamed')
    expect(updated.layers[layerId]!.opacity).toBe(0.5)
    // Unchanged fields preserved
    expect(updated.layers[layerId]!.kind).toBe('text-block')
  })
})

describe('moveLayer', () => {
  it('moves a layer to new coordinates', () => {
    let page = createEmptyPage('Test')
    page = addLayer(page, 'divider', 'Div', { col: 0, row: 0, width: 10, height: 1 }, 'border', {})
    const layerId = page.layerOrder[page.layerOrder.length - 1]!
    const updated = moveLayer(page, layerId, 15, 20)
    expect(updated.layers[layerId]!.rect.col).toBe(15)
    expect(updated.layers[layerId]!.rect.row).toBe(20)
    // Width/height unchanged
    expect(updated.layers[layerId]!.rect.width).toBe(10)
  })
})

describe('reorderLayers', () => {
  it('changes layer z-order', () => {
    let page = createEmptyPage('Test')
    page = addLayer(page, 'divider', 'A', { col: 0, row: 0, width: 10, height: 1 }, 'border', {})
    page = addLayer(page, 'divider', 'B', { col: 0, row: 2, width: 10, height: 1 }, 'border', {})
    const [bg, a, b] = page.layerOrder
    const updated = reorderLayers(page, [bg!, b!, a!])
    expect(updated.layerOrder[1]).toBe(b)
    expect(updated.layerOrder[2]).toBe(a)
  })
})

describe('page operations', () => {
  it('addPage adds a new page', () => {
    const doc = createEmptyDocument()
    const updated = addPage(doc, 'Page 2')
    expect(updated.pages).toHaveLength(2)
    expect(updated.pages[1]!.name).toBe('Page 2')
  })

  it('removePage removes a page', () => {
    let doc = createEmptyDocument()
    doc = addPage(doc, 'Page 2')
    const pageId = doc.pages[1]!.id
    const updated = removePage(doc, pageId)
    expect(updated.pages).toHaveLength(1)
  })

  it('removePage updates activePageId if active page is removed', () => {
    let doc = createEmptyDocument()
    doc = addPage(doc, 'Page 2')
    const activeId = doc.activePageId
    const updated = removePage(doc, activeId)
    expect(updated.activePageId).not.toBe(activeId)
    expect(updated.activePageId).toBe(updated.pages[0]!.id)
  })

  it('setActivePage changes active page', () => {
    let doc = createEmptyDocument()
    doc = addPage(doc, 'Page 2')
    const page2Id = doc.pages[1]!.id
    const updated = setActivePage(doc, page2Id)
    expect(updated.activePageId).toBe(page2Id)
  })
})

describe('component operations', () => {
  it('createComponent adds a component', () => {
    const doc = createEmptyDocument()
    const updated = createComponent(doc, 'My Component', 'A test component', ['layer1'])
    const compIds = Object.keys(updated.components)
    expect(compIds).toHaveLength(1)
    const comp = updated.components[compIds[0]!]!
    expect(comp.name).toBe('My Component')
    expect(comp.sourceLayerIds).toEqual(['layer1'])
  })
})

describe('JSON roundtrip', () => {
  it('serializes and deserializes without data loss', () => {
    let doc = createEmptyDocument('Roundtrip Test')
    const page = doc.pages[0]!
    const updatedPage = addLayer(
      page, 'border-box', 'Box', { col: 0, row: 0, width: 10, height: 5 }, 'border',
      { borderStyle: 'rounded', padding: { top: 1, right: 1, bottom: 1, left: 1 } },
    )
    doc = { ...doc, pages: [updatedPage] }

    const json = JSON.stringify(doc)
    const parsed = JSON.parse(json) as typeof doc
    expect(parsed.name).toBe('Roundtrip Test')
    expect(Object.keys(parsed.pages[0]!.layers)).toHaveLength(2) // Background + Box
    const layerId = parsed.pages[0]!.layerOrder[parsed.pages[0]!.layerOrder.length - 1]!
    expect(parsed.pages[0]!.layers[layerId]!.kind).toBe('border-box')
  })
})
