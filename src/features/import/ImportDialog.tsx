import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useDocumentStore } from '@stores/documentStore.ts';
import { importFigmeDirectoryFiles, importFigmeZipFile, parseImportFile, pickDirectoryImportFiles, pickImportFile, pickZipImportFile } from './index.ts';
import type { ImportSourceKind } from './types.ts';
import styles from './ImportDialog.module.css';

interface ImportDialogProps {
  visible: boolean;
  onClose: () => void;
}

export function ImportDialog({ visible, onClose }: ImportDialogProps) {
  const setDocument = useDocumentStore((s) => s.setDocument);
  const appendImportedDocuments = useDocumentStore((s) => s.appendImportedDocuments);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [busySource, setBusySource] = useState<ImportSourceKind | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return undefined;

    setBusySource(null);
    setErrorMessage(null);

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();

    return () => {
      previousFocus?.focus();
    };
  }, [visible]);

  function handleDialogKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }

    if (e.key !== 'Tab') return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );

    if (focusable.length === 0) {
      e.preventDefault();
      dialog.focus();
      return;
    }

    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    const active = document.activeElement;

    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  async function runImport(kind: ImportSourceKind, task: () => Promise<boolean>) {
    setBusySource(kind);
    setErrorMessage(null);

    try {
      const didImport = await task();
      if (didImport) {
        onClose();
      }
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : 'The import could not be completed.',
      );
    } finally {
      setBusySource(null);
    }
  }

  async function handleSingleFileImport() {
    await runImport('single-file', async () => {
      const file = await pickImportFile();
      if (!file) return false;
      const doc = await parseImportFile(file);
      setDocument(doc);
      return true;
    });
  }

  async function handleZipImport() {
    await runImport('zip-file', async () => {
      const file = await pickZipImportFile();
      if (!file) return false;
      const docs = await importFigmeZipFile(file);
      appendImportedDocuments(docs);
      return true;
    });
  }

  async function handleDirectoryImport() {
    await runImport('directory', async () => {
      const files = await pickDirectoryImportFiles();
      if (files.length === 0) return false;
      const docs = await importFigmeDirectoryFiles(files);
      appendImportedDocuments(docs);
      return true;
    });
  }

  if (!visible) return null;

  return (
    <>
      <div className={styles.overlay} onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Import Document"
        tabIndex={-1}
        onKeyDown={handleDialogKeyDown}
      >
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Import Document</h2>
            <p className={styles.subtitle}>
              Single-file import replaces the current document. Zip and folder import append pages
              into the current design.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close import dialog"
            disabled={busySource !== null}
          >
            x
          </button>
        </div>

        <div className={styles.body}>
          <button
            type="button"
            className={styles.importButton}
            onClick={() => void handleSingleFileImport()}
            disabled={busySource !== null}
          >
            <span className={styles.importLabel}>Import single file</span>
            <span className={styles.importDescription}>
              Open a `.figmii`, `.figme`, `.gridspec.json`, `.html`, or `.md` file and replace the current
              document.
            </span>
          </button>

          <button
            type="button"
            className={styles.importButton}
            onClick={() => void handleZipImport()}
            disabled={busySource !== null}
          >
            <span className={styles.importLabel}>Append pages from zip</span>
            <span className={styles.importDescription}>
              Recursively find `.figmii` and legacy `.figme` files inside a zip archive and add all of their pages.
            </span>
          </button>

          <button
            type="button"
            className={styles.importButton}
            onClick={() => void handleDirectoryImport()}
            disabled={busySource !== null}
          >
            <span className={styles.importLabel}>Append pages from folder</span>
            <span className={styles.importDescription}>
              Traverse a folder for `.figmii` and legacy `.figme` files and append their pages in file order.
            </span>
          </button>

          {errorMessage ? (
            <div className={styles.errorMessage} role="alert">
              {errorMessage}
            </div>
          ) : null}
        </div>

        <div className={styles.footer}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={onClose}
            disabled={busySource !== null}
          >
            Cancel
          </button>
          <div className={styles.statusText}>
            {busySource === 'single-file' ? 'Importing file...' : null}
            {busySource === 'zip-file' ? 'Reading zip archive...' : null}
            {busySource === 'directory' ? 'Scanning folder...' : null}
          </div>
        </div>
      </div>
    </>
  );
}
