import { useMemo, useState } from 'react';
import {
  RUNTIME_TIER_1_COMPONENT_KINDS,
  RUNTIME_TIER_2_COMPONENT_KINDS,
  RUNTIME_ROLES,
  type RuntimeAction,
  type RuntimeComponentKind,
  type RuntimeRole,
  type RuntimeBindingRef,
  type RuntimeInteractionRef,
  type SemanticRegion,
} from '@primitives/document-model/types.ts';
import { useDocumentStore } from '@stores/documentStore.ts';
import { useUiStore } from '@stores/uiStore.ts';
import { useToolStore } from '@stores/toolStore.ts';
import { generateRuntimeId, slugifyRuntimeId } from '@primitives/runtime-semantics/defaults.ts';
import styles from './LabelPicker.module.css';

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

interface InternalState {
  componentKind: RuntimeComponentKind;
  semanticId: string;
  role: '' | RuntimeRole;
  exportMode: 'runtime' | 'oracle-only' | 'ignore';
  z: string;
  bindings: RuntimeBindingRef[];
  interactions: RuntimeInteractionRef[];
  propsJson: string;
}

function defaultStateFromRegion(region: SemanticRegion | null): InternalState {
  return {
    componentKind: region?.componentKind ?? 'frame',
    semanticId: region?.semanticId ?? '',
    role: region?.role ?? '',
    exportMode: region?.exportMode ?? 'runtime',
    z: region?.z != null ? String(region.z) : '',
    bindings: region?.bindings?.map((b) => ({ ...b })) ?? [],
    interactions: region?.interactions?.map((i) => ({ ...i, action: { ...i.action } })) ?? [],
    propsJson: region?.props && Object.keys(region.props).length > 0
      ? JSON.stringify(region.props, null, 2)
      : '',
  };
}

export function LabelPicker() {
  const labelPicker = useUiStore((s) => s.labelPicker);
  const doc = useDocumentStore((s) => s.document);

  const editingRegion = useMemo(() => {
    if (!labelPicker.editingRegionId) return null;
    const page = doc.pages.find((p) => p.id === doc.activePageId);
    return page?.regions?.[labelPicker.editingRegionId] ?? null;
  }, [labelPicker.editingRegionId, doc]);

  if (!labelPicker.open || !labelPicker.rect) return null;

  // Re-mount the form when the picker re-opens (or switches editing target) so
  // local form state derives cleanly from the new editingRegion at mount time.
  const formKey = `${labelPicker.editingRegionId ?? 'new'}:${labelPicker.rect.col},${labelPicker.rect.row},${labelPicker.rect.width},${labelPicker.rect.height}`;
  return <LabelPickerForm key={formKey} editingRegion={editingRegion} />;
}

interface LabelPickerFormProps {
  editingRegion: SemanticRegion | null;
}

