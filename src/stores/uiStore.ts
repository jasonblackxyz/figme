import { create } from 'zustand';

interface UiState {
  selectedLayerIds: string[];
  hoveredLayerId: string | null;
  layersPanelOpen: boolean;
  propertiesPanelOpen: boolean;
  specViewOpen: boolean;
  exportDialogOpen: boolean;
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
  agentBriefingMode: 'full' | 'raw';
  setSelectedLayers: (ids: string[]) => void;
  setHoveredLayer: (id: string | null) => void;
  toggleLayersPanel: () => void;
  togglePropertiesPanel: () => void;
  toggleSpecView: () => void;
  toggleExportDialog: () => void;
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
  setAgentBriefingMode: (mode: 'full' | 'raw') => void;
  toggleAgentBriefingMode: () => void;
  collapsedGroupIds: string[];
  toggleGroupCollapsed: (id: string) => void;
  isGroupCollapsed: (id: string) => boolean;
}

export const useUiStore = create<UiState>((set, get) => ({
  selectedLayerIds: [],
  hoveredLayerId: null,
  layersPanelOpen: true,
  propertiesPanelOpen: true,
  specViewOpen: false,
  exportDialogOpen: false,
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
  agentBriefingMode: 'full' as 'full' | 'raw',

  setSelectedLayers: (ids: string[]) => set({ selectedLayerIds: ids }),
  setHoveredLayer: (id: string | null) => set({ hoveredLayerId: id }),
  toggleLayersPanel: () =>
    set((s) => ({ layersPanelOpen: !s.layersPanelOpen })),
  togglePropertiesPanel: () =>
    set((s) => ({ propertiesPanelOpen: !s.propertiesPanelOpen })),
  toggleSpecView: () => set((s) => ({ specViewOpen: !s.specViewOpen })),
  toggleExportDialog: () => set((s) => ({ exportDialogOpen: !s.exportDialogOpen })),
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
  setAgentBriefingMode: (mode: 'full' | 'raw') => set({ agentBriefingMode: mode }),
  toggleAgentBriefingMode: () =>
    set((s) => ({ agentBriefingMode: s.agentBriefingMode === 'full' ? 'raw' : 'full' })),
  collapsedGroupIds: [],
  toggleGroupCollapsed: (id: string) =>
    set((s) => ({
      collapsedGroupIds: s.collapsedGroupIds.includes(id)
        ? s.collapsedGroupIds.filter((gid) => gid !== id)
        : [...s.collapsedGroupIds, id],
    })),
  isGroupCollapsed: (id: string) => get().collapsedGroupIds.includes(id),
}));
