import { create } from 'zustand';
import type { FigMeDocument } from '@primitives/document-model/types.ts';
import { createEmptyDocument } from '@primitives/document-model/operations.ts';

interface DocumentState {
  document: FigMeDocument;
  undoStack: FigMeDocument[];
  redoStack: FigMeDocument[];
  setDocument: (doc: FigMeDocument) => void;
  undo: () => void;
  redo: () => void;
  pushUndo: () => void;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  document: createEmptyDocument(),
  undoStack: [],
  redoStack: [],

  setDocument: (doc: FigMeDocument) => {
    set({ document: doc });
  },

  pushUndo: () => {
    const { document, undoStack } = get();
    set({
      undoStack: [...undoStack.slice(-49), document],
      redoStack: [],
    });
  },

  undo: () => {
    const { undoStack, document } = get();
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1]!;
    set({
      document: prev,
      undoStack: undoStack.slice(0, -1),
      redoStack: [...get().redoStack, document],
    });
  },

  redo: () => {
    const { redoStack, document } = get();
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1]!;
    set({
      document: next,
      redoStack: redoStack.slice(0, -1),
      undoStack: [...get().undoStack, document],
    });
  },
}));