function LabelPickerForm({ editingRegion }: LabelPickerFormProps) {
  const labelPicker = useUiStore((s) => s.labelPicker);
  const closeLabelPicker = useUiStore((s) => s.closeLabelPicker);
  const clearRegionDraft = useUiStore((s) => s.clearRegionDraft);
  const setSelectedRegion = useUiStore((s) => s.setSelectedRegion);
  const regionPaintStaysActive = useUiStore((s) => s.regionPaintStaysActive);
  const setActiveTool = useToolStore((s) => s.setActiveTool);
  const addRegion = useDocumentStore((s) => s.addRegion);
  const updateRegion = useDocumentStore((s) => s.updateRegion);

  const [state, setState] = useState<InternalState>(() => defaultStateFromRegion(editingRegion));
  const [propsError, setPropsError] = useState<string | null>(null);

  if (!labelPicker.open || !labelPicker.rect) return null;

  const handleSave = (saveAndAnother: boolean): void => {
    let parsedProps: Record<string, unknown> | undefined;
    if (state.propsJson.trim()) {
      try {
        const parsed = JSON.parse(state.propsJson);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          parsedProps = parsed as Record<string, unknown>;
        } else {
          setPropsError('Props must be a JSON object.');
          return;
        }
      } catch {
        setPropsError('Props must be valid JSON.');
        return;
      }
    }

    const nextRegion: SemanticRegion = {
      id: editingRegion?.id ?? generateRuntimeId('region'),
      componentKind: state.componentKind,
      shape: {
        rect: { ...labelPicker.rect! },
        ...(labelPicker.exclude.length > 0 ? { exclude: labelPicker.exclude.map((c) => ({ ...c })) } : {}),
      },
      ...(state.semanticId.trim() ? { semanticId: slugifyRuntimeId(state.semanticId, 'region') } : {}),
      ...(state.role ? { role: state.role } : {}),
      ...(state.exportMode !== 'runtime' ? { exportMode: state.exportMode } : {}),
      ...(state.z.trim() && !Number.isNaN(Number(state.z)) ? { z: Number(state.z) } : {}),
      ...(state.bindings.length > 0
        ? { bindings: state.bindings.filter((b) => b.slot.trim() && b.path.trim()) }
        : {}),
      ...(state.interactions.length > 0
        ? { interactions: state.interactions.filter((i) => i.id.trim()) }
        : {}),
      ...(parsedProps && Object.keys(parsedProps).length > 0 ? { props: parsedProps } : {}),
      ...(editingRegion?.parentRegionId ? { parentRegionId: editingRegion.parentRegionId } : {}),
      provenance: editingRegion?.provenance ?? { source: 'human', confidence: 1, reviewed: true },
    };

    if (editingRegion) {
      updateRegion(editingRegion.id, {
        componentKind: nextRegion.componentKind,
        shape: nextRegion.shape,
        semanticId: nextRegion.semanticId,
        role: nextRegion.role,
        exportMode: nextRegion.exportMode,
        z: nextRegion.z,
        bindings: nextRegion.bindings,
        interactions: nextRegion.interactions,
        props: nextRegion.props,
        provenance: nextRegion.provenance,
      });
      setSelectedRegion(editingRegion.id);
    } else {
      addRegion(nextRegion);
      setSelectedRegion(nextRegion.id);
    }

    clearRegionDraft();
    closeLabelPicker();

    if (!saveAndAnother && !regionPaintStaysActive && !editingRegion) {
      // Default: leave region-paint mode after a single label
      setActiveTool('select');
    }
  };

  const handleCancel = () => {
    closeLabelPicker();
  };

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" aria-labelledby="figmii-label-picker-title">
      <div className={styles.dialog} data-component="label-picker">
        <div className={styles.header}>
          <h2 id="figmii-label-picker-title" className={styles.title}>
            {editingRegion ? 'Edit Region Label' : 'Label Region'}
          </h2>
          <button
            type="button"
            className={styles.closeButton}
            aria-label="Close label picker"
            onClick={handleCancel}
          >
            ×
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.shapeSummary} data-component="label-picker-shape">
            Rect: {labelPicker.rect.col},{labelPicker.rect.row} ·
            {' '}{labelPicker.rect.width}×{labelPicker.rect.height}
            {labelPicker.exclude.length > 0 && ` · ${labelPicker.exclude.length} excluded cells`}
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="figmii-label-picker-kind">Component Kind</label>
            <select
              id="figmii-label-picker-kind"
              className={styles.select}
              value={state.componentKind}
              onChange={(e) => setState((s) => ({ ...s, componentKind: e.target.value as RuntimeComponentKind }))}
              data-property="componentKind"
            >
              <optgroup label="Tier 1 — fully implemented">
                {RUNTIME_TIER_1_COMPONENT_KINDS.map((kind) => (
                  <option key={kind} value={kind}>{kind}</option>
                ))}
              </optgroup>
              <optgroup label="Tier 2 — reserved (renders as placeholder)">
                {RUNTIME_TIER_2_COMPONENT_KINDS.map((kind) => (
                  <option key={kind} value={kind}>{kind}</option>
                ))}
              </optgroup>
            </select>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="figmii-label-picker-semanticId">Semantic ID</label>
              <input
                id="figmii-label-picker-semanticId"
                className={styles.input}
                value={state.semanticId}
                onChange={(e) => setState((s) => ({ ...s, semanticId: e.target.value }))}
                placeholder="e.g. search-input"
                data-property="semanticId"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="figmii-label-picker-role">Role</label>
              <select
                id="figmii-label-picker-role"
                className={styles.select}
                value={state.role}
                onChange={(e) => setState((s) => ({ ...s, role: e.target.value as InternalState['role'] }))}
                data-property="role"
              >
                <option value="">(default for kind)</option>
                {RUNTIME_ROLES.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="figmii-label-picker-exportMode">Export Mode</label>
              <select
                id="figmii-label-picker-exportMode"
                className={styles.select}
                value={state.exportMode}
                onChange={(e) => setState((s) => ({ ...s, exportMode: e.target.value as InternalState['exportMode'] }))}
                data-property="exportMode"
              >
                <option value="runtime">runtime (full export)</option>
                <option value="oracle-only">oracle-only (visual only)</option>
                <option value="ignore">ignore</option>
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="figmii-label-picker-z">z-index (optional)</label>
              <input
                id="figmii-label-picker-z"
                className={styles.input}
                value={state.z}
                onChange={(e) => setState((s) => ({ ...s, z: e.target.value.replace(/[^\-0-9]/g, '') }))}
                placeholder="0"
                data-property="z"
              />
            </div>
          </div>

          <p className={styles.subtitle}>Bindings</p>
          <BindingEditor
            bindings={state.bindings}
            onChange={(bindings) => setState((s) => ({ ...s, bindings }))}
          />

          <p className={styles.subtitle}>Interactions</p>
          <InteractionEditor
            interactions={state.interactions}
            onChange={(interactions) => setState((s) => ({ ...s, interactions }))}
          />

          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="figmii-label-picker-props">Props (JSON, optional)</label>
            <textarea
              id="figmii-label-picker-props"
              className={styles.textarea}
              rows={3}
              value={state.propsJson}
              onChange={(e) => {
                setState((s) => ({ ...s, propsJson: e.target.value }));
                setPropsError(null);
              }}
              placeholder='{"placeholder": "Type to search…"}'
              data-property="props"
            />
            {propsError && (
              <span style={{ color: '#dc2626', fontSize: 11 }}>{propsError}</span>
            )}
          </div>
        </div>

        <div className={styles.actions}>
          <label className={styles.checkboxField}>
            <input
              type="checkbox"
              checked={regionPaintStaysActive}
              onChange={(e) => useUiStore.getState().setRegionPaintStaysActive(e.target.checked)}
              data-property="staysActive"
            />
            Stay in label mode
          </label>
          <button type="button" className={styles.cancelButton} onClick={handleCancel} data-action="cancel">
            Cancel
          </button>
          {!editingRegion && (
            <button
              type="button"
              className={styles.saveAndAnotherButton}
              onClick={() => handleSave(true)}
              data-action="save-and-another"
            >
              Save & Label Another
            </button>
          )}
          <button
            type="button"
            className={styles.saveButton}
            onClick={() => handleSave(false)}
            data-action="save"
          >
            {editingRegion ? 'Save' : 'Label Region'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface BindingEditorProps {
  bindings: RuntimeBindingRef[];
  onChange: (bindings: RuntimeBindingRef[]) => void;
}

function BindingEditor({ bindings, onChange }: BindingEditorProps) {
  const addRow = () => onChange([...bindings, { slot: '', path: '' }]);
  const removeRow = (idx: number) => onChange(bindings.filter((_, i) => i !== idx));
  const updateRow = (idx: number, patch: Partial<RuntimeBindingRef>) =>
    onChange(bindings.map((b, i) => (i === idx ? { ...b, ...patch } : b)));

  return (
    <div className={styles.editorList} data-component="bindings-editor">
      {bindings.length === 0 && (
        <span style={{ color: '#888', fontSize: 11 }}>No bindings yet.</span>
      )}
      {bindings.map((b, idx) => (
        <div key={idx} className={styles.editorRow}>
          <input
            className={styles.input}
            value={b.slot}
            onChange={(e) => updateRow(idx, { slot: e.target.value })}
            placeholder="slot (e.g. value)"
            data-property={`binding-${idx}-slot`}
          />
          <input
            className={styles.input}
            value={b.path}
            onChange={(e) => updateRow(idx, { path: e.target.value })}
            placeholder="path (e.g. search.query)"
            data-property={`binding-${idx}-path`}
          />
          <input
            className={styles.input}
            value={b.fallback != null ? String(b.fallback) : ''}
            onChange={(e) => updateRow(idx, { fallback: e.target.value || undefined })}
            placeholder="fallback (optional)"
            data-property={`binding-${idx}-fallback`}
          />
          <button
            type="button"
            className={styles.removeRowButton}
            onClick={() => removeRow(idx)}
            aria-label="Remove binding"
            data-action={`binding-${idx}-remove`}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        className={styles.addRowButton}
        onClick={addRow}
        data-action="binding-add"
      >
        + Add binding
      </button>
    </div>
  );
}

interface InteractionEditorProps {
  interactions: RuntimeInteractionRef[];
  onChange: (interactions: RuntimeInteractionRef[]) => void;
}

function InteractionEditor({ interactions, onChange }: InteractionEditorProps) {
  const addRow = () =>
    onChange([
      ...interactions,
      { id: '', action: { kind: 'focusInput' } },
    ]);
  const removeRow = (idx: number) => onChange(interactions.filter((_, i) => i !== idx));
  const updateRow = (idx: number, patch: Partial<RuntimeInteractionRef>) =>
    onChange(interactions.map((i, j) => (j === idx ? { ...i, ...patch } : i)));
  const updateAction = (idx: number, patch: Partial<RuntimeAction>) =>
    onChange(
      interactions.map((i, j) =>
        j === idx ? { ...i, action: { ...i.action, ...patch } as RuntimeAction } : i,
      ),
    );

  return (
    <div className={styles.editorList} data-component="interactions-editor">
      {interactions.length === 0 && (
        <span style={{ color: '#888', fontSize: 11 }}>No interactions yet.</span>
      )}
      {interactions.map((i, idx) => (
        <div key={idx} className={styles.editorRow}>
          <input
            className={styles.input}
            value={i.id}
            onChange={(e) => updateRow(idx, { id: e.target.value })}
            placeholder="id (e.g. submitQuery)"
            data-property={`interaction-${idx}-id`}
          />
          <select
            className={styles.select}
            value={i.action.kind}
            onChange={(e) => updateAction(idx, { kind: e.target.value as RuntimeAction['kind'] })}
            data-property={`interaction-${idx}-kind`}
          >
            {ACTION_KINDS.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <input
            className={styles.input}
            value={
              i.action.kind === 'navigate'
                ? (i.action.route ?? '')
                : ((i.action as { target?: string }).target ?? '')
            }
            onChange={(e) => {
              const value = e.target.value || undefined;
              if (i.action.kind === 'navigate') {
                updateAction(idx, { route: value } as Partial<RuntimeAction>);
              } else {
                updateAction(idx, { target: value } as Partial<RuntimeAction>);
              }
            }}
            placeholder={i.action.kind === 'navigate' ? 'route (optional)' : 'target (optional)'}
            data-property={`interaction-${idx}-target`}
          />
          <button
            type="button"
            className={styles.removeRowButton}
            onClick={() => removeRow(idx)}
            aria-label="Remove interaction"
            data-action={`interaction-${idx}-remove`}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        className={styles.addRowButton}
        onClick={addRow}
        data-action="interaction-add"
      >
        + Add interaction
      </button>
    </div>
  );
}
