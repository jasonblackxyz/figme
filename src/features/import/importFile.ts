import type { FIGMIIDocument } from '@primitives/document-model/types.ts';
import { deserializeDocument } from '@primitives/document-model/serialization.ts';
import { importGridSpec } from './importGridSpec.ts';
import { importHtml } from './importHtml.ts';
import { importMarkdown } from './importMarkdown.ts';

/**
 * Open a file picker and import the selected file into a FIGMIIDocument.
 *
 * Supports: .figmii, .figme (legacy), .json, .gridspec.json, .html, .md
 * Detects format by file extension and routes to the appropriate parser.
 */
export async function importFile(): Promise<FIGMIIDocument | null> {
  const file = await pickImportFile();
  if (!file) return null;

  try {
    return await parseImportFile(file);
  } catch {
    return null;
  }
}

export async function parseImportFile(file: File): Promise<FIGMIIDocument> {
  const text = await readBlobText(file);
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
    return deserializeDocument(text);
  } catch {
    throw new Error(`Unable to import "${file.name}".`);
  }
}

export async function pickImportFile(): Promise<File | null> {
  if ('showOpenFilePicker' in window) {
    try {
      const [handle] = await (window as unknown as FileSystemAccessWindow).showOpenFilePicker({
        types: [
          {
            description: 'Figmii Files',
            accept: {
              'application/json': ['.figmii', '.figme', '.json', '.gridspec.json'],
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

  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.figmii,.figme,.json,.gridspec.json,.html,.htm,.md';
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

async function readBlobText(blob: Blob): Promise<string> {
  if (typeof blob.text === 'function') {
    return blob.text();
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read import file.'));
    reader.readAsText(blob);
  });
}
