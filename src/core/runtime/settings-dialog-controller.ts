import type { SettingsAppProps } from "@/features/settings/types";

type DialogLike = {
  element: HTMLElement;
  destroy: () => void;
};

type DialogOptions = {
  title: string;
  width: string;
  height: string;
  content: string;
  destroyCallback: () => void;
};

export class SettingsDialogController {
  private dialog: DialogLike | null = null;
  private unmountSettingsApp: (() => void) | null = null;

  constructor(private readonly options: {
    createDialog: (options: DialogOptions) => DialogLike;
    mountSettingsApp: (target: HTMLElement, props: SettingsAppProps) => () => void;
  }) {}

  open(props: SettingsAppProps): void {
    this.destroy();

    this.dialog = this.options.createDialog({
      title: "随心按设置",
      width: "1280px",
      height: "80vh",
      content: `<div class="siyuan-power-buttons-settings-host"></div>`,
      destroyCallback: () => {
        this.unmountSettingsApp?.();
        this.unmountSettingsApp = null;
        this.dialog = null;
      },
    });

    const host = this.dialog.element.querySelector<HTMLElement>(".siyuan-power-buttons-settings-host");
    if (!host) {
      return;
    }

    this.unmountSettingsApp = this.options.mountSettingsApp(host, props);
  }

  refresh(props: SettingsAppProps): void {
    if (!this.dialog) {
      return;
    }
    this.open(props);
  }

  destroy(): void {
    this.unmountSettingsApp?.();
    this.unmountSettingsApp = null;
    this.dialog?.destroy();
    this.dialog = null;
  }
}
