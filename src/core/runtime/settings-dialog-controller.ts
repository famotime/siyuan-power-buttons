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

type SettingsAppHandle = (() => void) & {
  getSelectedButtonId?: () => string;
};

export class SettingsDialogController {
  private dialog: DialogLike | null = null;
  private unmountSettingsApp: SettingsAppHandle | null = null;
  private currentProps: SettingsAppProps | null = null;

  constructor(private readonly options: {
    createDialog: (options: DialogOptions) => DialogLike;
    mountSettingsApp: (target: HTMLElement, props: SettingsAppProps) => SettingsAppHandle;
  }) {}

  open(props: SettingsAppProps): void {
    this.destroy();
    this.currentProps = props;

    this.dialog = this.options.createDialog({
      title: "随心按设置",
      width: "1280px",
      height: "80vh",
      content: `<div class="siyuan-power-buttons-settings-host"></div>`,
      destroyCallback: () => {
        this.flushSelectedButtonId();
        this.unmountSettingsApp?.();
        this.unmountSettingsApp = null;
        this.dialog = null;
        this.currentProps = null;
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
    this.flushSelectedButtonId();
    this.unmountSettingsApp?.();
    this.unmountSettingsApp = null;
    this.dialog?.destroy();
    this.dialog = null;
    this.currentProps = null;
  }

  private flushSelectedButtonId(): void {
    const itemId = this.unmountSettingsApp?.getSelectedButtonId?.();
    if (!itemId || !this.currentProps?.onSelectedIdChange) {
      return;
    }

    void Promise.resolve(this.currentProps.onSelectedIdChange(itemId)).catch(() => undefined);
  }
}
