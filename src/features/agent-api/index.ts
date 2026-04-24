import { buildApi } from './agentApi.ts';

/**
 * Mount the Figmii agent API on window.Figmii.
 * Call once at startup, before React renders.
 */
export function mountFigmiiApi(): void {
  window.Figmii = Object.freeze(buildApi());
  console.log('[Figmii] Agent API ready. Briefing: document.getElementById("figmii-agent-briefing") or window.Figmii.briefing');
}
