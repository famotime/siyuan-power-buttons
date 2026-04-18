import { createApp } from "vue";
import App from "@/App.vue";
import type { SettingsAppProps } from "@/features/settings/types";
import "@/index.scss";

type SettingsAppHandle = (() => void) & {
  getSelectedButtonId?: () => string;
};

export function mountSettingsApp(target: HTMLElement, props: SettingsAppProps): SettingsAppHandle {
  const app = createApp(App, props as unknown as Record<string, unknown>);
  const instance = app.mount(target) as {
    getSelectedButtonId?: () => string;
  };
  const unmount = (() => {
    app.unmount();
  }) as SettingsAppHandle;
  unmount.getSelectedButtonId = () => instance.getSelectedButtonId?.() || "";
  return unmount;
}
