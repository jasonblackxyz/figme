import { create } from 'zustand';
import type { InterfaceMode } from '@stores/toolStore.ts';
import type { GridRect, GridPosition } from '@primitives/grid-engine/types.ts';

export type CanvasSelectionMode = 'layers' | 'regions';

export type RegionPaintMode = 'add' | 'erase';

export interface LabelPickerState {
  open: boolean;
  rect: GridRect | null;
  exclude: GridPosition[];
  editingRegionId: string | null;
}

interface UiState {
  selectedLayerIds: string[];
  selectedRuntimeAnnotationId: string | null;
  selectedRegionId: string | null;
  hoveredLayerId: string | null;
  interfaceMode: InterfaceMode;
  layersPanelOpen: boolean;
  propertiesPanelOpen: boolean;
  specViewOpen: boolean;
  exportDialogOpen: boolean;
  importDialogOpen: boolean;
  clearCanvasDialogOpen: boolean;
  isDragging: boolean;
  dragStartPos: { col: number; row: number } | null;
  marqueeRect: { col: number; row: number; width: number; height: number } | null;
  drawingPreview: { rect: { col: number; row: number; width: number; height: number }; kind: string } | null;
  editingLayerId: string | null;
  smartGuidesEnabled: boolean;
  activeColor: string;
  openColorPickerId: string | null;
  brushSize: 1 | 2 | 3;
  eraserMode: boolean;
  // Region labeling
  canvasSelectionMode: CanvasSelectionMode;
  regionOverlayVisible: boolean;
  regionPaintMode: RegionPaintMode;
  regionPaintStaysActive: boolean;
  regionDraftCells: Set<string>;
  regionDraftTargetId: string | null;
  labelPicker: LabelPickerState;
  setSelectedLayers: (ids: string[]) => void;
  setSelectedRuntimeAnnotation: (id: string | null) => void;
  setSelectedRegion: (id: string | null) => void;
  setCanvasSelectionMode: (mode: CanvasSelectionMode) => void;
  toggleCanvasSelectionMode: () => void;
  setRegionOverlayVisible: (visible: boolean) => void;
  toggleRegionOverlay: () => void;
  setRegionPaintMode: (mode: RegionPaintMode) => void;
  toggleRegionPaintMode: () => void;
  setRegionPaintStaysActive: (v: boolean) => void;
  beginRegionDraft: (targetRegionId: string | null, seedCells?: GridPosition[]) => void;
  addRegionDraftCells: (cells: GridPosition[]) => void;
  removeRegionDraftCells: (cells: GridPosition[]) => void;
  clearRegionDraft: () => void;
  openLabelPicker: (input: { rect: GridRect; exclude?: GridPosition[]; editingRegionId?: string | null }) => void;
  closeLabelPicker: () => void;
  setHoveredLayer: (id: string | null) => void;
  setInterfaceMode: (mode: InterfaceMode) => void;
  toggleInterfaceMode: () => void;
  toggleLayersPanel: () => void;
  togglePropertiesPanel: () => void;
  toggleSpecView: () => void;
  setExportDialogOpen: (open: boolean) => void;
  toggleExportDialog: () => void;
  setImportDialogOpen: (open: boolean) => void;
  toggleImportDialog: () => void;
  toggleClearCanvasDialog: () => void;
  setIsDragging: (v: boolean) => void;
  setDragStartPos: (pos: { col: number; row: number } | null) => void;
  setMarqueeRect: (rect: { col: number; row: number; width: number; height: number } | null) => void;
  setDrawingPreview: (preview: { rect: { col: number; row: number; width: number; height: number }; kind: string } | null) => void;
  setEditingLayerId: (id: string | null) => void;
  toggleSmartGuides: () => void;
  setActiveColor: (hex: string) => void;
  setOpenColorPickerId: (id: string | null) => void;
  setBrushSize: (size: 1 | 2 | 3) => void;
  setEraserMode: (v: boolean) => void;
  collapsedGroupIds: string[];
  toggleGroupCollapsed: (id: string) => void;
  isGroupCollapsed: (id: string) => boolean;
}

