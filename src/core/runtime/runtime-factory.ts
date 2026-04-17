import type { ExperimentalFeatureKey } from '@/core/compatibility/version-guard';
import type {
  PowerButtonItem,
} from '@/shared/types';

export type IntegratablePlugin = {
  name?: string;
  getPowerButtonsIntegration?: () => unknown;
};

export function collectInstalledPlugins(
  appPlugins: IntegratablePlugin[] | undefined,
  globalPlugins: IntegratablePlugin[] | undefined,
): IntegratablePlugin[] | undefined {
  const localPlugins = Array.isArray(appPlugins) ? appPlugins : [];
  const sharedPlugins = Array.isArray(globalPlugins) ? globalPlugins : [];

  if (!localPlugins.length && !sharedPlugins.length) {
    return undefined;
  }

  const seen = new Set<IntegratablePlugin>();
  return [...localPlugins, ...sharedPlugins].filter((plugin) => {
    if (!plugin || seen.has(plugin)) {
      return false;
    }
    seen.add(plugin);
    return true;
  });
}

export function createExperimentalActionRunners(options: {
  getExperimentalSupport: (feature: ExperimentalFeatureKey) => { supported: boolean; reason?: string };
  showMessage: (message: string, duration?: number, type?: 'info' | 'error') => void;
  getKeymap: () => unknown;
  pluginGlobalCommand?: (command: string) => void;
  pluginCommandHandlers: Map<string, () => void | Promise<void>>;
  runBuiltinCommandByDom: (commandId: string) => boolean | Promise<boolean>;
  executeExperimentalShortcut: (
    item: Pick<PowerButtonItem, 'actionType' | 'actionId' | 'experimentalShortcut'>,
    options: {
      getKeymap: () => unknown;
      executeBuiltinCommand: (commandId: string) => boolean | Promise<boolean>;
      executePluginCommand: (commandId: string) => boolean | Promise<boolean>;
    },
  ) => boolean | Promise<boolean>;
  executeExperimentalClickSequence: (
    item: Pick<PowerButtonItem, 'actionType' | 'actionId' | 'experimentalClickSequence'>,
    options: {
      document: Document;
      root: ParentNode;
      windowTarget: Window;
      onStepError: (input: { index: number; selector: string }) => void;
    },
  ) => boolean | Promise<boolean>;
  document: Document;
  windowTarget: Window;
}) {
  return {
    runExperimentalShortcut: (
      item: Pick<PowerButtonItem, 'actionType' | 'actionId' | 'experimentalShortcut'>,
    ): boolean | Promise<boolean> => {
      const support = options.getExperimentalSupport('shortcutAdapter');
      if (!support.supported) {
        options.showMessage(support.reason || '实验快捷键适配当前不可用。', 5000, 'error');
        return true;
      }

      return options.executeExperimentalShortcut(item, {
        getKeymap: options.getKeymap,
        executeBuiltinCommand: async (commandId) => {
          if (await options.runBuiltinCommandByDom(commandId)) {
            return true;
          }
          if (typeof options.pluginGlobalCommand === 'function') {
            options.pluginGlobalCommand(commandId);
            return true;
          }
          return false;
        },
        executePluginCommand: async (commandId) => {
          const handler = options.pluginCommandHandlers.get(commandId);
          if (!handler) {
            return false;
          }
          await handler();
          return true;
        },
      });
    },
    runExperimentalClickSequence: (
      item: Pick<PowerButtonItem, 'actionType' | 'actionId' | 'experimentalClickSequence'>,
    ): boolean | Promise<boolean> => {
      const support = options.getExperimentalSupport('clickSequenceAdapter');
      if (!support.supported) {
        options.showMessage(support.reason || '实验点击序列当前不可用。', 5000, 'error');
        return true;
      }

      return options.executeExperimentalClickSequence(item, {
        document: options.document,
        root: options.document,
        windowTarget: options.windowTarget,
        onStepError: ({ index, selector }) => {
          options.showMessage(`点击序列第 ${index + 1} 步失败：${selector}`, 5000, 'error');
        },
      });
    },
  };
}
