import { vi } from 'vitest';

export class Plugin {
  app = {};
  loadData = vi.fn().mockResolvedValue(null);
  saveData = vi.fn().mockResolvedValue(undefined);
  removeData = vi.fn().mockResolvedValue(undefined);
  addCommand = vi.fn();
  addTopBar = vi.fn();
  addStatusBar = vi.fn();
  addDock = vi.fn();
  addIcons = vi.fn();

  openSetting(): void {}
}

export class Dialog {
  element: HTMLElement;
  destroy: () => void;

  constructor(public options?: {
    title?: string;
    content?: string;
    width?: string;
    height?: string;
    destroyCallback?: () => void;
  }) {
    this.element = document.createElement('div');
    if (options?.content) {
      this.element.innerHTML = options.content;
    }
    document.body.appendChild(this.element);

    this.destroy = vi.fn(() => {
      options?.destroyCallback?.();
      this.element.remove();
    });
  }
}

export const fetchSyncPost = vi.fn();
export const getFrontend = vi.fn(() => 'desktop');
export const showMessage = vi.fn();
export const globalCommand = vi.fn();
export const openSetting = vi.fn();
export const openTab = vi.fn();
