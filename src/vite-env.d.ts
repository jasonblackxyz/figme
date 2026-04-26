/// <reference types="vite/client" />

type FIGMIIAgentApi = ReturnType<typeof import('./features/agent-api/agentApi.ts').buildApi>;

interface Window {
  FIGMII?: FIGMIIAgentApi;
  /** @deprecated Use window.FIGMII. */
  FigMe?: FIGMIIAgentApi;
  /** @deprecated Use window.FIGMII. */
  Figmii?: FIGMIIAgentApi;
}
