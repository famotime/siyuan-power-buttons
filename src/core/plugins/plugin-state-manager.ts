import type { InstalledPluginPackage, SiyuanPluginLike } from '@/core/plugins/plugin-scanner';
import { resolveDisplayName, scanPluginEntries } from '@/core/plugins/plugin-scanner';
import type { DiscoveredPluginEntry } from '@/core/plugins/types';

export type FetchPostFn = (url: string, data: any) => Promise<any>;

export interface PluginStateManagerOptions {
  fetchPost?: FetchPostFn;
  getFrontend?: () => string;
  getActivePlugins?: () => unknown[] | undefined;
  notify?: (message: string, type?: 'info' | 'error') => void;
  t?: (key: string, replacements?: Record<string, string>) => string;
}

export class PluginStateManager {
  private enabledStateMap = new Map<string, boolean>();
  private installedPackages: InstalledPluginPackage[] = [];
  private listeners = new Set<() => void>();
  private isFetchingInstalled = false;

  constructor(private readonly options: PluginStateManagerOptions = {}) {}

  /**
   * 订阅状态变更通知
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  /**
   * 判断指定插件当前是否处于启用状态
   */
  isPluginEnabled(pluginName: string): boolean {
    if (this.enabledStateMap.has(pluginName)) {
      return Boolean(this.enabledStateMap.get(pluginName));
    }
    const active = this.options.getActivePlugins?.() as SiyuanPluginLike[] | undefined;
    if (Array.isArray(active) && active.some(p => p.name === pluginName)) {
      return true;
    }
    return false;
  }

  /**
   * 设置内部包列表（主要供测试或直接注入）
   */
  setInstalledPackages(packages: InstalledPluginPackage[]): void {
    this.installedPackages = packages;
    for (const pkg of packages) {
      this.enabledStateMap.set(pkg.name, Boolean(pkg.enabled));
    }
    this.notify();
  }

  /**
   * 扫描全量插件功能入口并填充当前的启用/停用状态
   */
  scanEntries(activePlugins?: SiyuanPluginLike[]): DiscoveredPluginEntry[] {
    const active = activePlugins || (this.options.getActivePlugins?.() as SiyuanPluginLike[] | undefined) || [];
    for (const p of active) {
      if (p.name && !this.enabledStateMap.has(p.name)) {
        this.enabledStateMap.set(p.name, true);
      }
    }
    const entries = scanPluginEntries(active, this.installedPackages);
    return entries.map(entry => ({
      ...entry,
      enabled: this.isPluginEnabled(entry.pluginName),
    }));
  }

  /**
   * 从思源内核拉取全量已安装插件列表并同步状态
   */
  async fetchInstalledPackages(): Promise<void> {
    if (this.isFetchingInstalled || !this.options.fetchPost) return;
    this.isFetchingInstalled = true;
    try {
      const frontend = this.options.getFrontend?.() || 'desktop';
      const res = await this.options.fetchPost('/api/bazaar/getInstalledPlugin', { frontend });
      if (res && res.code === 0 && Array.isArray(res.data?.packages)) {
        this.installedPackages = res.data.packages.map((pkg: any) => ({
          name: pkg.name,
          displayName: (typeof pkg.preferredName === 'string' && pkg.preferredName.trim())
            ? pkg.preferredName.trim()
            : resolveDisplayName(pkg.displayName, pkg.name),
          preferredName: pkg.preferredName,
          enabled: pkg.enabled ?? true,
          version: pkg.version,
        }));
        for (const pkg of this.installedPackages) {
          this.enabledStateMap.set(pkg.name, Boolean(pkg.enabled));
        }
        this.notify();
      }
    } catch {
      // 离线或异常时降级处理
    } finally {
      this.isFetchingInstalled = false;
    }
  }

  /**
   * 切换插件启用/停用状态并调用思源 API 同步
   */
  async togglePluginEnabled(pluginName: string, targetEnabled: boolean): Promise<boolean> {
    if (!this.options.fetchPost) {
      // 无网络函数时（如单测），直接更新内部状态
      this.enabledStateMap.set(pluginName, targetEnabled);
      const pkg = this.installedPackages.find(p => p.name === pluginName);
      if (pkg) pkg.enabled = targetEnabled;
      this.notify();
      return true;
    }

    try {
      const res = await this.options.fetchPost('/api/petal/setPetalEnabled', {
        packageName: pluginName,
        enabled: targetEnabled,
      });

      if (res && res.code === 0) {
        this.enabledStateMap.set(pluginName, targetEnabled);
        const pkg = this.installedPackages.find(p => p.name === pluginName);
        if (pkg) pkg.enabled = targetEnabled;

        const displayName = resolveDisplayName(pkg?.displayName || pkg?.preferredName, pluginName);
        const msgKey = targetEnabled ? 'pluginEnabledSuccess' : 'pluginDisabledSuccess';
        const defaultMsg = targetEnabled ? `已启用插件「${displayName}」` : `已停用插件「${displayName}」`;
        const tip = this.options.t ? this.options.t(msgKey, { name: displayName }) : defaultMsg;
        this.options.notify?.(tip, 'info');

        this.notify();
        return true;
      }

      const errMsg = res?.msg || '切换插件状态失败';
      const tip = this.options.t ? this.options.t('togglePluginFailed', { message: errMsg }) : `切换插件状态失败：${errMsg}`;
      this.options.notify?.(tip, 'error');
      return false;
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      const tip = this.options.t ? this.options.t('togglePluginFailed', { message: errMsg }) : `切换插件状态失败：${errMsg}`;
      this.options.notify?.(tip, 'error');
      return false;
    }
  }

  /**
   * 处理思源主 WebSocket 接收到的 reloadPlugin 广播推送，保持配置状态同步
   */
  handleWsReloadPlugin(data: {
    unloadPlugins?: string[];
    reloadPlugins?: string[];
    uninstallPlugins?: string[];
  }): void {
    if (!data) return;
    let changed = false;

    if (Array.isArray(data.unloadPlugins)) {
      for (const name of data.unloadPlugins) {
        this.enabledStateMap.set(name, false);
        const pkg = this.installedPackages.find(p => p.name === name);
        if (pkg) pkg.enabled = false;
        changed = true;
      }
    }

    if (Array.isArray(data.reloadPlugins)) {
      for (const name of data.reloadPlugins) {
        this.enabledStateMap.set(name, true);
        const pkg = this.installedPackages.find(p => p.name === name);
        if (pkg) pkg.enabled = true;
        changed = true;
      }
    }

    if (Array.isArray(data.uninstallPlugins)) {
      for (const name of data.uninstallPlugins) {
        this.enabledStateMap.delete(name);
        this.installedPackages = this.installedPackages.filter(p => p.name !== name);
        changed = true;
      }
    }

    if (changed) {
      this.notify();
    }
  }
}
