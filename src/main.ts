import { createApp } from "vue";
import App from "@/App.vue";
import type { SettingsAppProps } from "@/features/settings/types";
import "@/index.scss";

export function mountSettingsApp(target: HTMLElement, props: SettingsAppProps): () => void {
  const app = createApp(App, props as unknown as Record<string, unknown>);
  app.mount(target);
  return () => {
    app.unmount();
  };
}
