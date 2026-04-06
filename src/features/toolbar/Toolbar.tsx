import { useToolStore } from '@stores/toolStore.ts';
import type { ToolType } from '@stores/toolStore.ts';
import {
  MousePointer2,
  Hand,
  Square,
  Minus,
  Type,
  ALargeSmall,
  Pencil,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import styles from './Toolbar.module.css';

const ICON_SIZE = 14;

interface ToolDef {
  type: ToolType;
  label: string;
  shortcut: string;
  icon: LucideIcon;
}

type ToolbarItem = ToolDef | 'separator';

const TOOLS: ToolbarItem[] = [
  // Navigation
  { type: 'select', label: 'Select', shortcut: 'V', icon: MousePointer2 },
  { type: 'hand', label: 'Hand', shortcut: 'H', icon: Hand },
  'separator',
  // Structure
  { type: 'border-box', label: 'Box', shortcut: 'B', icon: Square },
  { type: 'divider', label: 'Divider', shortcut: 'D', icon: Minus },
  'separator',
  // Content
  { type: 'text-block', label: 'Text', shortcut: 'T', icon: Type },
  { type: 'figlet-text', label: 'FIGlet', shortcut: 'F', icon: ALargeSmall },
  'separator',
  // Drawing
  { type: 'draw', label: 'Draw', shortcut: 'P', icon: Pencil },
];

export function Toolbar() {
  const activeTool = useToolStore((s) => s.activeTool);
  const setActiveTool = useToolStore((s) => s.setActiveTool);

  return (
    <nav className={styles.toolbar} role="toolbar" aria-label="Design tools" data-component="toolbar">
      {TOOLS.map((item, index) => {
        if (item === 'separator') {
          return <div key={`sep-${index}`} className={styles.separator} role="separator" />;
        }

        const Icon = item.icon;
        return (
          <button
            key={item.type}
            className={`${styles.toolButton} ${activeTool === item.type ? styles.active : ''}`}
            aria-label={`${item.label} (${item.shortcut})`}
            aria-pressed={activeTool === item.type}
            data-tool={item.type}
            onClick={() => setActiveTool(item.type)}
            title={`${item.label} (${item.shortcut})`}
          >
            <Icon size={ICON_SIZE} aria-hidden="true" />
            <span className={styles.toolLabel}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
