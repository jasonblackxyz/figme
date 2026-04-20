import { beforeEach, describe, expect, it } from 'vitest';
import { useDocumentStore } from '@stores/documentStore.ts';
import { useUiStore } from '@stores/uiStore.ts';
import { createEmptyDocument } from '@primitives/document-model/operations.ts';
import { buildApi } from '../agentApi.ts';

let api: ReturnType<typeof buildApi>;

describe('agent API interface mode', () => {
  beforeEach(() => {
    useDocumentStore.setState({
      document: createEmptyDocument(),
      undoStack: [],
      redoStack: [],
    });
    useUiStore.setState({ interfaceMode: 'ai' });
    api = buildApi();
  });

  it('defaults to AI mode and reports the raw compatibility mode', () => {
    expect(api.getInterfaceMode()).toBe('ai');
    expect(api.getAgentMode()).toBe('raw');
  });

  it('keeps interface mode and compatibility agent mode in sync', () => {
    api.setAgentMode('full');
    expect(api.getInterfaceMode()).toBe('human');
    expect(api.getAgentMode()).toBe('full');

    api.setInterfaceMode('ai');
    expect(api.getAgentMode()).toBe('raw');
  });

  it('rejects structured layer creation in AI mode', () => {
    expect(() =>
      api.addLayer('border-box', 'Blocked', { col: 0, row: 0, width: 10, height: 4 }, 'border'),
    ).toThrow(/unavailable in AI mode/i);
  });

  it('allows structured layer creation in Human mode', () => {
    api.setInterfaceMode('human');

    const id = api.addLayer('border-box', 'Allowed', { col: 0, row: 0, width: 10, height: 4 }, 'border');

    expect(id).toBeDefined();
    expect(api.getLayer(id!)?.kind).toBe('border-box');
  });

  it('adds FIGlet text through the dedicated helper in AI mode', () => {
    const id = api.addFiglet({
      col: 2,
      row: 1,
      content: 'Title',
      fontName: 'koholint',
      color: '#2563eb',
      name: 'Hero Title',
    });

    const layer = api.getLayer(id!);
    expect(layer).toBeDefined();
    expect(layer!.kind).toBe('figlet-text');
    expect(layer!.name).toBe('Hero Title');
    expect(layer!.customColors).toEqual({ color: '#2563eb' });
  });
});
