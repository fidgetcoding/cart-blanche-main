export type ActiveTemplate = 'yz' | 'sl';

const STORAGE_KEY = 'cb-active-template';
const DEFAULT: ActiveTemplate = 'yz';

export function getActiveTemplate(): ActiveTemplate {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'yz' || raw === 'sl') return raw;
  } catch {
    // Storage blocked: use the default template.
  }
  return DEFAULT;
}

export function setActiveTemplate(t: ActiveTemplate): void {
  try {
    localStorage.setItem(STORAGE_KEY, t);
    // Notify same-tab listeners — storage event only fires
    // cross-tab. Custom event handles same-tab updates.
    window.dispatchEvent(new CustomEvent('cb-active-template-change', { detail: t }));
  } catch {
    // Storage blocked: the choice just won't be remembered.
  }
}

export function getActiveTemplateThemeKey(): string {
  return getActiveTemplate() === 'sl' ? 'cb-theme-sl' : 'cb-theme-yz';
}

export function subscribeActiveTemplate(callback: (t: ActiveTemplate) => void): () => void {
  const handler = (e: Event) => {
    if (e instanceof CustomEvent) callback(e.detail as ActiveTemplate);
  };
  const storageHandler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      if (e.newValue === 'yz' || e.newValue === 'sl') callback(e.newValue);
    }
  };
  window.addEventListener('cb-active-template-change', handler);
  window.addEventListener('storage', storageHandler);
  return () => {
    window.removeEventListener('cb-active-template-change', handler);
    window.removeEventListener('storage', storageHandler);
  };
}
