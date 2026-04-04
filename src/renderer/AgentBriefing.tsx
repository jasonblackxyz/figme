import type { ReactNode } from 'react';
import type { FigMeDocument } from '@primitives/document-model/types.ts';

interface AgentBriefingProps {
  document: FigMeDocument;
}

/**
 * Hidden component that embeds a structured JSON briefing for AI agents.
 * The briefing is referenced via aria-describedby on the app root so that
 * Claude in Chrome can discover design context through the accessibility tree.
 */
export function AgentBriefing({ document }: AgentBriefingProps): ReactNode {
  const briefing = {
    system: 'FigMe \u2014 ASCII Grid Design Tool',
    version: '2.0',
    purpose:
      'Design tool for composing ASCII character grid interfaces. Designs target the readme-app rendering engine.',
    gridSystem: {
      description:
        'The canvas is a 2D grid of monospace character cells. Every position is addressed by (col, row). There are no sub-cell positions.',
      defaults: {
        fontFamily: document.gridConfig.fontFamily,
        fontSize: document.gridConfig.fontSize,
        lineHeight: document.gridConfig.lineHeight,
        cellWidth: document.gridConfig.cellWidth,
        cellHeight: document.gridConfig.cellHeight,
      },
    },
    document: {
      name: document.name,
      pageCount: document.pages.length,
      activePageId: document.activePageId,
      componentCount: Object.keys(document.components).length,
    },
  };

  return (
    <script
      type="application/json"
      id="figme-agent-briefing"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(briefing) }}
    />
  );
}
