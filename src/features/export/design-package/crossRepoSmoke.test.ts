import { describe, it, expect, beforeEach } from 'vitest';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { useDocumentStore } from '@stores/documentStore.ts';
import { useUiStore } from '@stores/uiStore.ts';
import { createEmptyDocument } from '@primitives/document-model/operations.ts';
import { buildApi } from '@features/agent-api/agentApi.ts';
import { exportDesignPackageAsJson, validateDesignPackage } from './index.ts';

// Cross-repo Phase F smoke: an AI agent in FIGMII composes a "minimal-search"
// design via the public Agent API, exports it to a Design Package JSON, and
// asserts the result equals the fixture committed under __fixtures__/cross-repo/.
// The same fixture file is the assertion target in readme-app's renderer tests
// (Phase F readme-app half, separate PR).

const FIXTURE_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '__fixtures__',
  'cross-repo',
  'minimal-search.design-package.json',
);

const REGENERATE = process.env.FIGMII_REGENERATE_CROSS_REPO_FIXTURE === '1';

let api: ReturnType<typeof buildApi>;

beforeEach(() => {
  useDocumentStore.setState({
    document: createEmptyDocument('Minimal Search'),
    undoStack: [],
    redoStack: [],
  });
  // border-box layers are blocked in AI mode; matches the regions test setup.
  useUiStore.setState({ interfaceMode: 'human' });
  api = buildApi();
});

function composeMinimalSearch(): string {
  // 1. Visual frame around the search input area.
  api.addLayer({
    kind: 'border-box',
    name: 'search-frame',
    col: 2,
    row: 2,
    width: 30,
    height: 3,
  });

  // 2. Placeholder text inside the frame (purely visual; runtime semantics
  // travel on the region, not the layer).
  api.addLayer({
    kind: 'text-block',
    name: 'search-placeholder',
    col: 4,
    row: 3,
    width: 26,
    height: 1,
    text: 'Search…',
  });

  // 3. Page runtime — this page becomes the 'search' screen in the package.
  const pageId = api.getDocument().activePageId;
  api.regions.setPageRuntime(pageId, {
    screenId: 'search',
    routeTarget: 'search',
    exportAsScreen: true,
  });

  // 4. The semantic label: a text-input region over the input cells with a
  // value binding and a submit interaction.
  api.regions.markInput(
    { rect: { col: 3, row: 3, width: 28, height: 1 } },
    {
      semanticId: 'search-input',
      valuePath: 'search.query',
      placeholder: 'Search…',
      submitInteractionId: 'submitQuery',
    },
  );

  return exportDesignPackageAsJson(api.getDocument());
}

describe('phase-f cross-repo smoke (FIGMII half)', () => {
  it('Agent API composition exports a valid design package', () => {
    const json = composeMinimalSearch();
    const pkg = JSON.parse(json);

    const validation = validateDesignPackage(pkg);
    const errors = validation.diagnostics.filter((d) => d.severity === 'error');
    expect(errors).toEqual([]);

    expect(pkg.schemaVersion).toBe('readme-design-package-v1');
    expect(pkg.screens).toHaveLength(1);
    expect(pkg.screens[0].id).toBe('search');

    const node = pkg.screens[0].nodes[0];
    expect(node).toBeDefined();
    expect(node.id).toBe('search-input');

    // The component referenced by the node should be a text-input.
    const component = pkg.components.find((c: { id: string }) => c.id === node.componentId);
    expect(component?.kind).toBe('text-input');

    // The node's value binding resolves to a top-level binding pointing at the runtime path.
    const valueBindingId = node.bindings?.value;
    expect(valueBindingId).toBeDefined();
    expect(pkg.bindings?.[valueBindingId]?.path).toBe('search.query');

    // The node's interactions resolve to a top-level submitQuery action.
    const submitId = node.interactionIds?.[0];
    expect(submitId).toBeDefined();
    expect(pkg.interactions?.[submitId]?.action.kind).toBe('submitQuery');
  });

  it('exporter output equals the committed cross-repo fixture', () => {
    const actualJson = composeMinimalSearch();
    const actual = JSON.parse(actualJson);

    if (REGENERATE || !existsSync(FIXTURE_PATH)) {
      mkdirSync(dirname(FIXTURE_PATH), { recursive: true });
      writeFileSync(FIXTURE_PATH, `${JSON.stringify(actual, null, 2)}\n`);
      return;
    }

    const fixture = JSON.parse(readFileSync(FIXTURE_PATH, 'utf-8'));
    expect(actual).toEqual(fixture);
  });
});
