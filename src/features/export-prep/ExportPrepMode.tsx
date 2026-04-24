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
import type {
  RuntimeAnnotation,
  RuntimeComponentKind,
  RuntimeDesktopBehavior,
  RuntimeNodeRole,
} from '@primitives/runtime-semantics/types.ts';
import styles from './ExportPrepMode.module.css';

interface ExportPrepModeProps {
  visible: boolean;
  onClose: () => void;
}

const ROLE_OPTIONS: RuntimeNodeRole[] = ['container', 'content', 'input', 'button', 'link', 'decoration', 'custom'];
const COMPONENT_KIND_OPTIONS: RuntimeComponentKind[] = ['frame', 'text-input', 'custom-module'];
const DESKTOP_OPTIONS: RuntimeDesktopBehavior[] = ['centered-mobile-canvas', 'widen-modules', 'split-pane'];

export function ExportPrepMode({ visible, onClose }: ExportPrepModeProps) {
  const doc = useDocumentStore((s) => s.document);
  const setRuntimeManifest = useDocumentStore((s) => s.setRuntimeManifest);
  const setPageRuntime = useDocumentStore((s) => s.setPageRuntime);
  const createRuntimeAnnotation = useDocumentStore((s) => s.createRuntimeAnnotation);
  const updateRuntimeAnnotation = useDocumentStore((s) => s.updateRuntimeAnnotation);
  const removeRuntimeAnnotation = useDocumentStore((s) => s.removeRuntimeAnnotation);
  const inferRuntimeSemantics = useDocumentStore((s) => s.inferRuntimeSemantics);
  const selectedLayerIds = useUiStore((s) => s.selectedLayerIds);
  const selectedAnnotationId = useUiStore((s) => s.selectedRuntimeAnnotationId);
  const setSelectedAnnotation = useUiStore((s) => s.setSelectedRuntimeAnnotation);
  const [inferenceMessage, setInferenceMessage] = useState('');

  const activePage = doc.pages.find((page) => page.id === doc.activePageId) ?? doc.pages[0];
  const annotations = useMemo(() => {
    if (!activePage) return [];
    return Object.values(doc.runtime?.annotations ?? {})
      .filter((annotation) => annotation.pageId === activePage.id)
      .sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
  }, [activePage, doc.runtime?.annotations]);
  const selectedAnnotation = annotations.find((annotation) => annotation.id === selectedAnnotationId) ?? annotations[0];
  const diagnostics = useMemo(() => validateRuntimeSemantics(doc), [doc]);
  const packagePreview = useMemo(() => exportDesignPackageAsJson(doc, { includeRenderOracle: true }), [doc]);

  if (!visible) return null;

  const name = doc.name || 'untitled';
  const manifest = doc.runtime?.manifest ?? {};
  const pageRuntime = activePage?.runtime ?? {};
  const errorCount = diagnostics.filter((diagnostic) => diagnostic.severity === 'error').length;
  const warningCount = diagnostics.filter((diagnostic) => diagnostic.severity === 'warning').length;

  function addAnnotationFromSelection() {
    if (!activePage) return;
    const selectedLayers = selectedLayerIds
      .map((id) => activePage.layers[id])
      .filter((layer): layer is NonNullable<typeof layer> => layer != null);
    const rect = selectedLayers.length > 0
      ? rectFromLayers(selectedLayers)
      : { col: 0, row: 0, width: 12, height: 4 };
    const label = selectedLayers[0]?.name ?? 'Runtime Node';
    const id = createRuntimeAnnotation({
      pageId: activePage.id,
      semanticId: slug(label),
      name: label,
      rect,
      sourceLayerIds: selectedLayers.map((layer) => layer.id),
      role: 'container',
      componentKind: 'frame',
      componentId: 'panel.frame',
      z: annotations.length,
      export: true,
    });
    if (id) setSelectedAnnotation(id);
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
                <button className={styles.button} onClick={addAnnotationFromSelection}>
                  <Plus size={14} /> Region
                </button>
                {inferenceMessage && <span className={styles.empty}>{inferenceMessage}</span>}
              </div>
            </section>
          )}

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Annotations</h3>
            <div className={styles.annotationList}>
              {annotations.map((annotation) => (
                <button
                  key={annotation.id}
                  className={`${styles.annotationButton} ${annotation.id === selectedAnnotation?.id ? styles.selectedAnnotation : ''}`}
                  onClick={() => setSelectedAnnotation(annotation.id)}
                >
                  <span>{annotation.semanticId}</span>
                  <span className={styles.annotationMeta}>{annotation.role ?? 'node'} · {annotation.componentKind ?? annotation.componentId ?? 'component'}</span>
                </button>
              ))}
              {annotations.length === 0 && <div className={styles.empty}>No annotations</div>}
            </div>
          </section>

          {selectedAnnotation && (
            <AnnotationEditor
              key={selectedAnnotation.id}
              annotation={selectedAnnotation}
              onUpdate={(updates) => updateRuntimeAnnotation(selectedAnnotation.id, updates)}
              onRemove={() => removeRuntimeAnnotation(selectedAnnotation.id)}
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

interface AnnotationEditorProps {
  annotation: RuntimeAnnotation;
  onUpdate: (updates: Partial<RuntimeAnnotation>) => void;
  onRemove: () => void;
}

function AnnotationEditor({ annotation, onUpdate, onRemove }: AnnotationEditorProps) {
  const [propsText, setPropsText] = useState(JSON.stringify(annotation.props ?? {}, null, 2));
  const [bindingsText, setBindingsText] = useState(formatKeyValueRecord(annotation.bindingSlots ?? {}));
  const [interactionsText, setInteractionsText] = useState(annotation.interactionIds?.join(', ') ?? '');

  function applyPropsText() {
    const parsed = parseJsonRecord(propsText);
    if (parsed) onUpdate({ props: parsed });
  }

  function applyBindingsText() {
    onUpdate({ bindingSlots: parseKeyValueRecord(bindingsText) });
  }

  function applyInteractionsText() {
    onUpdate({
      interactionIds: interactionsText.split(',').map((item) => item.trim()).filter(Boolean),
    });
  }

  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>Selected</h3>
      <div className={styles.grid}>
        <LabeledInput label="Semantic ID" value={annotation.semanticId} onChange={(value) => onUpdate({ semanticId: value })} />
        <LabeledSelect label="Role" value={annotation.role ?? 'container'} options={ROLE_OPTIONS} onChange={(value) => onUpdate({ role: value as RuntimeNodeRole })} />
        <LabeledSelect
          label="Component"
          value={annotation.componentKind ?? 'frame'}
          options={COMPONENT_KIND_OPTIONS}
          onChange={(value) => onUpdate({
            componentKind: value as RuntimeComponentKind,
            componentId: defaultComponentId(value as RuntimeComponentKind, annotation.semanticId),
          })}
        />
        <LabeledInput label="Component ID" value={annotation.componentId ?? ''} onChange={(value) => onUpdate({ componentId: value })} />
        <LabeledInput label="Col" value={String(annotation.rect.col)} onChange={(value) => onUpdate({ rect: { ...annotation.rect, col: numberOr(annotation.rect.col, value) } })} />
        <LabeledInput label="Row" value={String(annotation.rect.row)} onChange={(value) => onUpdate({ rect: { ...annotation.rect, row: numberOr(annotation.rect.row, value) } })} />
        <LabeledInput label="Width" value={String(annotation.rect.width)} onChange={(value) => onUpdate({ rect: { ...annotation.rect, width: Math.max(1, numberOr(annotation.rect.width, value)) } })} />
        <LabeledInput label="Height" value={String(annotation.rect.height)} onChange={(value) => onUpdate({ rect: { ...annotation.rect, height: Math.max(1, numberOr(annotation.rect.height, value)) } })} />
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

function rectFromLayers(layers: Array<{ rect: RuntimeAnnotation['rect'] }>): RuntimeAnnotation['rect'] {
  const minCol = Math.min(...layers.map((layer) => layer.rect.col));
  const minRow = Math.min(...layers.map((layer) => layer.rect.row));
  const maxCol = Math.max(...layers.map((layer) => layer.rect.col + layer.rect.width));
  const maxRow = Math.max(...layers.map((layer) => layer.rect.row + layer.rect.height));
  return { col: minCol, row: minRow, width: maxCol - minCol, height: maxRow - minRow };
}

function formatKeyValueRecord(record: Record<string, string>): string {
  return Object.entries(record).map(([key, value]) => `${key}=${value}`).join('\n');
}

function parseKeyValueRecord(value: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of value.split(/\n|,/)) {
    const [key, ...rest] = line.split('=');
    const trimmedKey = key?.trim();
    const trimmedValue = rest.join('=').trim();
    if (trimmedKey && trimmedValue) result[trimmedKey] = trimmedValue;
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

function defaultComponentId(kind: RuntimeComponentKind, semanticId: string): string {
  if (kind === 'text-input') return 'query.input';
  if (kind === 'custom-module') return `module.${slug(semanticId)}`;
  return 'panel.frame';
}

function slug(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'node';
}
