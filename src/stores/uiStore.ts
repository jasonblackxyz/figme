import { create } from 'zustand';
import type { InterfaceMode } from '@stores/toolStore.ts';

interface UiState {
  selectedLayerIds: string[];
  selectedRuntimeAnnotationId: string | null;
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
  setSelectedLayers: (ids: string[]) => void;
  setSelectedRuntimeAnnotation: (id: string | null) => void;
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

  setSelectedLayers: (ids: string[]) => set({ selectedLayerIds: ids }),
  setSelectedRuntimeAnnotation: (id: string | null) => set({ selectedRuntimeAnnotationId: id }),
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
