import { buildApi } from './agentApi.ts';

/**
 * Mount the FigMe agent API on window.FigMe.
 * Call once at startup, before React renders.
 */
export function mountFigMeApi(): void {
  window.FigMe = Object.freeze(buildApi());
  console.log('[FigMe] Agent API ready. Briefing: document.getElementById("figme-agent-briefing") or window.FigMe.briefing');
}
