import { useEffect } from 'react';
import type { FigMeDocument } from '@primitives/document-model/types.ts';

/**
 * Hook that logs document state changes to the console for agent consumption.
 * On every design change, logs: console.log('FIGME_STATE', { action, timestamp, document })
 *
 * Stub: logs on mount only. Real implementation will subscribe to store changes.
 */
export function useConsoleLogger(document: FigMeDocument): void {
  useEffect(() => {
    console.log('FIGME_STATE', {
      action: 'init',
      timestamp: Date.now(),
      document,
    });
  }, [document]);
}
