import JSZip from 'jszip';
import type { FigmiiDocument } from '@primitives/document-model/types.ts';
import { deserializeDocument } from '@primitives/document-model/serialization.ts';

export async function importFigmeZipFile(file: File): Promise<FigmiiDocument[]> {
  const zip = await JSZip.loadAsync(file);
  const entries = Object.values(zip.files)
    .filter((entry) => !entry.dir && isFigmiiFilename(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (entries.length === 0) {
    throw new Error('No .figmii or .figme files were found in the selected zip archive.');
  }

  const documents: FigmiiDocument[] = [];
  for (const entry of entries) {
    const text = await entry.async('string');
    documents.push(parseFigmeText(text, entry.name));
  }

  return documents;
}

export async function importFigmeDirectoryFiles(files: File[]): Promise<FigmiiDocument[]> {
  const figmeFiles = files
    .filter((file) => isFigmiiFilename(file.name))
    .sort((a, b) => getRelativeFilePath(a).localeCompare(getRelativeFilePath(b)));

  if (figmeFiles.length === 0) {
    throw new Error('No .figmii or .figme files were found in the selected folder.');
  }

  const documents: FigmiiDocument[] = [];
  for (const file of figmeFiles) {
    const text = await readBlobText(file);
    documents.push(parseFigmeText(text, getRelativeFilePath(file)));
  }

  return documents;
}

export async function pickZipImportFile(): Promise<File | null> {
  if ('showOpenFilePicker' in window) {
    try {
      const [handle] = await (window as unknown as FileSystemAccessWindow).showOpenFilePicker({
        types: [{
          description: 'Zip archives',
          accept: { 'application/zip': ['.zip'] },
        }],
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
    input.accept = '.zip,application/zip';
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}

export async function pickDirectoryImportFiles(): Promise<File[]> {
  if ('showDirectoryPicker' in window) {
    try {
      const handle = await (window as unknown as FileSystemAccessWindow).showDirectoryPicker();
      const files = await collectFigmeFilesFromDirectory(handle);
      return files.sort((a, b) => getRelativeFilePath(a).localeCompare(getRelativeFilePath(b)));
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return [];
    }
  }

  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.figmii,.figme';
    input.setAttribute('webkitdirectory', '');
    input.setAttribute('directory', '');
    input.onchange = () => resolve(Array.from(input.files ?? []));
    input.click();
  });
}

function isFigmiiFilename(filename: string): boolean {
  const lower = filename.toLowerCase();
  return lower.endsWith('.figmii') || lower.endsWith('.figme');
}

function parseFigmeText(text: string, sourceName: string): FigmiiDocument {
  try {
    return deserializeDocument(text);
  } catch {
    throw new Error(`Unable to import "${sourceName}".`);
  }
}

function getRelativeFilePath(file: File): string {
  if ('webkitRelativePath' in file && typeof file.webkitRelativePath === 'string' && file.webkitRelativePath) {
    return file.webkitRelativePath;
  }
  return file.name;
}

async function collectFigmeFilesFromDirectory(
  handle: FileSystemDirectoryHandle,
  prefix = '',
): Promise<File[]> {
  const files: File[] = [];

  for await (const entry of handle.values()) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.kind === 'directory') {
      files.push(...await collectFigmeFilesFromDirectory(entry, path));
      continue;
    }

    if (!isFigmiiFilename(entry.name)) continue;
    const file = await entry.getFile();
    annotateRelativePath(file, path);
    files.push(file);
  }

  return files;
}

function annotateRelativePath(file: File, path: string): void {
  const currentPath = 'webkitRelativePath' in file ? file.webkitRelativePath : '';
  if (currentPath) return;

  Object.defineProperty(file, 'webkitRelativePath', {
    configurable: true,
    enumerable: false,
    value: path,
  });
}

interface FileSystemAccessWindow {
  showOpenFilePicker(options: {
    types: Array<{ description: string; accept: Record<string, string[]> }>;
  }): Promise<FileSystemFileHandle[]>;
  showDirectoryPicker(): Promise<FileSystemDirectoryHandle>;
}

interface FileSystemFileHandle {
  kind: 'file';
  name: string;
  getFile(): Promise<File>;
}

interface FileSystemDirectoryHandle {
  kind: 'directory';
  name: string;
  values(): AsyncIterable<FileSystemDirectoryEntry>;
}

type FileSystemDirectoryEntry = FileSystemFileHandle | FileSystemDirectoryHandle;

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
