import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createEmptyDocument } from '@primitives/document-model/operations.ts';
import { SpecView } from './SpecView.tsx';

describe('SpecView', () => {
  it('includes active page canvas size metadata', () => {
    const doc = createEmptyDocument('Spec Test');
    const page = doc.pages[0]!;
    const overriddenDoc = {
      ...doc,
      pages: [
        {
          ...page,
          canvasColsOverride: 300,
          canvasRowsOverride: 80,
        },
      ],
    };

    const { container } = render(<SpecView document={overriddenDoc} selectedLayerIds={[]} />);
    const specText = container.querySelector('pre')?.textContent;
    expect(specText).toBeTruthy();

    const spec = JSON.parse(specText ?? '{}') as {
      activePage: {
        canvasSize: {
          defaultCols: number;
          defaultRows: number;
          effectiveCols: number;
          effectiveRows: number;
          isOverridden: boolean;
        };
      };
    };

    expect(spec.activePage.canvasSize).toEqual({
      pageId: overriddenDoc.activePageId,
      defaultCols: 228,
      defaultRows: 57,
      effectiveCols: 300,
      effectiveRows: 80,
      isOverridden: true,
    });
  });
});
