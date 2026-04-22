import { describe, expect, it } from 'vitest';
import { createEmptyDocument } from '@primitives/document-model/operations.ts';
import { createBuffer } from '@primitives/stamp-system/buffer.ts';
import { exportAsHtml } from '../exporters.ts';

describe('exportAsHtml', () => {
  it('keeps workspace and page backgrounds separate', () => {
    const doc = createEmptyDocument('HTML Export');
    const page = doc.pages[0]!;
    const buffer = createBuffer(2, 1);

    const html = exportAsHtml(doc, page, buffer, doc.gridConfig);

    expect(html).toContain(`background: ${doc.palette.bg.bg};`);
    expect(html).toContain(`<div class="page" style="background:${page.backgroundColor}">`);
    expect(html).toContain('background:transparent');
  });

  it('uses explicit page background colors in the exported page wrapper', () => {
    const doc = createEmptyDocument('HTML Export');
    const page = { ...doc.pages[0]!, backgroundColor: '#0d1117' };
    const buffer = createBuffer(1, 1);

    const html = exportAsHtml(doc, page, buffer, doc.gridConfig);

    expect(html).toContain('<div class="page" style="background:#0d1117">');
  });
});
