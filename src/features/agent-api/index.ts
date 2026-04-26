import { buildApi } from './agentApi.ts';

type FIGMIIAgentApi = ReturnType<typeof buildApi>;

const deprecatedAliasWarnings = new Set<string>();

function defineReadOnlyApi(name: 'FIGMII', api: FIGMIIAgentApi): void {
  Object.defineProperty(window, name, {
    configurable: true,
    enumerable: true,
    value: api,
    writable: false,
  });
}

function defineDeprecatedApiAlias(name: 'FigMe' | 'Figmii', api: FIGMIIAgentApi): void {
  Object.defineProperty(window, name, {
    configurable: true,
    enumerable: true,
    get() {
      if (!deprecatedAliasWarnings.has(name)) {
        deprecatedAliasWarnings.add(name);
        console.warn(`[FIGMII] window.${name} is deprecated; use window.FIGMII instead.`);
      }
      return api;
    },
  });
}

/**
 * Mount the FIGMII agent API on window.FIGMII.
 * Call once at startup, before React renders.
 */
export function mountFigmiiApi(): void {
  const api = Object.freeze(buildApi());
  deprecatedAliasWarnings.clear();
  defineReadOnlyApi('FIGMII', api);
  defineDeprecatedApiAlias('FigMe', api);
  defineDeprecatedApiAlias('Figmii', api);
  console.log('[FIGMII] Agent API ready. Briefing: document.getElementById("figmii-agent-briefing") or window.FIGMII.briefing');
}
