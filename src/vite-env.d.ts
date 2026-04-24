/// <reference types="vite/client" />

interface Window {
  Figmii?: ReturnType<typeof import('./features/agent-api/agentApi.ts').buildApi>;
}
