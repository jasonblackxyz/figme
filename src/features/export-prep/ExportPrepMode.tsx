import { useMemo, useState } from 'react';
import { Download, FileJson, Play, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { useDocumentStore } from '@stores/documentStore.ts';
import { useUiStore } from '@stores/uiStore.ts';
import { downloadBlob } from '@features/export/downloadBlob.ts';
import { downloadFile } from '@features/export/downloadFile.ts';
import { exportAsHtml, exportAsJson, exportAsMarkdown } from '@features/export/exporters.ts';
import { exportGridSpecAsJson } from '@features/export/gridspec/exporter.ts';
import { renderBufferToCanvas } from '@features/export/renderToCanvas.ts';
import { applyPageCanvasSizeToGridConfig } from '@primitives/document-model/canvasSize.ts';
import { composePageBuffer } from '@primitives/stamp-system/composeBuffer.ts';
import { computeColorOverrides } from '@primitives/document-model/colorOverrides.ts';
import {
  exportDesignPackageAsJson,
  exportRuntimeDiagnosticsAsJson,
  exportRuntimeSemanticsAsJson,
  validateRuntimeSemantics,
} from '@primitives/runtime-semantics/index.ts';
import {
  RUNTIME_COMPONENT_KINDS,
  RUNTIME_ROLES,
  type RegionShape,
  type RuntimeComponentKind,
  type RuntimeRole,
  type SemanticRegion,
} from '@primitives/document-model/types.ts';
import type {
  RuntimeDesktopBehavior,
} from '@primitives/runtime-semantics/types.ts';
import styles from './ExportPrepMode.module.css';

interface ExportPrepModeProps {
  visible: boolean;
  onClose: () => void;
}

const ROLE_OPTIONS: RuntimeRole[] = [...RUNTIME_ROLES];
const COMPONENT_KIND_OPTIONS: RuntimeComponentKind[] = [...RUNTIME_COMPONENT_KINDS];
const DESKTOP_OPTIONS: RuntimeDesktopBehavior[] = ['centered-mobile-canvas', 'widen-modules', 'split-pane'];

export function ExportPrepMode({ visible, onClose }: ExportPrepModeProps) {
  const doc = useDocumentStore((s) => s.document);
  const setRuntimeManifest = useDocumentStore((s) => s.setRuntimeManifest);
  const setPageRuntime = useDocumentStore((s) => s.setPageRuntime);
  const addRegion = useDocumentStore((s) => s.addRegion);
  const updateRegion = useDocumentStore((s) => s.updateRegion);
  const removeRegion = useDocumentStore((s) => s.removeRegion);
  const inferRuntimeSemantics = useDocumentStore((s) => s.inferRuntimeSemantics);
  const selectedLayerIds = useUiStore((s) => s.selectedLayerIds);
  const selectedRegionId = useUiStore((s) => s.selectedRegionId);
  const setSelectedRegion = useUiStore((s) => s.setSelectedRegion);
  const [inferenceMessage, setInferenceMessage] = useState('');

  const activePage = doc.pages.find((page) => page.id === doc.activePageId) ?? doc.pages[0];
  const regions = useMemo(() => {
    if (!activePage) return [];
    return Object.values(activePage.regions ?? {})
      .sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
  }, [activePage]);
  const selectedRegion = regions.find((region) => region.id === selectedRegionId) ?? regions[0];
  const diagnostics = useMemo(() => validateRuntimeSemantics(doc), [doc]);
  const packagePreview = useMemo(() => exportDesignPackageAsJson(doc, { includeRenderOracle: true }), [doc]);

  if (!visible) return null;

  const name = doc.name || 'untitled';
  const manifest = doc.runtime?.manifest ?? {};
  const pageRuntime = activePage?.runtime ?? {};
  const errorCount = diagnostics.filter((diagnostic) => diagnostic.severity === 'error').length;
  const warningCount = diagnostics.filter((diagnostic) => diagnostic.severity === 'warning').length;

  function addRegionFromSelection() {
    if (!activePage) return;
    const selectedLayers = selectedLayerIds
      .map((id) => activePage.layers[id])
      .filter((layer): layer is NonNullable<typeof layer> => layer != null);
    const rect = selectedLayers.length > 0
      ? rectFromLayers(selectedLayers)
      : { col: 0, row: 0, width: 12, height: 4 };
    const label = selectedLayers[0]?.name ?? 'Runtime Node';
    const semanticId = slug(label);
    const id = uniqueRegionId(activePage, semanticId);
    addRegion({
      id,
      semanticId,
      shape: { rect },
      provenance: {
        source: 'human',
        note: selectedLayers.length > 0 ? `Created from selected layers: ${selectedLayers.map((layer) => layer.id).join(', ')}` : undefined,
      },
      role: 'container',
      componentKind: 'frame',
      z: regions.length,
    });
    setSelectedRegion(id);
  }

  function runInference() {
    const result = inferRuntimeSemantics({ pageIds: activePage ? [activePage.id] : undefined, strategy: 'aggressive' });
    setInferenceMessage(`${result.length} inference diagnostic${result.length === 1 ? '' : 's'}`);
  }

  function downloadRuntimeBundle() {
    downloadFile(exportDesignPackageAsJson(doc, { includeRenderOracle: true }), `${name}.design-package.json`, 'application/json');
    downloadFile(exportRuntimeSemanticsAsJson(doc), `${name}.semantics.json`, 'application/json');
    downloadFile(exportRuntimeDiagnosticsAsJson(doc, { requireRenderOracle: true }), `${name}.diagnostics.json`, 'application/json');
    downloadFile(exportGridSpecAsJson(doc, { includeBuffer: true }), `${name}.gridspec.json`, 'application/json');
  }

  function downloadHtml() {
    if (!activePage) return;
    const pageGridConfig = applyPageCanvasSizeToGridConfig(activePage, doc.gridConfig);
    const buffer = composePageBuffer(activePage, pageGridConfig);
    const html = exportAsHtml(doc, buffer, pageGridConfig, computeColorOverrides(activePage));
    downloadFile(html, `${name}.html`, 'text/html');
  }

  async function downloadPng() {
    if (!activePage) return;
    const pageGridConfig = applyPageCanvasSizeToGridConfig(activePage, doc.gridConfig);
    const buffer = composePageBuffer(activePage, pageGridConfig);
    const canvas = await renderBufferToCanvas(buffer, doc.palette, pageGridConfig, computeColorOverrides(activePage));
    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, `${name}.png`);
    }, 'image/png');
  }

  return (
    <>
      <div className={styles.backdrop} />
      <aside className={styles.panel} role="dialog" aria-modal="false" aria-label="Runtime export preparation">
        <div className={styles.header}>
          <h2 className={styles.title}>Runtime Export</h2>
          <div className={styles.headerActions}>
            <button className={styles.primaryButton} onClick={downloadRuntimeBundle}>
              <Download size={14} /> Bundle
            </button>
            <button className={styles.iconButton} onClick={onClose} aria-label="Close runtime export">
              <X size={14} />
            </button>
          </div>
        </div>

        <div className={styles.content}>
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Package</h3>
            <div className={styles.grid}>
              <LabeledInput label="Project ID" value={manifest.id ?? ''} onChange={(value) => setRuntimeManifest({ id: value })} />
              <LabeledInput label="Family" value={manifest.family ?? ''} onChange={(value) => setRuntimeManifest({ family: value })} />
              <LabeledInput label="Version" value={manifest.version ?? '0.1.0'} onChange={(value) => setRuntimeManifest({ version: value })} />
              <LabeledSelect
                label="Desktop"
                value={manifest.desktopDefault ?? 'centered-mobile-canvas'}
                options={DESKTOP_OPTIONS}
                onChange={(value) => setRuntimeManifest({ desktopDefault: value as RuntimeDesktopBehavior })}
              />
            </div>
          </section>

          {activePage && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Screen</h3>
              <div className={styles.grid}>
                <LabeledInput label="Screen ID" value={pageRuntime.screenId ?? ''} onChange={(value) => setPageRuntime(activePage.id, { screenId: value })} />
                <LabeledInput label="Name" value={pageRuntime.screenName ?? activePage.name} onChange={(value) => setPageRuntime(activePage.id, { screenName: value })} />
                <LabeledSelect
                  label="Desktop"
                  value={pageRuntime.desktopBehavior ?? 'centered-mobile-canvas'}
                  options={DESKTOP_OPTIONS}
                  onChange={(value) => setPageRuntime(activePage.id, { desktopBehavior: value as RuntimeDesktopBehavior })}
                />
                <label className={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={pageRuntime.exportAsScreen === true}
                    onChange={(event) => setPageRuntime(activePage.id, { exportAsScreen: event.target.checked })}
                  />
                  Export screen
                </label>
              </div>
              <div className={styles.buttonRow} style={{ marginTop: 8 }}>
                <button className={styles.primaryButton} onClick={runInference}>
                  <RefreshCw size={14} /> Infer
                </button>
                <button className={styles.button} onClick={addRegionFromSelection}>
                  <Plus size={14} /> Region
                </button>
                {inferenceMessage && <span className={styles.empty}>{inferenceMessage}</span>}
              </div>
            </section>
          )}

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Regions</h3>
            <div className={styles.annotationList}>
              {regions.map((region) => (
                <button
                  key={region.id}
                  className={`${styles.annotationButton} ${region.id === selectedRegion?.id ? styles.selectedAnnotation : ''}`}
                  onClick={() => setSelectedRegion(region.id)}
                >
                  <span>{region.semanticId ?? region.id}</span>
                  <span className={styles.annotationMeta}>{region.role ?? 'node'} · {region.componentKind}</span>
                </button>
              ))}
              {regions.length === 0 && <div className={styles.empty}>No regions</div>}
            </div>
          </section>

          {selectedRegion && (
            <RegionEditor
              key={selectedRegion.id}
              region={selectedRegion}
              onUpdate={(updates) => updateRegion(selectedRegion.id, updates)}
              onRemove={() => removeRegion(selectedRegion.id)}
            />
          )}

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Diagnostics</h3>
            <div className={styles.empty}>{errorCount} errors · {warningCount} warnings</div>
            <div className={styles.diagnostics}>
              {diagnostics.map((diagnostic, index) => (
                <div key={`${diagnostic.code}-${index}`} className={`${styles.diagnostic} ${diagnostic.severity === 'error' ? styles.error : styles.warning}`}>
                  <strong>{diagnostic.code}</strong>: {diagnostic.message}
                </div>
              ))}
              {diagnostics.length === 0 && <div className={styles.empty}>Valid runtime package</div>}
            </div>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Downloads</h3>
            <div className={styles.buttonRow}>
              <button className={styles.button} onClick={() => downloadFile(exportDesignPackageAsJson(doc, { includeRenderOracle: true }), `${name}.design-package.json`, 'application/json')}>
                <FileJson size={14} /> Package
              </button>
              <button className={styles.button} onClick={() => downloadFile(exportRuntimeSemanticsAsJson(doc), `${name}.semantics.json`, 'application/json')}>
                <FileJson size={14} /> Semantics
              </button>
              <button className={styles.button} onClick={() => downloadFile(exportRuntimeDiagnosticsAsJson(doc, { requireRenderOracle: true }), `${name}.diagnostics.json`, 'application/json')}>
                <FileJson size={14} /> Diagnostics
              </button>
              <button className={styles.button} onClick={() => downloadFile(exportGridSpecAsJson(doc, { includeBuffer: true }), `${name}.gridspec.json`, 'application/json')}>
                <FileJson size={14} /> GridSpec
              </button>
              <button className={styles.button} onClick={() => downloadFile(exportAsJson(doc), `${name}.figme`, 'application/json')}>
                <FileJson size={14} /> FIGME
              </button>
              <button className={styles.button} onClick={() => downloadFile(exportAsMarkdown(doc), `${name}-spec.md`, 'text/markdown')}>
                <FileJson size={14} /> Markdown
              </button>
              <button className={styles.button} onClick={downloadHtml}>
                <Play size={14} /> HTML
              </button>
              <button className={styles.button} onClick={() => { void downloadPng(); }}>
                <Play size={14} /> PNG
              </button>
            </div>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Preview</h3>
            <code className={styles.preview}>{packagePreview}</code>
          </section>
        </div>
      </aside>
    </>
  );
}

