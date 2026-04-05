import { useCallback } from 'react';
import { useDocumentStore } from '@stores/documentStore.ts';
import { exportAsJson, exportAsHtml, exportAsMarkdown } from './exporters.ts';
import { downloadFile } from './downloadFile.ts';
import { createBuffer } from '@primitives/stamp-system/buffer.ts';
import styles from './ExportDialog.module.css';

interface ExportDialogProps {
  visible: boolean;
  onClose: () => void;
}

export function ExportDialog({ visible, onClose }: ExportDialogProps) {
  const document = useDocumentStore((s) => s.document);

  const handleJsonExport = useCallback(() => {
    const json = exportAsJson(document);
    downloadFile(json, `${document.name || 'untitled'}.figme`, 'application/json');
    onClose();
  }, [document, onClose]);

  const handleHtmlExport = useCallback(() => {
    // Create a buffer sized to the grid config for HTML export
    const buffer = createBuffer(
      document.gridConfig.canvasCols,
      document.gridConfig.canvasRows,
    );
    const html = exportAsHtml(document, buffer);
    downloadFile(html, `${document.name || 'untitled'}.html`, 'text/html');
    onClose();
  }, [document, onClose]);

  const handleMarkdownExport = useCallback(() => {
    const md = exportAsMarkdown(document);
    downloadFile(md, `${document.name || 'untitled'}-spec.md`, 'text/markdown');
    onClose();
  }, [document, onClose]);

  if (!visible) return null;

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.dialog} role="dialog" aria-label="Export Document">
        <div className={styles.header}>
          <h2 className={styles.title}>Export Document</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close export dialog">
            x
          </button>
        </div>
        <div className={styles.body}>
          <button className={styles.formatButton} onClick={handleJsonExport}>
            <span className={styles.formatIcon}>{'{}'}</span>
            <div>
              <div className={styles.formatLabel}>JSON (.figme)</div>
              <div className={styles.formatDesc}>Full document data, re-importable</div>
            </div>
          </button>
          <button className={styles.formatButton} onClick={handleHtmlExport}>
            <span className={styles.formatIcon}>{'<>'}</span>
            <div>
              <div className={styles.formatLabel}>HTML</div>
              <div className={styles.formatDesc}>Self-contained HTML with inline styles</div>
            </div>
          </button>
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
