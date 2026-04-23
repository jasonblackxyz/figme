const SESSION_KEY = 'figmii_tab_id';

export function getTabId(): string {
  let tabId = sessionStorage.getItem(SESSION_KEY);
  if (!tabId) {
    tabId = `tab_${Date.now()}_${crypto.randomUUID()}`;
    sessionStorage.setItem(SESSION_KEY, tabId);
  }
  return tabId;
}