interface RegionEditorProps {
  region: SemanticRegion;
  onUpdate: (updates: Partial<Omit<SemanticRegion, 'id'>>) => void;
  onRemove: () => void;
}

function RegionEditor({ region, onUpdate, onRemove }: RegionEditorProps) {
  const [propsText, setPropsText] = useState(JSON.stringify(region.props ?? {}, null, 2));
  const [bindingsText, setBindingsText] = useState(formatBindings(region.bindings ?? []));
  const [interactionsText, setInteractionsText] = useState(region.interactions?.map((interaction) => interaction.id).join(', ') ?? '');

  function applyPropsText() {
    const parsed = parseJsonRecord(propsText);
    if (parsed) onUpdate({ props: parsed });
  }

  function applyBindingsText() {
    onUpdate({ bindings: parseBindings(bindingsText) });
  }

  function applyInteractionsText() {
    onUpdate({
      interactions: interactionsText.split(',').map((item) => item.trim()).filter(Boolean)
        .map((id) => ({ id, action: { kind: 'custom', target: id } })),
    });
  }

  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>Selected</h3>
      <div className={styles.grid}>
        <LabeledInput label="Semantic ID" value={region.semanticId ?? ''} onChange={(value) => onUpdate({ semanticId: value })} />
        <LabeledSelect label="Role" value={region.role ?? 'container'} options={ROLE_OPTIONS} onChange={(value) => onUpdate({ role: value as RuntimeRole })} />
        <LabeledSelect
          label="Component"
          value={region.componentKind}
          options={COMPONENT_KIND_OPTIONS}
          onChange={(value) => onUpdate({ componentKind: value as RuntimeComponentKind })}
        />
        <LabeledSelect
          label="Export"
          value={region.exportMode ?? 'runtime'}
          options={['runtime', 'oracle-only', 'ignore']}
          onChange={(value) => onUpdate({ exportMode: value as SemanticRegion['exportMode'] })}
        />
        <LabeledInput label="Col" value={String(region.shape.rect.col)} onChange={(value) => onUpdate({ shape: updateRect(region.shape, { col: numberOr(region.shape.rect.col, value) }) })} />
        <LabeledInput label="Row" value={String(region.shape.rect.row)} onChange={(value) => onUpdate({ shape: updateRect(region.shape, { row: numberOr(region.shape.rect.row, value) }) })} />
        <LabeledInput label="Width" value={String(region.shape.rect.width)} onChange={(value) => onUpdate({ shape: updateRect(region.shape, { width: Math.max(1, numberOr(region.shape.rect.width, value)) }) })} />
        <LabeledInput label="Height" value={String(region.shape.rect.height)} onChange={(value) => onUpdate({ shape: updateRect(region.shape, { height: Math.max(1, numberOr(region.shape.rect.height, value)) }) })} />
        <div className={`${styles.field} ${styles.fieldFull}`}>
          <label className={styles.label}>Props JSON</label>
          <textarea className={styles.textarea} value={propsText} onChange={(event) => setPropsText(event.target.value)} onBlur={applyPropsText} />
        </div>
        <div className={`${styles.field} ${styles.fieldFull}`}>
          <label className={styles.label}>Bindings</label>
          <textarea className={styles.textarea} value={bindingsText} onChange={(event) => setBindingsText(event.target.value)} onBlur={applyBindingsText} />
        </div>
        <div className={`${styles.field} ${styles.fieldFull}`}>
          <label className={styles.label}>Interactions</label>
          <input className={styles.input} value={interactionsText} onChange={(event) => setInteractionsText(event.target.value)} onBlur={applyInteractionsText} />
        </div>
      </div>
      <div className={styles.buttonRow} style={{ marginTop: 8 }}>
        <button className={styles.dangerButton} onClick={onRemove}>
          <Trash2 size={14} /> Delete
        </button>
      </div>
    </section>
  );
}

