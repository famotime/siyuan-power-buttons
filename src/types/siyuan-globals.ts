/**
 * Siyuan 全局对象类型辅助
 * 提供类型安全的访问方式，避免重复的类型断言
 */

/** Siyuan 配置中的 bazaar 配置 */
export interface SiyuanBazaarConfig {
  trust?: boolean;
  petalDisabled: boolean;
  [key: string]: unknown;
}

/** Siyuan 全局配置 */
export interface SiyuanGlobalConfig {
  bazaar?: SiyuanBazaarConfig;
  keymap?: unknown;
  [key: string]: unknown;
}

/** Siyuan 全局应用对象 */
export interface SiyuanGlobalApp {
  plugins?: unknown[];
}

/** Siyuan 全局 WebSocket 对象 */
export interface SiyuanGlobalWs {
  app?: SiyuanGlobalApp;
}

/** Siyuan Dock 对象类型接口 */
export interface SiyuanDockLike {
  togglePin?: () => void;
  isFloating?: () => boolean;
  pin?: boolean;
}

/** Siyuan 全局布局对象接口 */
export interface SiyuanGlobalLayout {
  leftDock?: SiyuanDockLike;
  rightDock?: SiyuanDockLike;
  bottomDock?: SiyuanDockLike;
  [key: string]: unknown;
}

/** Siyuan 全局 window 扩展 */
export interface SiyuanGlobalWindow {
  siyuan?: {
    config?: SiyuanGlobalConfig;
    ws?: SiyuanGlobalWs;
    layout?: SiyuanGlobalLayout;
  };
}

/** 获取 Siyuan 全局配置 */
export function getSiyuanConfig(): SiyuanGlobalConfig | undefined {
  return (window as unknown as SiyuanGlobalWindow).siyuan?.config;
}

/** 获取 Siyuan bazaar 配置 */
export function getSiyuanBazaarConfig(): SiyuanBazaarConfig | undefined {
  return getSiyuanConfig()?.bazaar;
}

/** 获取 Siyuan keymap 配置 */
export function getSiyuanKeymap(): unknown {
  return getSiyuanConfig()?.keymap;
}

/** 获取全局已安装的插件列表 */
export function getSiyuanGlobalPlugins(): unknown[] {
  const plugins = (window as unknown as SiyuanGlobalWindow).siyuan?.ws?.app?.plugins;
  return Array.isArray(plugins) ? plugins : [];
}

/** 获取 Siyuan 全局布局对象 */
export function getSiyuanLayout(): SiyuanGlobalLayout | undefined {
  return (window as unknown as SiyuanGlobalWindow).siyuan?.layout;
}

