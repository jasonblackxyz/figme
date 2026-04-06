import type { ToolType } from '@stores/toolStore.ts';
import type { ToolHandler } from './types.ts';
import { selectTool } from './selectTool.ts';
import { handTool } from './handTool.ts';
import { borderBoxTool } from './borderBoxTool.ts';
import { dividerTool } from './dividerTool.ts';
import { textBlockTool } from './textBlockTool.ts';
import { figletTextTool } from './figletTextTool.ts';
import { drawTool } from './drawTool.ts';

const registry: Record<string, ToolHandler> = {
  select: selectTool,
  hand: handTool,
  'border-box': borderBoxTool,
  'divider': dividerTool,
  'text-block': textBlockTool,
  'figlet-text': figletTextTool,
  'draw': drawTool,
};

export function getToolHandler(tool: ToolType): ToolHandler {
  return registry[tool] ?? selectTool;
}