interface LabeledInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function LabeledInput({ label, value, onChange }: LabeledInputProps) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      <input className={styles.input} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

interface LabeledSelectProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

function LabeledSelect({ label, value, options, onChange }: LabeledSelectProps) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      <select className={styles.select} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  );
}

function rectFromLayers(layers: Array<{ rect: RegionShape['rect'] }>): RegionShape['rect'] {
  const minCol = Math.min(...layers.map((layer) => layer.rect.col));
  const minRow = Math.min(...layers.map((layer) => layer.rect.row));
  const maxCol = Math.max(...layers.map((layer) => layer.rect.col + layer.rect.width));
  const maxRow = Math.max(...layers.map((layer) => layer.rect.row + layer.rect.height));
  return { col: minCol, row: minRow, width: maxCol - minCol, height: maxRow - minRow };
}

function formatBindings(bindings: NonNullable<SemanticRegion['bindings']>): string {
  return bindings.map((binding) => `${binding.slot}=${binding.path}`).join('\n');
}

function parseBindings(value: string): NonNullable<SemanticRegion['bindings']> {
  const result: NonNullable<SemanticRegion['bindings']> = [];
  for (const line of value.split(/\n|,/)) {
    const [key, ...rest] = line.split('=');
    const trimmedKey = key?.trim();
    const trimmedValue = rest.join('=').trim();
    if (trimmedKey && trimmedValue) result.push({ slot: trimmedKey, path: trimmedValue });
  }
  return result;
}

function parseJsonRecord(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return null;
  }
}

function numberOr(fallback: number, value: string): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function updateRect(shape: RegionShape, patch: Partial<RegionShape['rect']>): RegionShape {
  return { ...shape, rect: { ...shape.rect, ...patch } };
}

function uniqueRegionId(page: NonNullable<ReturnType<typeof useDocumentStore.getState>['document']['pages'][number]>, semanticId: string): string {
  const base = semanticId || 'region';
  if (!page.regions?.[base]) return base;
  let index = 2;
  while (page.regions?.[`${base}-${index}`]) index += 1;
  return `${base}-${index}`;
}

function slug(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'node';
}
