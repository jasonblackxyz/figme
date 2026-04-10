import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useDocumentStore } from '@stores/documentStore.ts';
import { exportAsJson, exportAsHtml, exportAsMarkdown } from './exporters.ts';
import { exportGridSpecAsJson } from './gridspec/exporter.ts';
import { downloadFile } from './downloadFile.ts';
import { downloadBlob } from './downloadBlob.ts';
import { renderBufferToCanvas } from './renderToCanvas.ts';
import { composePageBuffer } from '@primitives/stamp-system/composeBuffer.ts';
import { computeColorOverrides } from '@primitives/document-model/colorOverrides.ts';
import type { FigMeDocument } from '@primitives/document-model/types.ts';
import styles from './ExportDialog.module.css';

function getActivePageExportConfig(doc: FigMeDocument) {
  const activePage = doc.pages.find((p) => p.id === doc.activePageId) ?? doc.pages[0];
  if (!activePage) return null;

  const cols = activePage.canvasColsOverride ?? doc.gridConfig.canvasCols;
  const rows = activePage.canvasRowsOverride ?? doc.gridConfig.canvasRows;
  const pageGridConfig = { ...doc.gridConfig, canvasCols: cols, canvasRows: rows };
  const buffer = composePageBuffer(activePage, pageGridConfig);
  const colorOverrides = computeColorOverrides(activePage);

  return { activePage, cols, rows, pageGridConfig, buffer, colorOverrides };
}

interface ExportDialogProps {
  visible: boolean;
  onClose: () => void;
}

export function ExportDialog({ visible, onClose }: ExportDialogProps) {
  const doc = useDocumentStore((s) => s.document);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [includeBuffer, setIncludeBuffer] = useState(false);

  useEffect(() => {
    if (!visible) return undefined;

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();

    return () => {
      previousFocus?.focus();
    };
  }, [visible]);

  const handleDialogKeyDown = useCallback((e: ReactKeyboardEvent<HTMLDivElement>) => {
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
  }, [onClose]);

  const handlePngExport = useCallback(async () => {
    const config = getActivePageExportConfig(doc);
    if (!config) return;

    const canvas = await renderBufferToCanvas(config.buffer, doc.palette, config.pageGridConfig, config.colorOverrides);

    canvas.toBlob((blob) => {
      if (blob) {
        const name = doc.name || 'untitled';
        downloadBlob(blob, `${name}_${config.cols}x${config.rows}.png`);
      }
    }, 'image/png');
    onClose();
  }, [doc, onClose]);

  const handleHtmlExport = useCallback(() => {
    const config = getActivePageExportConfig(doc);
    if (!config) return;

    const html = exportAsHtml(doc, config.buffer, config.pageGridConfig, config.colorOverrides);
    downloadFile(html, `${doc.name || 'untitled'}.html`, 'text/html');
    onClose();
  }, [doc, onClose]);

  const handleJsonExport = useCallback(() => {
    const json = exportAsJson(doc);
    downloadFile(json, `${doc.name || 'untitled'}.figme`, 'application/json');
    onClose();
  }, [doc, onClose]);

  const handleGridSpecExport = useCallback(() => {
    const json = exportGridSpecAsJson(doc, { includeBuffer });
    downloadFile(json, `${doc.name || 'untitled'}.gridspec.json`, 'application/json');
    onClose();
  }, [doc, includeBuffer, onClose]);

  const handleMarkdownExport = useCallback(() => {
    const md = exportAsMarkdown(doc);
    downloadFile(md, `${doc.name || 'untitled'}-spec.md`, 'text/markdown');
    onClose();
  }, [doc, onClose]);

  if (!visible) return null;

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
          <h2 className={styles.title}>Export Document</h2>
          <button
            ref={closeButtonRef}
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close export dialog"
          >
            x
          </button>
        </div>
        <div className={styles.body}>
          <div className={styles.sectionLabel}>Visual</div>

          <button className={styles.formatButton} onClick={handlePngExport}>
            <span className={styles.formatIcon}>{'▣'}</span>
            <div>
              <div className={styles.formatLabel}>PNG Image</div>
              <div className={styles.formatDesc}>Rasterized grid with dimensions in filename</div>
            </div>
          </button>

          <button className={styles.formatButton} onClick={handleHtmlExport}>
            <span className={styles.formatIcon}>{'<>'}</span>
            <div>
              <div className={styles.formatLabel}>HTML</div>
              <div className={styles.formatDesc}>Self-contained HTML with inline styles</div>
            </div>
          </button>

          <div className={styles.sectionLabel}>Data</div>

          <button className={styles.formatButton} onClick={handleJsonExport}>
            <span className={styles.formatIcon}>{'{}'}</span>
            <div>
              <div className={styles.formatLabel}>JSON (.figme)</div>
              <div className={styles.formatDesc}>Full document data, re-importable</div>
            </div>
          </button>

          <div className={styles.formatGroup}>
            <button className={styles.formatButton} onClick={handleGridSpecExport}>
              <span className={styles.formatIcon}>{'⚙'}</span>
              <div>
                <div className={styles.formatLabel}>Grid Spec (.gridspec.json)</div>
                <div className={styles.formatDesc}>Structured dev spec with resolved styles and borders</div>
              </div>
            </button>
            <label className={styles.optionToggle}>
              <input
                type="checkbox"
                checked={includeBuffer}
                onChange={(e) => setIncludeBuffer(e.target.checked)}
              />
              <span className={styles.optionLabel}>Include rendered buffer</span>
            </label>
          </div>

          <button className={styles.formatButton} onClick={handleMarkdownExport}>
            <span className={styles.formatIcon}>#</span>
            <div>
              <div className={styles.formatLabel}>Spec Markdown</div>
              <div className={styles.formatDesc}>Human-readable layer table in markdown</div>
            </div>
          </button>
        </div>
      </div>
    </>
  );
}
