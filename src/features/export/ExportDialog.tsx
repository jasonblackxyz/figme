import { useCallback, useState } from 'react';
import { useDocumentStore } from '@stores/documentStore.ts';
import { exportAsJson, exportAsHtml, exportAsMarkdown } from './exporters.ts';
import { exportGridSpecAsJson } from './gridspec/exporter.ts';
import { downloadFile } from './downloadFile.ts';
import { downloadBlob } from './downloadBlob.ts';
import { renderBufferToCanvas } from './renderToCanvas.ts';
import { composePageBuffer } from '@primitives/stamp-system/composeBuffer.ts';
import { createBuffer } from '@primitives/stamp-system/buffer.ts';
import styles from './ExportDialog.module.css';

interface ExportDialogProps {
  visible: boolean;
  onClose: () => void;
}

export function ExportDialog({ visible, onClose }: ExportDialogProps) {
  const document = useDocumentStore((s) => s.document);
  const [pngRulers, setPngRulers] = useState(false);
  const [includeBuffer, setIncludeBuffer] = useState(false);

  const handlePngExport = useCallback(async () => {
    const activePage = document.pages.find((p) => p.id === document.activePageId) ?? document.pages[0];
    if (!activePage) return;

    const cols = activePage.canvasColsOverride ?? document.gridConfig.canvasCols;
    const rows = activePage.canvasRowsOverride ?? document.gridConfig.canvasRows;
    const pageGridConfig = { ...document.gridConfig, canvasCols: cols, canvasRows: rows };

    const buffer = composePageBuffer(activePage, pageGridConfig);
    const canvas = await renderBufferToCanvas(buffer, document.palette, document.gridConfig, { rulers: pngRulers });

    canvas.toBlob((blob) => {
      if (blob) {
        const name = document.name || 'untitled';
        downloadBlob(blob, `${name}_${cols}x${rows}.png`);
      }
    }, 'image/png');
    onClose();
  }, [document, pngRulers, onClose]);

  const handleHtmlExport = useCallback(() => {
    const buffer = createBuffer(
      document.gridConfig.canvasCols,
      document.gridConfig.canvasRows,
    );
    const html = exportAsHtml(document, buffer);
    downloadFile(html, `${document.name || 'untitled'}.html`, 'text/html');
    onClose();
  }, [document, onClose]);

  const handleJsonExport = useCallback(() => {
    const json = exportAsJson(document);
    downloadFile(json, `${document.name || 'untitled'}.figme`, 'application/json');
    onClose();
  }, [document, onClose]);

  const handleGridSpecExport = useCallback(() => {
    const json = exportGridSpecAsJson(document, { includeBuffer });
    downloadFile(json, `${document.name || 'untitled'}.gridspec.json`, 'application/json');
    onClose();
  }, [document, includeBuffer, onClose]);

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
          <div className={styles.sectionLabel}>Visual</div>

          <div className={styles.formatGroup}>
            <button className={styles.formatButton} onClick={handlePngExport}>
              <span className={styles.formatIcon}>{'▣'}</span>
              <div>
                <div className={styles.formatLabel}>PNG Image</div>
                <div className={styles.formatDesc}>Rasterized grid with dimensions in filename</div>
              </div>
            </button>
            <label className={styles.optionToggle}>
              <input
                type="checkbox"
                checked={pngRulers}
                onChange={(e) => setPngRulers(e.target.checked)}
              />
              <span className={styles.optionLabel}>Include row/column rulers</span>
            </label>
          </div>

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
