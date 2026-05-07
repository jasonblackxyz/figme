import { useMemo, useState } from 'react';
import {
  RUNTIME_ROLES,
  type RuntimeAction,
  type RuntimeBindingRef,
  type RuntimeComponentKind,
  type RuntimeInteractionRef,
  type RuntimeRole,
  type SemanticRegion,
} from '@primitives/document-model/types.ts';
import { useDocumentStore } from '@stores/documentStore.ts';
import { useUiStore } from '@stores/uiStore.ts';
import { useToolStore } from '@stores/toolStore.ts';
import { validateRegionAuthoring } from '@primitives/document-model/regionValidation.ts';
import { slugifyRuntimeId } from '@primitives/runtime-semantics/defaults.ts';
import { RuntimeComponentKindPicker } from '@features/region-labeling/RuntimeComponentKindPicker.tsx';
import styles from './PropertiesPanel.module.css';

const ACTION_KINDS: ReadonlyArray<RuntimeAction['kind']> = [
  'focusInput',
  'submitQuery',
  'openSection',
  'openRead',
  'navigate',
  'selectItem',
  'toggleState',
  'dismiss',
  'copyValue',
  'custom',
];

interface RegionPropertiesProps {
  region: SemanticRegion;
}

export function RegionProperties({ region }: RegionPropertiesProps) {
  const updateRegion = useDocumentStore((s) => s.updateRegion);
  const removeRegion = useDocumentStore((s) => s.removeRegion);
  const setSelectedRegion = useUiStore((s) => s.setSelectedRegion);
  const setActiveTool = useToolStore((s) => s.setActiveTool);
  const beginRegionDraft = useUiStore((s) => s.beginRegionDraft);

  const diagnostics = useMemo(() => validateRegionAuthoring(region), [region]);

  const setKind = (kind: RuntimeComponentKind) => updateRegion(region.id, { componentKind: kind });
  const setSemanticId = (raw: string) =>
    updateRegion(region.id, { semanticId: raw.trim() ? slugifyRuntimeId(raw, 'region') : undefined });
  const setRole = (raw: string) =>
    updateRegion(region.id, { role: raw === '' ? undefined : (raw as RuntimeRole) });
  const setExportMode = (mode: 'runtime' | 'oracle-only' | 'ignore') =>
    updateRegion(region.id, { exportMode: mode });
  const setZ = (raw: string) => {
    if (raw.trim() === '') updateRegion(region.id, { z: undefined });
    else if (!Number.isNaN(Number(raw))) updateRegion(region.id, { z: Number(raw) });
  };

  const updateBindings = (bindings: RuntimeBindingRef[]) =>
    updateRegion(region.id, { bindings: bindings.length > 0 ? bindings : undefined });
  const updateInteractions = (interactions: RuntimeInteractionRef[]) =>
    updateRegion(region.id, { interactions: interactions.length > 0 ? interactions : undefined });

  const repaintShape = () => {
    setActiveTool('region-paint');
    // Seed the draft with the region's current cells so the user can extend/erase.
    const cells: Array<{ row: number; col: number }> = [];
    const excluded = new Set(
      (region.shape.exclude ?? []).map((c) => `${c.row},${c.col}`),
    );
    for (let r = region.shape.rect.row; r < region.shape.rect.row + region.shape.rect.height; r++) {
      for (let c = region.shape.rect.col; c < region.shape.rect.col + region.shape.rect.width; c++) {
        if (!excluded.has(`${r},${c}`)) cells.push({ row: r, col: c });
      }
    }
    beginRegionDraft(region.id, cells);
  };

  const handleDelete = () => {
    removeRegion(region.id);
    setSelectedRegion(null);
  };

  return (
    <div className={styles.section} data-component="region-properties" data-region-id={region.id}>
      <h3 className={styles.sectionTitle}>Region</h3>
      <div className={styles.fieldGroup}>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="figmii-region-properties-kind">Kind</label>
          <RuntimeComponentKindPicker
            id="figmii-region-properties-kind"
            value={region.componentKind}
            onChange={setKind}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>ID</label>
          <input
            className={styles.fieldInput}
            value={region.semanticId ?? ''}
            onChange={(e) => setSemanticId(e.target.value)}
            placeholder="(auto)"
            data-property="semanticId"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>Role</label>
          <select
            className={styles.fieldSelect}
            value={region.role ?? ''}
            onChange={(e) => setRole(e.target.value)}
            data-property="role"
          >
            <option value="">(default)</option>
            {RUNTIME_ROLES.map((role) => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>Export</label>
          <select
            className={styles.fieldSelect}
            value={region.exportMode ?? 'runtime'}
            onChange={(e) => setExportMode(e.target.value as 'runtime' | 'oracle-only' | 'ignore')}
            data-property="exportMode"
          >
            <option value="runtime">runtime</option>
            <option value="oracle-only">oracle-only</option>
            <option value="ignore">ignore</option>
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>z</label>
          <input
            className={styles.smallInput}
            value={region.z != null ? String(region.z) : ''}
            onChange={(e) => setZ(e.target.value)}
            placeholder="0"
            data-property="z"
          />
          <span style={{ color: 'var(--color-text-dim)', fontSize: 11 }}>
            Shape: {region.shape.rect.width}×{region.shape.rect.height}
            {region.shape.exclude?.length ? ` − ${region.shape.exclude.length} cells` : ''}
          </span>
        </div>

        <div className={styles.field}>
          <button
            type="button"
            className={styles.radioButton}
            onClick={repaintShape}
            data-action="repaint-region"
          >
            Repaint shape
          </button>
          <button
            type="button"
            className={styles.radioButton}
            onClick={handleDelete}
            data-action="delete-region"
          >
            Delete region
          </button>
        </div>

        <RegionBindingEditor
          bindings={region.bindings ?? []}
          onChange={updateBindings}
        />

        <RegionInteractionEditor
          interactions={region.interactions ?? []}
          onChange={updateInteractions}
        />

        {diagnostics.length > 0 && (
          <div data-component="region-validation" className={styles.fieldGroup}>
            <span className={styles.fieldLabel}>Validation</span>
            {diagnostics.map((d) => (
              <div
                key={d.code}
                data-severity={d.severity}
                style={{
                  fontSize: 11,
                  padding: '4px 6px',
                  borderRadius: 3,
                  background: d.severity === 'error' ? 'rgba(220,38,38,0.12)' : 'rgba(234,179,8,0.12)',
                  color: d.severity === 'error' ? '#fca5a5' : '#fde68a',
                  border: `1px solid ${d.severity === 'error' ? '#dc2626' : '#ca8a04'}`,
                }}
              >
                {d.message}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface RegionBindingEditorProps {
  bindings: RuntimeBindingRef[];
  onChange: (bindings: RuntimeBindingRef[]) => void;
}

function RegionBindingEditor({ bindings, onChange }: RegionBindingEditorProps) {
  const [draftSlot, setDraftSlot] = useState('');
  const [draftPath, setDraftPath] = useState('');

  const add = () => {
    if (!draftSlot.trim() || !draftPath.trim()) return;
    onChange([...bindings, { slot: draftSlot.trim(), path: draftPath.trim() }]);
    setDraftSlot('');
    setDraftPath('');
  };
  const updateRow = (idx: number, patch: Partial<RuntimeBindingRef>) =>
    onChange(bindings.map((b, i) => (i === idx ? { ...b, ...patch } : b)));
  const remove = (idx: number) => onChange(bindings.filter((_, i) => i !== idx));

  return (
    <div data-component="region-bindings">
      <span className={styles.fieldLabel} style={{ width: 'auto' }}>Bindings</span>
      {bindings.length === 0 && (
        <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>None</span>
      )}
      {bindings.map((b, idx) => (
        <div key={idx} className={styles.field} style={{ marginTop: 4 }}>
          <input
            className={styles.smallInput}
            value={b.slot}
            onChange={(e) => updateRow(idx, { slot: e.target.value })}
            data-property={`binding-${idx}-slot`}
            placeholder="slot"
          />
          <input
            className={styles.fieldInput}
            value={b.path}
            onChange={(e) => updateRow(idx, { path: e.target.value })}
            data-property={`binding-${idx}-path`}
            placeholder="path"
          />
          <button
            type="button"
            className={styles.radioButton}
            onClick={() => remove(idx)}
            data-action={`remove-binding-${idx}`}
            aria-label="Remove binding"
          >
            ×
          </button>
        </div>
      ))}
      <div className={styles.field} style={{ marginTop: 6 }}>
        <input
          className={styles.smallInput}
          value={draftSlot}
          onChange={(e) => setDraftSlot(e.target.value)}
          placeholder="slot"
          data-property="binding-new-slot"
        />
        <input
          className={styles.fieldInput}
          value={draftPath}
          onChange={(e) => setDraftPath(e.target.value)}
          placeholder="path"
          data-property="binding-new-path"
        />
        <button
          type="button"
          className={styles.radioButton}
          onClick={add}
          data-action="add-binding"
        >
          Add
        </button>
      </div>
    </div>
  );
}

interface RegionInteractionEditorProps {
  interactions: RuntimeInteractionRef[];
  onChange: (interactions: RuntimeInteractionRef[]) => void;
}

function RegionInteractionEditor({ interactions, onChange }: RegionInteractionEditorProps) {
  const [draftId, setDraftId] = useState('');
  const [draftKind, setDraftKind] = useState<RuntimeAction['kind']>('focusInput');

  const add = () => {
    if (!draftId.trim()) return;
    onChange([...interactions, { id: draftId.trim(), action: { kind: draftKind } }]);
    setDraftId('');
    setDraftKind('focusInput');
  };
  const updateRow = (idx: number, patch: Partial<RuntimeInteractionRef>) =>
    onChange(interactions.map((i, j) => (j === idx ? { ...i, ...patch } : i)));
  const updateAction = (idx: number, patch: Partial<RuntimeAction>) =>
    onChange(
      interactions.map((i, j) =>
        j === idx ? { ...i, action: { ...i.action, ...patch } as RuntimeAction } : i,
      ),
    );
  const remove = (idx: number) => onChange(interactions.filter((_, i) => i !== idx));

  return (
    <div data-component="region-interactions">
      <span className={styles.fieldLabel} style={{ width: 'auto' }}>Interactions</span>
      {interactions.length === 0 && (
        <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>None</span>
      )}
      {interactions.map((i, idx) => (
        <div key={idx} className={styles.field} style={{ marginTop: 4 }}>
          <input
            className={styles.smallInput}
            value={i.id}
            onChange={(e) => updateRow(idx, { id: e.target.value })}
            data-property={`interaction-${idx}-id`}
            placeholder="id"
          />
          <select
            className={styles.fieldSelect}
            value={i.action.kind}
            onChange={(e) => updateAction(idx, { kind: e.target.value as RuntimeAction['kind'] })}
            data-property={`interaction-${idx}-kind`}
          >
            {ACTION_KINDS.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <button
            type="button"
            className={styles.radioButton}
            onClick={() => remove(idx)}
            data-action={`remove-interaction-${idx}`}
            aria-label="Remove interaction"
          >
            ×
          </button>
        </div>
      ))}
      <div className={styles.field} style={{ marginTop: 6 }}>
        <input
          className={styles.smallInput}
          value={draftId}
          onChange={(e) => setDraftId(e.target.value)}
          placeholder="id"
          data-property="interaction-new-id"
        />
        <select
          className={styles.fieldSelect}
          value={draftKind}
          onChange={(e) => setDraftKind(e.target.value as RuntimeAction['kind'])}
          data-property="interaction-new-kind"
        >
          {ACTION_KINDS.map((k) => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
        <button
          type="button"
          className={styles.radioButton}
          onClick={add}
          data-action="add-interaction"
        >
          Add
        </button>
      </div>
    </div>
  );
}
