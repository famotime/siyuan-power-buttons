export type DiscoveredPluginEntryType = 'setting' | 'topbar' | 'command' | 'dock';

export interface DiscoveredPluginEntry {
  id: string;
  pluginName: string;
  pluginDisplayName: string;
  type: DiscoveredPluginEntryType;
  title: string;
  description?: string;
  iconType: 'iconpark' | 'svg' | 'emoji';
  iconValue: string;
  actionType: 'plugin-command';
  actionId: string;
  initials?: string;
  enabled?: boolean;
}
