import { create } from 'zustand';

export type InterfaceMode = 'ai' | 'human';

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

const AI_HIDDEN_TOOLS: ReadonlySet<ToolType> = new Set([
  'border-box',
  'divider',
  'text-block',
  'figlet-text',
  'draw',
]);

export function isToolAllowedInInterfaceMode(tool: ToolType, mode: InterfaceMode): boolean {
  return mode === 'human' || !AI_HIDDEN_TOOLS.has(tool);
}

interface ToolState {
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
}

export const useToolStore = create<ToolState>((set) => ({
  activeTool: 'select',
  setActiveTool: (tool: ToolType) => set({ activeTool: tool }),
}));
