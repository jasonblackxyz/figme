import { useDocumentStore } from '@stores/documentStore.ts';
import type { FIGMIIPage, FIGMIIPageRuntime } from '@primitives/document-model/types.ts';
import styles from './PropertiesPanel.module.css';

interface PageRuntimePropertiesProps {
  page: FIGMIIPage;
}

const DESKTOP_BEHAVIORS = [
  'centered-mobile-canvas',
  'widen-modules',
  'split-pane',
] as const;

export function PageRuntimeProperties({ page }: PageRuntimePropertiesProps) {
  const updateRuntime = useDocumentStore((s) => s.updateActivePageRuntime);
  const runtime: FIGMIIPageRuntime = page.runtime ?? {};

  const update = (patch: Partial<FIGMIIPageRuntime>) => {
    updateRuntime({ ...patch });
  };

  return (
    <div className={styles.section} data-component="page-runtime-properties">
      <h3 className={styles.sectionTitle}>Page Runtime</h3>
      <div className={styles.fieldGroup}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Screen ID</label>
          <input
            className={styles.fieldInput}
            value={runtime.screenId ?? ''}
            onChange={(e) => update({ screenId: e.target.value || undefined })}
            placeholder="(none)"
            data-property="screenId"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Route</label>
          <input
            className={styles.fieldInput}
            value={runtime.route ?? ''}
            onChange={(e) => update({ route: e.target.value || undefined })}
            placeholder="(optional)"
            data-property="route"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Desktop</label>
          <select
            className={styles.fieldSelect}
            value={runtime.desktopBehavior ?? 'centered-mobile-canvas'}
            onChange={(e) => update({ desktopBehavior: e.target.value as FIGMIIPageRuntime['desktopBehavior'] })}
            data-property="desktopBehavior"
          >
            {DESKTOP_BEHAVIORS.map((behavior) => (
              <option key={behavior} value={behavior}>{behavior}</option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Scroll root</label>
          <input
            className={styles.fieldInput}
            value={runtime.scrollRootId ?? ''}
            onChange={(e) => update({ scrollRootId: e.target.value || undefined })}
            placeholder="(none)"
            data-property="scrollRootId"
          />
        </div>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={runtime.exportAsScreen ?? false}
            onChange={(e) => update({ exportAsScreen: e.target.checked })}
            data-property="exportAsScreen"
          />
          <span className={styles.checkboxText}>Export as runtime screen</span>
        </label>
      </div>
    </div>
  );
}
