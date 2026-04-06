import { useToolStore } from '@stores/toolStore.ts';
import type { ToolType } from '@stores/toolStore.ts';
import styles from './Toolbar.module.css';

const TOOLS: Array<{ type: ToolType; label: string; shortcut: string }> = [
  { type: 'select', label: 'Select', shortcut: 'V' },
  { type: 'border-box', label: 'Border Box', shortcut: 'B' },
  { type: 'text-block', label: 'Text', shortcut: 'T' },
  { type: 'figlet-text', label: 'FIGlet', shortcut: 'F' },
  { type: 'divider', label: 'Divider', shortcut: 'D' },
  { type: 'draw', label: 'Draw', shortcut: 'P' },
  { type: 'hand', label: 'Hand', shortcut: 'H' },
];

export function Toolbar() {
  const activeTool = useToolStore((s) => s.activeTool);
  const setActiveTool = useToolStore((s) => s.setActiveTool);

  return (
    <nav className={styles.toolbar} role="toolbar" aria-label="Design tools" data-component="toolbar">
      {TOOLS.map((tool) => (
        <button
          key={tool.type}
          className={`${styles.toolButton} ${activeTool === tool.type ? styles.active : ''}`}
          aria-label={`${tool.label} (${tool.shortcut})`}
          aria-pressed={activeTool === tool.type}
          data-tool={tool.type}
          onClick={() => setActiveTool(tool.type)}
          title={`${tool.label} (${tool.shortcut})`}
        >
          {tool.shortcut}
        </button>
      ))}
    </nav>
  );
}
