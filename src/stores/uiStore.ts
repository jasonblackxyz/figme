import { create } from 'zustand';

interface UiState {
  selectedLayerIds: string[];
  hoveredLayerId: string | null;
  layersPanelOpen: boolean;
  propertiesPanelOpen: boolean;
  specViewOpen: boolean;
  setSelectedLayers: (ids: string[]) => void;
  setHoveredLayer: (id: string | null) => void;
  toggleLayersPanel: () => void;
  togglePropertiesPanel: () => void;
  toggleSpecView: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  selectedLayerIds: [],
  hoveredLayerId: null,
  layersPanelOpen: true,
  propertiesPanelOpen: true,
  specViewOpen: false,

  setSelectedLayers: (ids: string[]) => set({ selectedLayerIds: ids }),
  setHoveredLayer: (id: string | null) => set({ hoveredLayerId: id }),
  toggleLayersPanel: () =>
    set((s) => ({ layersPanelOpen: !s.layersPanelOpen })),
  togglePropertiesPanel: () =>
    set((s) => ({ propertiesPanelOpen: !s.propertiesPanelOpen })),
  toggleSpecView: () => set((s) => ({ specViewOpen: !s.specViewOpen })),
}));
