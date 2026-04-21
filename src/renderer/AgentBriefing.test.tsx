import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createEmptyDocument } from '@primitives/document-model/operations.ts';
import { useUiStore } from '@stores/uiStore.ts';
import { AgentBriefing } from './AgentBriefing.tsx';

function readBriefing() {
  const el = document.getElementById('figme-agent-briefing');
  expect(el).toBeTruthy();
  return JSON.parse(el!.textContent ?? '{}') as {
    mode: 'full' | 'raw';
    interfaceMode: 'ai' | 'human';
    api: { convenience: string[] };
    canvasSize: { default: { cols: number; rows: number } };
  };
}

describe('AgentBriefing', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('renders the AI-safe raw briefing in AI mode', () => {
    useUiStore.setState({ interfaceMode: 'ai' });
    render(<AgentBriefing document={createEmptyDocument('Briefing Test')} />);

    const briefing = readBriefing();
    expect(briefing.mode).toBe('raw');
    expect(briefing.interfaceMode).toBe('ai');
    expect(briefing.api.convenience.some(item => item.includes('addFiglet'))).toBe(true);
    expect(briefing.api.convenience.some(item => item.includes('addLayer'))).toBe(false);
    expect(briefing.api.convenience.some(item => item.includes('setPageCanvasSize'))).toBe(true);
    expect(briefing.canvasSize.default).toEqual({ cols: 228, rows: 57 });
  });

  it('renders the full briefing in Human mode', () => {
    useUiStore.setState({ interfaceMode: 'human' });
    render(<AgentBriefing document={createEmptyDocument('Briefing Test')} />);

    const briefing = readBriefing();
    expect(briefing.mode).toBe('full');
    expect(briefing.interfaceMode).toBe('human');
    expect(briefing.api.convenience.some(item => item.includes('addLayer'))).toBe(true);
    expect(briefing.api.convenience.some(item => item.includes('getPageCanvasSize'))).toBe(true);
    expect(briefing.canvasSize.default).toEqual({ cols: 228, rows: 57 });
  });
});
