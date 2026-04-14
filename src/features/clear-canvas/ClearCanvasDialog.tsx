import { useCallback, useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useDocumentStore } from '@stores/documentStore.ts';
import styles from './ClearCanvasDialog.module.css';

interface ClearCanvasDialogProps {
  visible: boolean;
  onClose: () => void;
}

export function ClearCanvasDialog({ visible, onClose }: ClearCanvasDialogProps) {
  const clearActivePage = useDocumentStore((s) => s.clearActivePage);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!visible) return undefined;

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();

    return () => {
      previousFocus?.focus();
    };
  }, [visible]);

  const handleKeyDown = useCallback((e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }, [onClose]);

  const handleClear = useCallback(() => {
    clearActivePage();
    onClose();
  }, [clearActivePage, onClose]);

  if (!visible) return null;

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div
        className={styles.dialog}
        role="dialog"
        aria-label="Clear canvas"
        onKeyDown={handleKeyDown}
      >
        <div className={styles.header}>
          <h2 className={styles.title}>Clear Canvas</h2>
          <button
            ref={closeButtonRef}
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close"
          >
            {'\u00D7'}
          </button>
        </div>
        <div className={styles.body}>
          <p className={styles.message}>
            This will remove all layers on the current page. This action can be undone.
          </p>
          <div className={styles.actions}>
            <button className={styles.cancelButton} onClick={onClose}>
              Cancel
            </button>
            <button className={styles.clearButton} onClick={handleClear}>
              Clear
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
