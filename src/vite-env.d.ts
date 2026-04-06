/// <reference types="vite/client" />

interface Window {
  FigMe?: ReturnType<typeof import('./features/agent-api/agentApi.ts').buildApi>;
}
