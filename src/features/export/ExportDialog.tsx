import { ExportPrepMode } from '@features/export-prep/ExportPrepMode.tsx';
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useDocumentStore } from '@stores/documentStore.ts';
import { downloadBlob } from './downloadBlob.ts';
import { createExportBundle } from './exportBundle.ts';
import { DesignPackageExportError, buildDesignPackageExport } from './design-package/index.ts';
import { sanitizeFilenameSegment } from './exportNaming.ts';
import type { ExportFormat } from './types.ts';
import styles from './ExportDialog.module.css';

const FORMAT_OPTIONS: Array<{ id: ExportFormat; label: string; description: string }> = [
  { id: 'png', label: 'PNG Image', description: 'Rasterized image export for each selected page.' },
  { id: 'html', label: 'HTML', description: 'Self-contained HTML snapshot for each selected page.' },
  { id: 'figmii', label: 'JSON (.figmii)', description: 'One-page FIGMII document for round-tripping.' },
  { id: 'gridspec', label: 'Grid Spec (.gridspec.json)', description: 'Structured dev spec export per page.' },
  { id: 'markdown', label: 'Spec Markdown', description: 'Readable markdown summary for each page.' },
];

const DEFAULT_FORMAT_SELECTIONS: Record<ExportFormat, boolean> = {
  png: true,
  html: true,
  figmii: true,
  gridspec: true,
  markdown: true,
};

interface ExportDialogProps {
  visible: boolean;
  onClose: () => void;
}

