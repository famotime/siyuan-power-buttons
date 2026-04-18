import { vi } from 'vitest';

export class Plugin {
  loadData = vi.fn().mockResolvedValue(null);
  saveData = vi.fn().mockResolvedValue(undefined);
  removeData = vi.fn().mockResolvedValue(undefined);
  addCommand = vi.fn();
  addTopBar = vi.fn();
  addStatusBar = vi.fn();
  addDock = vi.fn();

  openSetting(): void {}
}

export class Dialog {
  element = document.createElement('div');
  destroy = vi.fn();
}

export const fetchSyncPost = vi.fn();
export const getFrontend = vi.fn(() => 'desktop');
export const showMessage = vi.fn();
