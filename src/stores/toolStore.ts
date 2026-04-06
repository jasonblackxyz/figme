import { create } from 'zustand';

export type ToolType =
  | 'select'
  | 'border-box'
  | 'text-block'
  | 'figlet-text'
  | 'divider'
  | 'image'
  | 'edge-path'
  | 'hand'
  | 'draw';

interface ToolState {
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
}

export const useToolStore = create<ToolState>((set) => ({
  activeTool: 'select',
  setActiveTool: (tool: ToolType) => set({ activeTool: tool }),
}));