export const useUiStore = create<UiState>((set, get) => ({
  selectedLayerIds: [],
  selectedRuntimeAnnotationId: null,
  selectedRegionId: null,
  hoveredLayerId: null,
  interfaceMode: 'ai',
  layersPanelOpen: true,
  propertiesPanelOpen: true,
  specViewOpen: false,
  exportDialogOpen: false,
  importDialogOpen: false,
  clearCanvasDialogOpen: false,
  isDragging: false,
  dragStartPos: null,
  marqueeRect: null,
  drawingPreview: null,
  editingLayerId: null,
  smartGuidesEnabled: true,
  activeColor: '#ffffff',
  openColorPickerId: null,
  brushSize: 1 as 1 | 2 | 3,
  eraserMode: false,
  canvasSelectionMode: 'layers',
  regionOverlayVisible: true,
  regionPaintMode: 'add',
  regionPaintStaysActive: false,
  regionDraftCells: new Set<string>(),
  regionDraftTargetId: null,
  labelPicker: { open: false, rect: null, exclude: [], editingRegionId: null },

  setSelectedLayers: (ids: string[]) => set({ selectedLayerIds: ids }),
  setSelectedRuntimeAnnotation: (id: string | null) => set({ selectedRuntimeAnnotationId: id }),
  setSelectedRegion: (id: string | null) => set({ selectedRegionId: id }),
  setCanvasSelectionMode: (mode: CanvasSelectionMode) =>
    set({ canvasSelectionMode: mode, selectedRegionId: mode === 'layers' ? null : get().selectedRegionId }),
  toggleCanvasSelectionMode: () =>
    set((s) => ({
      canvasSelectionMode: s.canvasSelectionMode === 'layers' ? 'regions' : 'layers',
      selectedRegionId: s.canvasSelectionMode === 'regions' ? null : s.selectedRegionId,
    })),
  setRegionOverlayVisible: (visible: boolean) => set({ regionOverlayVisible: visible }),
  toggleRegionOverlay: () => set((s) => ({ regionOverlayVisible: !s.regionOverlayVisible })),
  setRegionPaintMode: (mode: RegionPaintMode) => set({ regionPaintMode: mode }),
  toggleRegionPaintMode: () =>
    set((s) => ({ regionPaintMode: s.regionPaintMode === 'add' ? 'erase' : 'add' })),
  setRegionPaintStaysActive: (v: boolean) => set({ regionPaintStaysActive: v }),
  beginRegionDraft: (targetRegionId: string | null, seedCells?: GridPosition[]) => {
    const next = new Set<string>();
    if (seedCells) {
      for (const cell of seedCells) next.add(`${cell.row},${cell.col}`);
    }
    set({ regionDraftCells: next, regionDraftTargetId: targetRegionId });
  },
  addRegionDraftCells: (cells: GridPosition[]) => {
    if (cells.length === 0) return;
    const next = new Set(get().regionDraftCells);
    for (const cell of cells) next.add(`${cell.row},${cell.col}`);
    set({ regionDraftCells: next });
  },
  removeRegionDraftCells: (cells: GridPosition[]) => {
    if (cells.length === 0) return;
    const next = new Set(get().regionDraftCells);
    for (const cell of cells) next.delete(`${cell.row},${cell.col}`);
    set({ regionDraftCells: next });
  },
  clearRegionDraft: () => set({ regionDraftCells: new Set<string>(), regionDraftTargetId: null }),
  openLabelPicker: (input) =>
    set({
      labelPicker: {
        open: true,
        rect: input.rect,
        exclude: input.exclude ?? [],
        editingRegionId: input.editingRegionId ?? null,
      },
    }),
  closeLabelPicker: () =>
    set({ labelPicker: { open: false, rect: null, exclude: [], editingRegionId: null } }),
  setHoveredLayer: (id: string | null) => set({ hoveredLayerId: id }),
  setInterfaceMode: (mode: InterfaceMode) => set({ interfaceMode: mode }),
  toggleInterfaceMode: () =>
    set((s) => ({ interfaceMode: s.interfaceMode === 'ai' ? 'human' : 'ai' })),
  toggleLayersPanel: () =>
    set((s) => ({ layersPanelOpen: !s.layersPanelOpen })),
  togglePropertiesPanel: () =>
    set((s) => ({ propertiesPanelOpen: !s.propertiesPanelOpen })),
  toggleSpecView: () => set((s) => ({ specViewOpen: !s.specViewOpen })),
  setExportDialogOpen: (open: boolean) => set({ exportDialogOpen: open }),
  toggleExportDialog: () => set((s) => ({ exportDialogOpen: !s.exportDialogOpen })),
  setImportDialogOpen: (open: boolean) => set({ importDialogOpen: open }),
  toggleImportDialog: () => set((s) => ({ importDialogOpen: !s.importDialogOpen })),
  toggleClearCanvasDialog: () => set((s) => ({ clearCanvasDialogOpen: !s.clearCanvasDialogOpen })),
  setIsDragging: (v: boolean) => set({ isDragging: v }),
  setDragStartPos: (pos: { col: number; row: number } | null) => set({ dragStartPos: pos }),
  setMarqueeRect: (rect: { col: number; row: number; width: number; height: number } | null) => set({ marqueeRect: rect }),
  setDrawingPreview: (preview: { rect: { col: number; row: number; width: number; height: number }; kind: string } | null) => set({ drawingPreview: preview }),
  setEditingLayerId: (id: string | null) => set({ editingLayerId: id }),
  toggleSmartGuides: () => set((s) => ({ smartGuidesEnabled: !s.smartGuidesEnabled })),
  setActiveColor: (hex: string) => set({ activeColor: hex }),
  setOpenColorPickerId: (id: string | null) => set({ openColorPickerId: id }),
  setBrushSize: (size: 1 | 2 | 3) => set({ brushSize: size }),
  setEraserMode: (v: boolean) => set({ eraserMode: v }),
  collapsedGroupIds: [],
  toggleGroupCollapsed: (id: string) =>
    set((s) => ({
      collapsedGroupIds: s.collapsedGroupIds.includes(id)
        ? s.collapsedGroupIds.filter((gid) => gid !== id)
        : [...s.collapsedGroupIds, id],
    })),
  isGroupCollapsed: (id: string) => get().collapsedGroupIds.includes(id),
}));
