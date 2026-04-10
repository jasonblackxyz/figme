import { useCallback, useState } from 'react';
import { useDocumentStore } from '@stores/documentStore.ts';
import { flattenLayerOrder } from '@primitives/document-model/hierarchy.ts';
import styles from './SpecView.module.css';

interface SpecViewProps {
  visible: boolean;
  onClose: () => void;
}

export function SpecView({ visible, onClose }: SpecViewProps) {
  const document = useDocumentStore((s) => s.document);
  const [copied, setCopied] = useState(false);

  const activePage = document.pages.find((p) => p.id === document.activePageId);
  const totalLayers = document.pages.reduce(
    (sum, p) => sum + Object.keys(p.layers).length,
    0,
  );

  const jsonString = JSON.stringify(document, null, 2);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(jsonString).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // clipboard unavailable
    });
  }, [jsonString]);

  if (!visible) return null;

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.panel} data-spec="spec-view" role="dialog" aria-label="Spec View">
        <div className={styles.header}>
          <h2 className={styles.title}>Spec View</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close spec view">
            x
          </button>
        </div>

        <div className={styles.content}>
          {/* Document Summary */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Document Summary</h3>
            <div className={styles.summaryGrid}>
              <div className={styles.summaryItem}>
                <div className={styles.summaryValue} data-spec="doc-name">{document.name}</div>
                <div className={styles.summaryLabel}>Name</div>
              </div>
              <div className={styles.summaryItem}>
                <div className={styles.summaryValue} data-spec="page-count">{document.pages.length}</div>
                <div className={styles.summaryLabel}>Pages</div>
              </div>
              <div className={styles.summaryItem}>
                <div className={styles.summaryValue} data-spec="layer-count">{totalLayers}</div>
                <div className={styles.summaryLabel}>Layers</div>
              </div>
            </div>
          </div>

          {/* Active Page Layer Table */}
          {activePage && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                Active Page: {activePage.name}
              </h3>
              <table className={styles.layerTable} data-spec="layer-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Kind</th>
                    <th>Position</th>
                    <th>Size</th>
                    <th>Style</th>
                    <th>Visible</th>
                  </tr>
                </thead>
                <tbody>
                  {flattenLayerOrder(activePage).map((layerId) => {
                    const layer = activePage.layers[layerId];
                    if (!layer) return null;
                    return (
                      <tr key={layer.id} data-layer-id={layer.id}>
                        <td>{layer.name}</td>
                        <td>{layer.kind}</td>
                        <td>{layer.rect.col},{layer.rect.row}</td>
                        <td>{layer.rect.width}x{layer.rect.height}</td>
                        <td>{layer.styleKey}</td>
                        <td className={layer.visible ? undefined : styles.hidden}>
                          {layer.visible ? 'Yes' : 'No'}
                        </td>
                      </tr>
                    );
                  })}
                  {flattenLayerOrder(activePage).length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', opacity: 0.5 }}>
                        No layers
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Full JSON Dump */}
          <div className={styles.section}>
            <details className={styles.jsonSection}>
              <summary>Full Spec JSON</summary>
              <code className={styles.jsonCode} data-spec="full-document">
                {jsonString}
              </code>
              <button className={styles.copyButton} onClick={handleCopy}>
                {copied ? 'Copied!' : 'Copy JSON'}
              </button>
            </details>
          </div>
        </div>
      </div>
    </>
  );
}
