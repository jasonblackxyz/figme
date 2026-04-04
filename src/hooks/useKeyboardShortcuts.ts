import { useEffect } from 'react';

/**
 * Hook that registers global keyboard shortcuts for the design tool.
 *
 * Stub: registers no shortcuts. Real implementation will handle
 * undo/redo, tool switching, delete, copy/paste, etc.
 */
export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const handler = (_e: KeyboardEvent) => {
      // Real implementation: dispatch actions based on key combos
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
