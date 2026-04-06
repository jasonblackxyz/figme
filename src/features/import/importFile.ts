import type { FigMeDocument } from '@primitives/document-model/types.ts';
import { importGridSpec } from './importGridSpec.ts';
import { importHtml } from './importHtml.ts';
import { importMarkdown } from './importMarkdown.ts';

/**
 * Open a file picker and import the selected file into a FigMeDocument.
 *
 * Supports: .figme, .json, .gridspec.json, .html, .md
 * Detects format by file extension and routes to the appropriate parser.
 */
export async function importFile(): Promise<FigMeDocument | null> {
  const file = await pickFile();
  if (!file) return null;

  const text = await file.text();
  const name = file.name.toLowerCase();

  try {
    if (name.endsWith('.gridspec.json')) {
      return importGridSpec(text);
    }
    if (name.endsWith('.html') || name.endsWith('.htm')) {
      return importHtml(text);
    }
    if (name.endsWith('.md')) {
      return importMarkdown(text);
    }
    // .figme or .json — raw FigMeDocument JSON
    return JSON.parse(text) as FigMeDocument;
  } catch {
    return null;
  }
}

async function pickFile(): Promise<File | null> {
  if ('showOpenFilePicker' in window) {
    try {
      const [handle] = await (window as unknown as FileSystemAccessWindow).showOpenFilePicker({
        types: [
          {
            description: 'FigMe Files',
            accept: {
              'application/json': ['.figme', '.json', '.gridspec.json'],
              'text/html': ['.html', '.htm'],
              'text/markdown': ['.md'],
            },
          },
        ],
      });
      if (!handle) return null;
      return handle.getFile();
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return null;
    }
  }

  // Fallback: hidden file input
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.figme,.json,.gridspec.json,.html,.htm,.md';
    input.onchange = () => {
      resolve(input.files?.[0] ?? null);
    };
    input.click();
  });
}

interface FileSystemAccessWindow {
  showOpenFilePicker(options: {
    types: Array<{ description: string; accept: Record<string, string[]> }>;
  }): Promise<FileSystemFileHandle[]>;
}

interface FileSystemFileHandle {
  getFile(): Promise<File>;
}
