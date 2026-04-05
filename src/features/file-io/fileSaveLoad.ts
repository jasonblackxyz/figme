import type { FigMeDocument } from '@primitives/document-model/types.ts';
import { downloadFile } from '@features/export/downloadFile.ts';

/**
 * Save a FigMe document to disk.
 * Uses File System Access API when available, falls back to download.
 */
export async function saveDocument(doc: FigMeDocument): Promise<void> {
  const json = JSON.stringify(doc, null, 2);

  // Try File System Access API first
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as unknown as FileSystemAccessWindow).showSaveFilePicker({
        suggestedName: `${doc.name || 'untitled'}.figme`,
        types: [{
          description: 'FigMe Document',
          accept: { 'application/json': ['.figme'] },
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
  downloadFile(json, `${doc.name || 'untitled'}.figme`, 'application/json');
}

/**
 * Load a FigMe document from disk.
 * Uses File System Access API when available, falls back to file input.
 * Returns null if the user cancels or the file is invalid.
 */
export async function loadDocument(): Promise<FigMeDocument | null> {
  // Try File System Access API first
  if ('showOpenFilePicker' in window) {
    try {
      const [handle] = await (window as unknown as FileSystemAccessWindow).showOpenFilePicker({
        types: [{
          description: 'FigMe Document',
          accept: { 'application/json': ['.figme'] },
        }],
      });
      if (!handle) return null;
      const file = await handle.getFile();
      const text = await file.text();
      return JSON.parse(text) as FigMeDocument;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return null;
    }
  }

  // Fallback: file input
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.figme,.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      const text = await file.text();
      try {
        resolve(JSON.parse(text) as FigMeDocument);
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
