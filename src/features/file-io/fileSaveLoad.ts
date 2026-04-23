import type { FigmiiDocument } from '@primitives/document-model/types.ts';
import { deserializeDocument } from '@primitives/document-model/serialization.ts';
import { downloadFile } from '@features/export/downloadFile.ts';

/**
 * Save a Figmii document to disk.
 * Uses File System Access API when available, falls back to download.
 */
export async function saveDocument(doc: FigmiiDocument): Promise<void> {
  const json = JSON.stringify(doc, null, 2);

  // Try File System Access API first
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as unknown as FileSystemAccessWindow).showSaveFilePicker({
        suggestedName: `${doc.name || 'untitled'}.figmii`,
        types: [{
          description: 'Figmii Document',
          accept: { 'application/json': ['.figmii', '.figme'] },
        }],
      });
      const writable = await handle.createWritable();
      await writable.write(json);
      await writable.close();
      return;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
    }
  }

  // Fallback: download
  downloadFile(json, `${doc.name || 'untitled'}.figmii`, 'application/json');
}

/**
 * Load a Figmii document from disk.
 * Uses File System Access API when available, falls back to file input.
 * Returns null if the user cancels or the file is invalid.
 */
export async function loadDocument(): Promise<FigmiiDocument | null> {
  // Try File System Access API first
  if ('showOpenFilePicker' in window) {
    try {
      const [handle] = await (window as unknown as FileSystemAccessWindow).showOpenFilePicker({
        types: [{
          description: 'Figmii Document',
          accept: { 'application/json': ['.figmii', '.figme'] },
        }],
      });
      if (!handle) return null;
      const file = await handle.getFile();
      const text = await file.text();
      return deserializeDocument(text);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return null;
    }
  }

  // Fallback: file input
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.figmii,.figme,.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      const text = await file.text();
      try {
        resolve(deserializeDocument(text));
      } catch {
        resolve(null);
      }
    };
    input.click();
  });
}

/**
 * Minimal type shim for the File System Access API.
 * These APIs are not yet in all TS lib definitions.
 */
interface FileSystemAccessWindow {
  showSaveFilePicker(options: {
    suggestedName: string;
    types: Array<{ description: string; accept: Record<string, string[]> }>;
  }): Promise<FileSystemFileHandle>;

  showOpenFilePicker(options: {
    types: Array<{ description: string; accept: Record<string, string[]> }>;
  }): Promise<FileSystemFileHandle[]>;
}

interface FileSystemFileHandle {
  getFile(): Promise<File>;
  createWritable(): Promise<FileSystemWritableFileStream>;
}

interface FileSystemWritableFileStream {
  write(content: string): Promise<void>;
  close(): Promise<void>;
}