export function ExportDialog({ visible, onClose }: ExportDialogProps) {
  const doc = useDocumentStore((s) => s.document);
  const setDocument = useDocumentStore((s) => s.setDocument);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [designName, setDesignName] = useState(doc.name);
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>(doc.pages.map((page) => page.id));
  const [formatSelections, setFormatSelections] = useState(DEFAULT_FORMAT_SELECTIONS);
  const [includeBuffer, setIncludeBuffer] = useState(false);
  const [strictDesignPackage, setStrictDesignPackage] = useState(true);
  const [includeRenderOracle, setIncludeRenderOracle] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [mode, setMode] = useState<'bundle' | 'runtime'>('bundle');

  useEffect(() => {
    if (!visible) return undefined;

    setMode('bundle');
    setDesignName(doc.name);
    setSelectedPageIds(doc.pages.map((page) => page.id));
    setFormatSelections(DEFAULT_FORMAT_SELECTIONS);
    setIncludeBuffer(false);
    setStrictDesignPackage(true);
    setIncludeRenderOracle(false);
    setErrorMessage(null);
    setIsExporting(false);

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();

    return () => {
      previousFocus?.focus();
    };
  }, [visible, doc.name, doc.pages]);

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

  function handleFormatToggle(format: ExportFormat, checked: boolean) {
    setFormatSelections((current) => ({ ...current, [format]: checked }));
    if (format === 'gridspec' && !checked) {
      setIncludeBuffer(false);
    }
  }

  function handlePageToggle(pageId: string, checked: boolean) {
    setSelectedPageIds((current) => {
      if (checked) {
        return current.includes(pageId) ? current : [...current, pageId];
      }
      return current.filter((id) => id !== pageId);
    });
  }

  async function handleExport() {
    const selectedFormats = FORMAT_OPTIONS
      .filter((option) => formatSelections[option.id])
      .map((option) => option.id);
    const resolvedDesignName = designName.trim() || doc.name || 'Untitled';

    if (selectedFormats.length === 0 || selectedPageIds.length === 0) return;

    setIsExporting(true);
    setErrorMessage(null);

    try {
      const { blob, filename } = await createExportBundle(doc, {
        designName: resolvedDesignName,
        selectedPageIds,
        formats: selectedFormats,
        includeBuffer,
      });
      downloadBlob(blob, filename);

      const latestDocument = useDocumentStore.getState().document;
      if (resolvedDesignName !== latestDocument.name) {
        setDocument({ ...latestDocument, name: resolvedDesignName });
      }

      onClose();
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : 'The zip export could not be created.',
      );
    } finally {
      setIsExporting(false);
    }
  }

  function handleDesignPackageExport() {
    const resolvedDesignName = designName.trim() || doc.name || 'Untitled';
    if (selectedPageIds.length === 0) return;

    setIsExporting(true);
    setErrorMessage(null);

    try {
      const result = buildDesignPackageExport(
        { ...doc, name: resolvedDesignName },
        {
          selectedPageIds,
          strict: strictDesignPackage,
          includeRenderOracle,
        },
      );
      const blob = new Blob([JSON.stringify(result.package, null, 2)], { type: 'application/json' });
      const filename = `${sanitizeFilenameSegment(resolvedDesignName, 'figmii-design')}.design-package.json`;
      downloadBlob(blob, filename);

      const latestDocument = useDocumentStore.getState().document;
      if (resolvedDesignName !== latestDocument.name) {
        setDocument({ ...latestDocument, name: resolvedDesignName });
      }

      onClose();
    } catch (error: unknown) {
      setErrorMessage(formatDesignPackageError(error));
    } finally {
      setIsExporting(false);
    }
  }

  if (!visible) return null;
  if (mode === 'runtime') {
    return <ExportPrepMode visible={visible} onClose={onClose} />;
  }

  const selectedFormatCount = FORMAT_OPTIONS.filter((option) => formatSelections[option.id]).length;

  return (
    <>
      <div className={styles.overlay} onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Export Document"
        tabIndex={-1}
        onKeyDown={handleDialogKeyDown}
      >
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Export Zip Bundle</h2>
            <p className={styles.subtitle}>
              Export selected pages and formats into one zip file. Each page gets its own folder.
            </p>
          </div>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => setMode('runtime')}
            disabled={isExporting}
          >
            Runtime export
          </button>
          <button
            ref={closeButtonRef}
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close export dialog"
            disabled={isExporting}
          >
            x
          </button>
        </div>

        <div className={styles.body}>
          <label className={styles.fieldGroup}>
            <span className={styles.fieldLabel}>Design name</span>
            <input
              className={styles.textInput}
              aria-label="Design name"
              value={designName}
              onChange={(e) => setDesignName(e.target.value)}
              placeholder="Untitled"
              disabled={isExporting}
            />
            <span className={styles.helpText}>
              Saved back to the document after a successful export and used as the filename prefix.
            </span>
          </label>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <div className={styles.sectionTitle}>Formats</div>
                <div className={styles.sectionMeta}>
                  {selectedFormatCount} of {FORMAT_OPTIONS.length} selected
                </div>
              </div>
            </div>

            <div className={styles.checkList}>
              {FORMAT_OPTIONS.map((option) => (
                <label key={option.id} className={styles.checkRow}>
                  <input
                    type="checkbox"
                    aria-label={option.label}
                    checked={formatSelections[option.id]}
                    onChange={(e) => handleFormatToggle(option.id, e.target.checked)}
                    disabled={isExporting}
                  />
                  <span className={styles.checkContent}>
                    <span className={styles.checkLabel}>{option.label}</span>
                    <span className={styles.checkDescription}>{option.description}</span>
                  </span>
                </label>
              ))}
            </div>

            <label className={styles.toggleRow}>
              <input
                type="checkbox"
                aria-label="Include rendered buffer in Grid Spec exports"
                checked={includeBuffer}
                onChange={(e) => setIncludeBuffer(e.target.checked)}
                disabled={!formatSelections.gridspec || isExporting}
              />
              <span className={styles.checkContent}>
                <span className={styles.checkLabel}>Include rendered buffer in Grid Spec exports</span>
                <span className={styles.checkDescription}>
                  Only applies to `.gridspec.json` files.
                </span>
              </span>
            </label>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <div className={styles.sectionTitle}>Design Package</div>
                <div className={styles.sectionMeta}>
                  Exports selected runtime pages to one `.design-package.json` file
                </div>
              </div>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={handleDesignPackageExport}
                disabled={isExporting || selectedPageIds.length === 0}
              >
                Design Package (.design-package.json)
              </button>
            </div>

            <label className={styles.toggleRow}>
              <input
                type="checkbox"
                aria-label="Strict Design Package validation"
                checked={strictDesignPackage}
                onChange={(e) => setStrictDesignPackage(e.target.checked)}
                disabled={isExporting}
              />
              <span className={styles.checkContent}>
                <span className={styles.checkLabel}>Strict Design Package validation</span>
                <span className={styles.checkDescription}>
                  Stops export when selected pages are missing runtime screen IDs or the package contract fails.
                </span>
              </span>
            </label>

            <label className={styles.toggleRow}>
              <input
                type="checkbox"
                aria-label="Include render oracle in Design Package"
                checked={includeRenderOracle}
                onChange={(e) => setIncludeRenderOracle(e.target.checked)}
                disabled={isExporting}
              />
              <span className={styles.checkContent}>
                <span className={styles.checkLabel}>Include render oracle in Design Package</span>
                <span className={styles.checkDescription}>
                  Adds the composed FIGMII buffer for cross-repo fixture checks.
                </span>
              </span>
            </label>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <div className={styles.sectionTitle}>Pages</div>
                <div className={styles.sectionMeta}>
                  {selectedPageIds.length} of {doc.pages.length} selected
                </div>
              </div>
              <div className={styles.inlineActions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => setSelectedPageIds(doc.pages.map((page) => page.id))}
                  disabled={isExporting}
                >
                  Select all
                </button>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => setSelectedPageIds([])}
                  disabled={isExporting}
                >
                  Deselect all
                </button>
              </div>
            </div>

            <div className={styles.checkList}>
              {doc.pages.map((page) => (
                <label key={page.id} className={styles.checkRow}>
                  <input
                    type="checkbox"
                    aria-label={page.name}
                    checked={selectedPageIds.includes(page.id)}
                    onChange={(e) => handlePageToggle(page.id, e.target.checked)}
                    disabled={isExporting}
                  />
                  <span className={styles.checkContent}>
                    <span className={styles.checkLabel}>{page.name}</span>
                    <span className={styles.checkDescription}>
                      Exports to its own folder once the zip is unzipped.
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </section>

          <div className={styles.note}>
            Files are named as <code>{'<design>_<page>_<dd-mm-yyyy>'}</code>.
          </div>

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
            disabled={isExporting}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={handleExport}
            disabled={isExporting || selectedFormatCount === 0 || selectedPageIds.length === 0}
          >
            {isExporting ? 'Building zip...' : 'Export zip'}
          </button>
        </div>
      </div>
    </>
  );
}

function formatDesignPackageError(error: unknown): string {
  if (error instanceof DesignPackageExportError) {
    const errors = error.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
    const summary = errors.slice(0, 3).map((diagnostic) => diagnostic.message).join(' ');
    return summary || error.message;
  }

  return error instanceof Error
    ? error.message
    : 'The Design Package export could not be created.';
}
